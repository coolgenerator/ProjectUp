import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DndContext, DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import config from "../../config";
import fetchWithAuth from "../../hooks/fetchWithAuth";
import { openChatWith } from "../../utils/chat/openChat";
import withAuth from "../../hooks/withAuth";
import { updateApplicationStatus } from "../../services/applicationServices";
import { RoleCard } from "../../components/match/RoleCards";
import { Reliability, ReliabilityLine } from "../../components/match/Reliability";
import { Inbox } from "lucide-react";
import { Alert, Badge, Button, Dialog, EmptyState, Input, Label, PageHeader, Select, Skeleton, TextArea } from "../../components/ui";

const { AWS_BASE_URL } = config;

type Stage = "new" | "talking" | "trial";
type Column = Stage | "accepted" | "declined";

const COLUMNS: Column[] = ["new", "talking", "trial", "accepted", "declined"];

const COLUMN_STYLES: Record<Column, string> = {
    new: "border-t-blue-400",
    talking: "border-t-indigo-400",
    trial: "border-t-amber-400",
    accepted: "border-t-emerald-500",
    declined: "border-t-gray-300",
};

interface BoardPost {
    post_id: number;
    sid: string;
    project_sid: string;
    title: string;
    roles: RoleCard[] | null;
    role_fills: Record<string, number>;
}

interface BoardApplication {
    application_id: number;
    post_sid: string;
    role: string;
    hours_per_week: number;
    first_step: string;
    motivation: string;
    status: number;
    stage: Stage;
    trial_task: string;
    trial_due: string | null;
    ai_summary: AISummary | null;
    applied_at: string;
    applicant: {
        user_id: number;
        sid: string;
        name: string;
        avatar_url: string;
        field: string;
        school: string;
        skills: string[] | null;
        hours_per_week: number;
        website: string;
        resume_url: string;
        reliability?: Reliability;
    };
    answers: { question: string; answer: string }[] | null;
}

interface AISummary {
    summary: string;
    fit: string;
    risk: string;
}

// Pending cards without a summary are summarized one at a time, at most this many per visit
const MAX_AUTO_SUMMARIES = 6;

const columnOf = (app: BoardApplication): Column =>
    app.status === 1 ? "accepted" : app.status === 2 ? "declined" : app.stage;

const avatarSrc = (url: string) => (!url ? "/default-avatar.jpg" : url.startsWith("http") ? url : `${AWS_BASE_URL}${url}`);

const ApplicationBoard: React.FC = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [posts, setPosts] = useState<BoardPost[]>([]);
    const [applications, setApplications] = useState<BoardApplication[]>([]);
    const [postFilter, setPostFilter] = useState<string>("all");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [trialFor, setTrialFor] = useState<BoardApplication | null>(null);
    const [summaries, setSummaries] = useState<Record<number, AISummary | "loading" | "failed">>({});
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

    const load = useCallback(async () => {
        setError(null);
        try {
            const response = await fetchWithAuth("/api/match/applications");
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || t("match.board.loadFailed"));
            setPosts(data.posts || []);
            setApplications(data.applications || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        load();
    }, [load]);

    const postsBySid = useMemo(() => Object.fromEntries(posts.map((p) => [p.sid, p])), [posts]);
    const visible = applications.filter((a) => postFilter === "all" || a.post_sid === postFilter);
    const pendingCount = visible.filter((a) => a.status === 0).length;

    const lang = i18n.language.startsWith("zh") ? "zh" : "en";

    const summarize = useCallback(async (app: BoardApplication, refresh = false) => {
        setSummaries((s) => ({ ...s, [app.application_id]: "loading" }));
        try {
            const response = await fetchWithAuth(`/api/match/applications/${app.application_id}/summary?lang=${lang}${refresh ? "&refresh=1" : ""}`, { method: "POST" });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            setSummaries((s) => ({ ...s, [app.application_id]: data.ai_summary }));
        } catch {
            setSummaries((s) => ({ ...s, [app.application_id]: "failed" }));
        }
    }, [lang]);

    // Summarize pending applications the founder hasn't seen summarized yet, one at a time
    useEffect(() => {
        const queue = applications
            .filter((a) => a.status === 0 && !a.ai_summary && summaries[a.application_id] === undefined)
            .slice(0, MAX_AUTO_SUMMARIES);
        if (queue.length === 0) return;
        let cancelled = false;
        (async () => {
            for (const app of queue) {
                if (cancelled) return;
                await summarize(app);
            }
        })();
        return () => { cancelled = true; };
        // Re-run only when the set of applications changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [applications]);

    const setStage = async (app: BoardApplication, stage: Stage, trial?: { task: string; due: string }) => {
        const response = await fetchWithAuth(`/api/match/applications/${app.application_id}/stage`, {
            method: "PUT",
            body: JSON.stringify({ stage, trial_task: trial?.task, trial_due: trial?.due }),
        });
        if (!response.ok) {
            const data = await response.json().catch(() => null);
            throw new Error(data?.error || t("match.board.updateFailed"));
        }
    };

    const move = async (app: BoardApplication, to: Column, trial?: { task: string; due: string }) => {
        const from = columnOf(app);
        if (from === to || from === "accepted") return;
        // A trial needs a task, so ask for it before moving
        if (to === "trial" && !trial) {
            setTrialFor(app);
            return;
        }
        const name = app.applicant.name || t("match.board.unknownApplicant");
        if (to === "accepted" && !window.confirm(t("match.board.confirmAccept", { name, role: app.role || t("match.applications.unspecified") }))) return;
        if (to === "declined" && !window.confirm(t("match.board.confirmDecline", { name }))) return;

        setBusyId(app.application_id);
        setError(null);
        try {
            if (to === "accepted") {
                await updateApplicationStatus(app.application_id, "accept");
            } else if (to === "declined") {
                await updateApplicationStatus(app.application_id, "decline");
            } else {
                if (from === "declined") await updateApplicationStatus(app.application_id, "reconsider");
                await setStage(app, to, trial);
            }
            // Accepting changes role fills, so reload rather than patching locally
            await load();
        } catch (err: any) {
            setError(err.message || t("match.board.updateFailed"));
        } finally {
            setBusyId(null);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const app = applications.find((a) => a.application_id === event.active.id);
        if (app && event.over) move(app, event.over.id as Column);
    };

    const dateFormat = new Intl.DateTimeFormat(i18n.language, { month: "short", day: "numeric" });
    const filteredPosts = postFilter === "all" ? posts : posts.filter((p) => p.sid === postFilter);

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-8 sm:py-10">
            <div className="mx-auto max-w-7xl">
                <PageHeader
                    title={t("match.board.title")}
                    subtitle={t("match.board.subtitle")}
                    actions={
                        posts.length > 0 && (
                            <>
                                <Badge tone="indigo">{t("match.board.pendingCount", { n: pendingCount })}</Badge>
                                <Select value={postFilter} onChange={(e) => setPostFilter(e.target.value)} className="mt-0 w-auto max-w-xs">
                                    <option value="all">{t("match.board.allProjects")}</option>
                                    {posts.map((p) => <option key={p.sid} value={p.sid}>{p.title}</option>)}
                                </Select>
                            </>
                        )
                    }
                />

                {error && <Alert className="mb-4">{error}</Alert>}

                {loading ? (
                    <div className="flex gap-4 overflow-hidden">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-80 w-72 shrink-0" />)}</div>
                ) : posts.length === 0 ? (
                    <EmptyState
                        icon={<Inbox className="h-5 w-5" />}
                        title={t("match.board.noPosts")}
                        action={<Button onClick={() => navigate("/ideas")}>{t("match.board.toWorkbench")}</Button>}
                    />
                ) : (
                    <>
                        <RoleFillSummary posts={filteredPosts} />
                        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                            <div className="flex gap-4 overflow-x-auto pb-4">
                                {COLUMNS.map((column) => {
                                    const cards = visible.filter((a) => columnOf(a) === column);
                                    return (
                                        <BoardColumn key={column} column={column} count={cards.length}>
                                            {cards.length === 0 ? (
                                                <p className="py-6 text-center text-sm text-gray-400">{t("match.board.emptyColumn")}</p>
                                            ) : (
                                                cards.map((app) => (
                                                    <ApplicationCard
                                                        key={app.application_id}
                                                        app={app}
                                                        postTitle={postFilter === "all" ? postsBySid[app.post_sid]?.title : undefined}
                                                        appliedOn={dateFormat.format(new Date(app.applied_at))}
                                                        busy={busyId === app.application_id}
                                                        summary={summaries[app.application_id] ?? app.ai_summary}
                                                        onSummarize={() => summarize(app, true)}
                                                        onMove={(to) => move(app, to)}
                                                    />
                                                ))
                                            )}
                                        </BoardColumn>
                                    );
                                })}
                            </div>
                        </DndContext>
                    </>
                )}
                {trialFor && (
                    <TrialDialog
                        app={trialFor}
                        suggestion={postsBySid[trialFor.post_sid]?.roles?.find((r) => r.title === trialFor.role)?.first_week || ""}
                        onCancel={() => setTrialFor(null)}
                        onSend={(task, due) => {
                            const app = trialFor;
                            setTrialFor(null);
                            move(app, "trial", { task, due });
                        }}
                    />
                )}
            </div>
        </div>
    );
};

// RoleFillSummary shows how many seats each role has filled, so the founder sees what's still missing.
const RoleFillSummary: React.FC<{ posts: BoardPost[] }> = ({ posts }) => {
    const { t } = useTranslation();
    const rows = posts.filter((p) => p.roles && p.roles.length > 0);
    if (rows.length === 0) return null;
    return (
        <div className="mb-4 space-y-2">
            {rows.map((p) => (
                <div key={p.sid} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium text-gray-800">{p.title}</span>
                    {p.roles!.map((r) => {
                        const total = Math.max(r.spots || 1, 1);
                        const filled = p.role_fills[r.title] || 0;
                        return (
                            <span
                                key={r.title}
                                className={`rounded-full px-2.5 py-0.5 text-xs ${filled >= total ? "bg-emerald-50 text-emerald-700" : "bg-white text-gray-600 ring-1 ring-gray-200"}`}
                            >
                                {t("match.board.roleFill", { role: r.title, filled, total })}
                            </span>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};

const BoardColumn: React.FC<{ column: Column; count: number; children: React.ReactNode }> = ({ column, count, children }) => {
    const { t } = useTranslation();
    const { isOver, setNodeRef } = useDroppable({ id: column });
    return (
        <section
            ref={setNodeRef}
            className={`flex w-72 shrink-0 flex-col rounded-xl border border-t-4 border-gray-200 ${COLUMN_STYLES[column]} ${isOver ? "bg-indigo-50" : "bg-gray-100"}`}
        >
            <h2 className="flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-gray-700">
                {t(`match.board.columns.${column}`)}
                <span className="rounded-full bg-white px-2 text-xs font-medium text-gray-500">{count}</span>
            </h2>
            <div className="flex flex-1 flex-col gap-3 px-3 pb-3">{children}</div>
        </section>
    );
};

const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

interface TrialDialogProps {
    app: BoardApplication;
    suggestion: string;
    onCancel: () => void;
    onSend: (task: string, due: string) => void;
}

// TrialDialog asks for the trial task, prefilled with the role's first-week task.
const TrialDialog: React.FC<TrialDialogProps> = ({ app, suggestion, onCancel, onSend }) => {
    const { t } = useTranslation();
    const [task, setTask] = useState(suggestion || app.first_step);
    const [due, setDue] = useState(() => isoDate(new Date(Date.now() + 7 * 24 * 3600 * 1000)));
    return (
        <Dialog
            open
            onClose={onCancel}
            title={t("match.board.trialTitle", { name: app.applicant.name || t("match.board.unknownApplicant") })}
            description={t("match.board.trialHint")}
            footer={
                <>
                    <Button variant="secondary" onClick={onCancel}>{t("match.board.cancel")}</Button>
                    <Button onClick={() => onSend(task.trim(), due)} disabled={!task.trim()}>{t("match.board.trialSend")}</Button>
                </>
            }
        >
            <div className="space-y-3">
                <Label label={t("match.board.trialTask")}>
                    <TextArea value={task} onChange={(e) => setTask(e.target.value)} className="min-h-[100px]" autoFocus />
                </Label>
                <Label label={t("match.board.trialDue")}>
                    <Input type="date" value={due} min={isoDate(new Date())} onChange={(e) => setDue(e.target.value)} className="w-auto" />
                </Label>
            </div>
        </Dialog>
    );
};

// Buttons on each card, so every move also works without dragging.
const NEXT_MOVES: Record<Column, { to: Column; label: string; primary?: boolean }[]> = {
    new: [{ to: "talking", label: "talking", primary: true }, { to: "declined", label: "decline" }],
    talking: [{ to: "trial", label: "trial", primary: true }, { to: "accepted", label: "accept" }, { to: "declined", label: "decline" }],
    trial: [{ to: "accepted", label: "accept", primary: true }, { to: "declined", label: "decline" }],
    accepted: [],
    declined: [{ to: "new", label: "reconsider" }],
};

interface ApplicationCardProps {
    app: BoardApplication;
    postTitle?: string;
    appliedOn: string;
    busy: boolean;
    summary?: AISummary | "loading" | "failed" | null;
    onSummarize: () => void;
    onMove: (to: Column) => void;
}

const ApplicationCard: React.FC<ApplicationCardProps> = ({ app, postTitle, appliedOn, busy, summary, onSummarize, onMove }) => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [expanded, setExpanded] = useState(false);
    const column = columnOf(app);
    const locked = column === "accepted";
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: app.application_id, disabled: locked || busy });
    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
    const { applicant } = app;
    const openChat = (sid: string) =>
        openChatWith(navigate, sid, t("match.chat.toApplicant", { project: postTitle, role: app.role || t("match.applications.noRole") }));
    // Flag only over-commitment: promising more hours than their profile says they have
    const overCommitted = applicant.hours_per_week > 0 && app.hours_per_week > applicant.hours_per_week;

    return (
        <article
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`rounded-lg border border-gray-200 bg-white p-3 shadow-sm ${locked ? "" : "cursor-grab"} ${isDragging ? "z-10 opacity-80 shadow-lg" : ""} ${busy ? "opacity-50" : ""}`}
        >
            <div className="flex items-start gap-2.5">
                <img
                    src={avatarSrc(applicant.avatar_url)}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                    onError={(e) => { e.currentTarget.src = "/default-avatar.jpg"; }}
                />
                <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{applicant.name || t("match.board.unknownApplicant")}</p>
                    <p className="truncate text-xs text-gray-500">{[applicant.field, applicant.school].filter(Boolean).join(" · ")}</p>
                    <ReliabilityLine reliability={applicant.reliability} className="mt-0.5" />
                </div>
            </div>

            {postTitle && <p className="mt-2 truncate text-xs text-gray-400">{postTitle}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="rounded bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">{app.role || t("match.applications.noRole")}</span>
                <span className="text-gray-600">{t("match.board.hoursCommitted", { n: app.hours_per_week })}</span>
                {overCommitted && <span className="text-amber-700">({t("match.board.profileHours", { n: applicant.hours_per_week })})</span>}
            </div>

            {column === "trial" && app.trial_task && (
                <div className="mt-2 rounded-md bg-amber-50 p-2 text-sm">
                    <p className="text-xs font-medium text-amber-800">
                        {t("match.board.trialLabel")}
                        {app.trial_due && <span className="font-normal"> · {t("match.board.dueOn", { date: new Date(app.trial_due).toLocaleDateString(i18n.language) })}</span>}
                    </p>
                    <p className="mt-0.5 text-gray-800">{app.trial_task}</p>
                </div>
            )}

            {app.status === 0 && (
                <div className="mt-2 rounded-md border border-indigo-100 bg-indigo-50/60 p-2 text-sm" onPointerDown={(e) => e.stopPropagation()}>
                    <p className="text-xs font-medium text-indigo-700">{t("match.board.aiTitle")}</p>
                    {summary === "loading" ? (
                        <p className="mt-0.5 text-xs text-gray-500">{t("match.board.aiLoading")}</p>
                    ) : summary && summary !== "failed" ? (
                        <div className="mt-0.5 space-y-0.5 text-gray-800">
                            <p>{summary.summary}</p>
                            <p className="text-xs"><span className="font-medium text-emerald-700">{t("match.board.aiFit")}</span>{summary.fit}</p>
                            <p className="text-xs"><span className="font-medium text-amber-700">{t("match.board.aiRisk")}</span>{summary.risk}</p>
                        </div>
                    ) : (
                        <button onClick={onSummarize} className="mt-0.5 text-xs text-indigo-700 hover:underline">{t("match.board.aiRetry")}</button>
                    )}
                </div>
            )}

            <div className="mt-2 rounded-md bg-gray-50 p-2 text-sm">
                <p className="text-xs font-medium text-gray-500">{t("match.board.firstStep")}</p>
                <p className={`mt-0.5 text-gray-800 ${expanded ? "" : "line-clamp-3"}`}>
                    {app.first_step || <span className="text-gray-400">{t("match.board.noFirstStep")}</span>}
                </p>
            </div>

            {expanded && (
                <div className="mt-2 space-y-2 text-sm">
                    {applicant.skills && applicant.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {applicant.skills.map((s) => (
                                <span key={s} className="rounded bg-white px-1.5 py-0.5 text-xs text-gray-600 ring-1 ring-gray-200">{s}</span>
                            ))}
                        </div>
                    )}
                    {(applicant.website || applicant.resume_url) && (
                        <div className="flex gap-3 text-xs">
                            <span className="font-medium text-gray-500">{t("match.board.links")}</span>
                            {applicant.website && <a href={applicant.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{t("match.board.website")}</a>}
                            {applicant.resume_url && <a href={applicant.resume_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{t("match.board.resume")}</a>}
                        </div>
                    )}
                    {app.motivation && (
                        <div>
                            <p className="text-xs font-medium text-gray-500">{t("match.board.motivation")}</p>
                            <p className="text-gray-700">{app.motivation}</p>
                        </div>
                    )}
                    {app.answers && app.answers.length > 0 && (
                        <div>
                            <p className="text-xs font-medium text-gray-500">{t("match.board.answers")}</p>
                            {app.answers.map((a) => (
                                <p key={a.question} className="text-gray-700"><span className="text-gray-500">{a.question} </span>{a.answer}</p>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Stop pointer events here so clicking a button doesn't start a drag */}
            <div className="mt-3 space-y-2" onPointerDown={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{t("match.board.applied", { date: appliedOn })}</span>
                    <button onClick={() => setExpanded((v) => !v)} className="text-indigo-600 hover:underline">
                        {expanded ? t("match.board.showLess") : t("match.board.showMore")}
                    </button>
                </div>
                {locked ? (
                    <p className="text-xs text-gray-500">{t("match.board.acceptedLocked")}</p>
                ) : (
                    <div className="flex flex-wrap gap-1.5">
                        {NEXT_MOVES[column].map((m) => (
                            <button
                                key={m.to}
                                disabled={busy}
                                onClick={() => onMove(m.to)}
                                className={`rounded-md px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${m.primary ? "bg-indigo-600 text-white hover:bg-indigo-700" : "border border-gray-300 text-gray-700 hover:bg-gray-50"}`}
                            >
                                {t(`match.board.move.${m.label}`)}
                            </button>
                        ))}
                    </div>
                )}
                <div className="flex gap-3 text-xs">
                    {applicant.sid && (
                        <button onClick={() => navigate(`/profile/${applicant.sid}`)} className="text-gray-600 hover:text-gray-900 hover:underline">
                            {t("match.board.profile")}
                        </button>
                    )}
                    {applicant.sid && (
                        <button onClick={() => openChat(applicant.sid)} className="text-gray-600 hover:text-gray-900 hover:underline">
                            {t("match.board.message")}
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
};

export default withAuth(ApplicationBoard);
