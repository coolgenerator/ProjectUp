import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Copy, Eye, GitBranch, Lightbulb, Pencil, Plus, RefreshCw, Rocket, Trash2, Users } from "lucide-react";
import i18n from "../../i18n/i18n";
import fetchWithAuth from "../../hooks/fetchWithAuth";
import withAuth from "../../hooks/withAuth";
import { Alert, Badge, Button, Card, Dialog, FadeIn, Input, Label, PAGE_WIDTH, PageHeader, ProgressBar, Tag, TextArea, cx } from "../../components/ui";
import { ProfileNudge } from "../../components/match/MatchProfile";
import { DraftProject, DraftState, IdeaDraft, MIN_IDEA_LENGTH, useIdeaDrafts } from "./useIdeaDrafts";
import MatchReveal from "./MatchReveal";

interface IdeaQuestion {
    lens: string;
    question: string;
    hint: string;
}

interface IdeaRound {
    questions: IdeaQuestion[];
    answers: string[];
}

interface RoleCard {
    title: string;
    description: string;
    skills: string[];
    hours_per_week: number;
    spots: number;
    first_week?: string;
}

interface IdeaBrief {
    title: string;
    one_liner: string;
    vision: string;
    problem: string;
    target_users: string;
    blockers: string[];
    next_steps: string[];
    topics: string[];
    roles: RoleCard[];
    agent_prompt: string;
}

type TextField = "vision" | "problem" | "target_users";
type ListField = "blockers" | "next_steps";

// Answers shorter than this are treated as skipped; the point is to make the
// user think, not to click through.
const MIN_ANSWER_LENGTH = 4;
// The coach picks from six lenses; covering more of them before shaping gives a sturdier brief.
const LENS_COUNT = 6;
// The coach always names lenses with these Chinese labels (see ideaCoachPrompt
// in the backend); map them to translation keys for display.
const LENS_KEYS: Record<string, string> = {
    "本质/第一性原理": "firstPrinciples",
    "目标用户与场景": "usersAndScenarios",
    "为什么是现在": "whyNow",
    "最小验证": "minimumValidation",
    "关键假设与风险": "assumptionsAndRisks",
    "需要什么样的伙伴": "partnersNeeded",
};

async function postJSON<T>(url: string, body: unknown): Promise<T> {
    const response = await fetchWithAuth(url, { method: "POST", body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || i18n.t("match.ideas.requestFailed"));
    return data as T;
}

const IdeaWorkbench: React.FC = () => {
    const { t, i18n: { language } } = useTranslation();
    const navigate = useNavigate();
    const [idea, setIdea] = useState("");
    const [rounds, setRounds] = useState<IdeaRound[]>([]);
    const [current, setCurrent] = useState<IdeaQuestion[] | null>(null);
    const [answers, setAnswers] = useState<string[]>([]);
    const [reflection, setReflection] = useState("");
    const [brief, setBrief] = useState<IdeaBrief | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [postSid, setPostSid] = useState<string | null>(null);
    const [project, setProject] = useState<DraftProject | null>(null);
    // Writing a brief for an existing project (P4): its sid and name
    const [target, setTarget] = useState<{ sid: string; name: string } | null>(null);
    const [addedRoles, setAddedRoles] = useState<string[]>([]);
    const [searchParams] = useSearchParams();
    const [previewing, setPreviewing] = useState(false);
    // After publishing, the workbench shows who could fill each role
    const [revealing, setRevealing] = useState(false);

    const draftState: DraftState = {
        idea,
        rounds,
        current: current ? { questions: current, answers, reflection } : null,
        brief,
        post_sid: postSid,
        project,
        target_project_sid: target?.sid || null,
    };
    const applyDraft = useCallback((d: DraftState) => {
        setIdea(d.idea);
        setRounds(d.rounds as IdeaRound[]);
        setCurrent((d.current?.questions as IdeaQuestion[]) || null);
        setAnswers(d.current?.answers || []);
        setReflection(d.current?.reflection || "");
        setBrief(d.brief as IdeaBrief | null);
        setPostSid(d.post_sid);
        setProject(d.project || null);
        setTarget(d.target_project_sid ? { sid: d.target_project_sid, name: "" } : null);
        setAddedRoles([]);
        setRevealing(false);
        setError(null);
    }, []);
    const drafts = useIdeaDrafts(draftState, applyDraft);

    // ?project=<sid> starts a draft that writes the brief of an existing project
    useEffect(() => {
        const sid = searchParams.get("project");
        if (!sid || searchParams.get("draft")) return;
        fetchWithAuth(`/api/project/${sid}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((p) => {
                if (!p) return;
                drafts.startNew();
                const name = p.name || "";
                applyDraft({ idea: [name, p.description].filter(Boolean).join("：\n"), rounds: [], current: null, brief: null, post_sid: null, project: null, target_project_sid: sid });
                setTarget({ sid, name });
            });
        // Runs once on arrival
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // A restored project-mode draft only has the sid; load the project's name for display
    const targetSid = target?.sid;
    const targetNamed = !!target?.name;
    useEffect(() => {
        if (!targetSid || targetNamed) return;
        fetchWithAuth(`/api/project/${targetSid}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((p) => p && setTarget({ sid: targetSid, name: p.name || "" }));
    }, [targetSid, targetNamed]);

    const startNewIdea = () => {
        drafts.startNew();
        applyDraft({ idea: "", rounds: [], current: null, brief: null, post_sid: null, project: null });
    };

    // branchIdea starts a new draft from this idea's text, e.g. to pivot after it became a project
    const branchIdea = () => {
        const text = idea;
        drafts.startNew();
        applyDraft({ idea: text, rounds: [], current: null, brief: null, post_sid: null, project: null, target_project_sid: null });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const deleteDraft = async (draft: IdeaDraft) => {
        if (!window.confirm(t("match.ideas.confirmDelete"))) return;
        if (await drafts.remove(draft.id)) {
            applyDraft({ idea: "", rounds: [], current: null, brief: null, post_sid: null, project: null });
        }
    };

    const isBlank = !idea.trim() && rounds.length === 0 && current === null && brief === null;
    const examples = t("match.ideas.examples", { returnObjects: true }) as string[];
    const answersComplete = current !== null && answers.every((a) => a.trim().length >= MIN_ANSWER_LENGTH);
    const lensesCovered = new Set(rounds.flatMap((r) => r.questions.map((q) => q.lens))).size;

    const run = async (label: string, fn: () => Promise<void>) => {
        setBusy(label);
        setError(null);
        try {
            await fn();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setBusy(null);
        }
    };

    const askQuestions = (history: IdeaRound[]) =>
        run("questions", async () => {
            const data = await postJSON<{ reflection: string; questions: IdeaQuestion[] }>("/api/ideas/questions", { idea, rounds: history });
            setRounds(history);
            setReflection(data.reflection);
            setCurrent(data.questions);
            setAnswers(data.questions.map(() => ""));
        });

    const currentRound = (): IdeaRound[] =>
        current && answersComplete ? [...rounds, { questions: current, answers }] : rounds;

    const shape = () =>
        run("shape", async () => {
            const history = currentRound();
            const data = await postJSON<IdeaBrief>("/api/ideas/shape", { idea, rounds: history });
            setRounds(history);
            setCurrent(null);
            setBrief(data);
        });

    const regenerate = (field: keyof IdeaBrief) =>
        run(`regen:${field}`, async () => {
            if (!brief) return;
            const data = await postJSON<{ value: unknown }>("/api/ideas/regenerate", { idea, rounds, brief, field });
            setBrief((b) => (b ? { ...b, [field]: data.value } : b));
        });

    const updateBrief = (patch: Partial<IdeaBrief>) => setBrief((b) => (b ? { ...b, ...patch } : b));

    const publish = () =>
        run("publish", async () => {
            // lang tells the server which language to start writing match reasons in
            const lang = language.startsWith("zh") ? "zh" : "en";
            // The server links the draft to the new project, so saving it first gives it an id
            const draftId = await drafts.ensureSaved(draftState);
            const data = await postJSON<{ post_sid: string; draft?: IdeaDraft }>(`/api/ideas/materialize?lang=${lang}`, { draft_id: draftId, brief });
            setPostSid(data.post_sid);
            if (data.draft) {
                setProject(data.draft.project || null);
                drafts.published(data.draft);
            }
            setRevealing(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
        });

    // saveToProject writes the brief into the target project instead of creating one
    const saveToProject = () =>
        run("publish", async () => {
            if (!target || !brief) return;
            const draftId = await drafts.ensureSaved(draftState);
            const data = await postJSON<{ draft: IdeaDraft }>("/api/ideas/attach", { draft_id: draftId, project_sid: target.sid, brief });
            setPostSid(data.draft.post_sid);
            setProject(data.draft.project || null);
            drafts.published(data.draft);
            window.scrollTo({ top: 0, behavior: "smooth" });
        });

    // addRole puts a suggested role on the project's recruiting post
    const addRole = (role: RoleCard) =>
        run(`role:${role.title}`, async () => {
            const sid = project?.sid || target?.sid;
            if (!sid) return;
            await postJSON(`/api/match/projects/${sid}/roles`, role);
            setAddedRoles((list) => [...list, role.title]);
        });

    const copyPrompt = async () => {
        if (!brief) return;
        await navigator.clipboard.writeText(brief.agent_prompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    // Editing is locked once published: from then on the project owns the brief
    const locked = postSid !== null || project !== null;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className={cx(PAGE_WIDTH, "grid grid-cols-1 gap-8 py-8 sm:py-10 lg:grid-cols-[15rem_minmax(0,1fr)]")}>
                <DraftList
                    drafts={drafts.drafts}
                    activeId={drafts.activeId}
                    disabled={busy !== null}
                    onOpen={drafts.open}
                    onNew={startNewIdea}
                    onDelete={deleteDraft}
                />
                <main className="min-w-0">
                    <PageHeader
                        title={
                            <span className="flex items-center gap-3">
                                {t("match.ideas.title")}
                                <SaveIndicator state={drafts.saveState} />
                            </span>
                        }
                        subtitle={t("match.ideas.subtitle")}
                    />

                    {!revealing && <ProfileNudge className="mb-6" />}

                    {error && <Alert className="mb-6">{error}</Alert>}

                    {revealing && postSid && brief ? (
                        <>
                            <MatchReveal postSid={postSid} title={brief.title} roleCount={brief.roles.length} />
                            <Button variant="ghost" className="mt-4" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => setRevealing(false)}>
                                {t("match.reveal.backToIdea")}
                            </Button>
                        </>
                    ) : (
                    <>
                    {/* Writing the brief of an existing project */}
                    {target && !locked && (
                        <Card className="mb-6 border-indigo-200 bg-indigo-50/60">
                            <p className="text-sm font-medium text-indigo-700">{t("match.ideas.forProject", { title: target.name })}</p>
                            <p className="mt-1 text-sm text-gray-600">{t("match.ideas.forProjectHint")}</p>
                        </Card>
                    )}

                    {/* A published idea points to its project, where the brief now lives */}
                    {locked && (
                        <Card className="mb-6 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
                            <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                                <Check className="h-4 w-4" aria-hidden /> {target ? t("match.ideas.savedToProject") : t("match.ideas.becameProject")}
                            </p>
                            <h2 className="mt-1 text-lg font-semibold text-gray-900">{project?.title || brief?.title}</h2>
                            <p className="mt-1 text-sm text-gray-600">{t("match.ideas.becameProjectHint")}</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {project && (
                                    <Button onClick={() => navigate(`/project/${project.sid}/dashboard?section=overview`)} icon={<ArrowRight className="h-4 w-4" />}>
                                        {t("match.ideas.openProject")}
                                    </Button>
                                )}
                                {postSid && (
                                    <>
                                        <Button variant="secondary" onClick={() => setRevealing(true)} icon={<Users className="h-4 w-4" />}>
                                            {t("match.reveal.open")}
                                        </Button>
                                        <Button variant="secondary" onClick={() => navigate(`/projectpost/${postSid}`)} icon={<Eye className="h-4 w-4" />}>
                                            {t("match.ideas.viewPost")}
                                        </Button>
                                    </>
                                )}
                                <Button variant="ghost" onClick={branchIdea} disabled={busy !== null} icon={<GitBranch className="h-4 w-4" />}>
                                    {t("match.ideas.branch")}
                                </Button>
                            </div>
                            {/* Roles the workbench suggested for an existing project; the founder picks which to recruit */}
                            {target && brief && brief.roles.length > 0 && (
                                <div className="mt-5 border-t border-emerald-100 pt-4">
                                    <p className="text-sm font-medium text-gray-900">{t("match.ideas.suggestedRoles")}</p>
                                    <p className="mt-0.5 text-xs text-gray-500">{t("match.ideas.suggestedRolesHint")}</p>
                                    <ul className="mt-3 space-y-2">
                                        {brief.roles.map((role) => {
                                            const added = addedRoles.includes(role.title);
                                            return (
                                                <li key={role.title} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 ring-1 ring-gray-200">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium text-gray-900">{role.title}</p>
                                                        <p className="truncate text-xs text-gray-500">{role.description}</p>
                                                    </div>
                                                    <Button
                                                        variant={added ? "ghost" : "secondary"}
                                                        size="sm"
                                                        disabled={added || busy !== null}
                                                        loading={busy === `role:${role.title}`}
                                                        icon={added ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                                                        onClick={() => addRole(role)}
                                                    >
                                                        {added ? t("match.ideas.roleAdded") : t("match.ideas.addRoleToPost")}
                                                    </Button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}
                        </Card>
                    )}

                    {/* Step 1: the idea */}
                    <Card>
                        <Label label={t("match.ideas.ideaLabel")}>
                            <TextArea
                                className="min-h-[110px]"
                                placeholder={t("match.ideas.ideaPlaceholder")}
                                value={idea}
                                disabled={rounds.length > 0 || current !== null || brief !== null}
                                onChange={(e) => setIdea(e.target.value)}
                            />
                        </Label>
                        {isBlank && examples.length > 0 && (
                            <div className="mt-4">
                                <p className="flex items-center gap-1.5 text-sm text-gray-500">
                                    <Lightbulb className="h-4 w-4 text-amber-500" aria-hidden />
                                    {t("match.ideas.examplesTitle")}
                                </p>
                                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    {examples.map((example, i) => (
                                        <FadeIn key={example} delay={i * 0.04}>
                                            <button
                                                onClick={() => setIdea(example)}
                                                className="h-full w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-left text-sm text-gray-700 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50"
                                            >
                                                {example}
                                            </button>
                                        </FadeIn>
                                    ))}
                                </div>
                            </div>
                        )}
                        {rounds.length === 0 && current === null && brief === null && (
                            <Button size="lg" className="mt-4" onClick={() => askQuestions([])} disabled={idea.trim().length < MIN_IDEA_LENGTH} loading={busy === "questions"}>
                                {busy === "questions" ? t("match.ideas.starting") : t("match.ideas.start")}
                            </Button>
                        )}
                    </Card>

                    {/* Thinking progress */}
                    {(rounds.length > 0 || current) && !brief && (
                        <FadeIn className="mt-4 px-1">
                            <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="font-medium text-gray-700">{t("match.ideas.progress", { n: Math.min(lensesCovered, LENS_COUNT) })}</span>
                                {lensesCovered < 4 && <span className="text-right text-xs text-gray-500">{t("match.ideas.progressHint")}</span>}
                            </div>
                            <ProgressBar value={Math.min(lensesCovered, LENS_COUNT)} max={LENS_COUNT} className="mt-2" />
                        </FadeIn>
                    )}

                    {/* Answered rounds */}
                    {rounds.map((round, i) => (
                        <details key={i} className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
                            <summary className="cursor-pointer text-sm font-medium text-gray-700">{t("match.ideas.roundDone", { n: i + 1 })}</summary>
                            <div className="mt-3 space-y-3">
                                {round.questions.map((q, j) => (
                                    <div key={j} className="text-sm">
                                        <p className="text-gray-500">{q.question}</p>
                                        <p className="mt-1 text-gray-900">{round.answers[j]}</p>
                                    </div>
                                ))}
                            </div>
                        </details>
                    ))}

                    {/* Current round */}
                    <AnimatePresence>
                        {current && (
                            <motion.section
                                key={rounds.length}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="mt-4 rounded-xl border border-indigo-200 bg-white p-5 shadow-sm sm:p-6"
                            >
                                <h2 className="text-lg font-semibold text-gray-900">{t("match.ideas.roundTitle", { n: rounds.length + 1 })}</h2>
                                {reflection && <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{reflection}</p>}
                                <div className="mt-4 space-y-5">
                                    {current.map((q, i) => (
                                        <div key={i}>
                                            <Badge tone="indigo">{LENS_KEYS[q.lens] ? t(`match.ideas.lenses.${LENS_KEYS[q.lens]}`) : q.lens}</Badge>
                                            <p className="mt-1.5 font-medium text-gray-900">{q.question}</p>
                                            <TextArea
                                                className="min-h-[80px]"
                                                placeholder={q.hint}
                                                value={answers[i] || ""}
                                                onChange={(e) => setAnswers(answers.map((a, j) => (j === i ? e.target.value : a)))}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <p className="mt-3 text-xs text-gray-500">{t("match.ideas.answerRule")}</p>
                                <div className="mt-4 flex flex-wrap gap-3">
                                    <Button variant="secondary" onClick={() => askQuestions(currentRound())} disabled={!answersComplete || busy !== null} loading={busy === "questions"}>
                                        {busy === "questions" ? t("match.ideas.askingMore") : t("match.ideas.askMore")}
                                    </Button>
                                    <Button onClick={shape} disabled={!answersComplete || busy !== null} loading={busy === "shape"}>
                                        {busy === "shape" ? t("match.ideas.shaping") : t("match.ideas.shape")}
                                    </Button>
                                </div>
                            </motion.section>
                        )}
                    </AnimatePresence>

                    {/* Shaped brief, editable section by section */}
                    {brief && (
                        <FadeIn as="section" className="mt-6 rounded-xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-6">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <Badge tone="green">{locked ? t("match.ideas.publishedVersion") : t("match.ideas.draft")}</Badge>
                                {!locked && <p className="text-xs text-gray-500">{t("match.ideas.editHint")}</p>}
                            </div>

                            <EditableText
                                value={brief.title}
                                onChange={(title) => updateBrief({ title })}
                                locked={locked}
                                label={t("match.ideas.titleLabel")}
                                display={<h2 className="text-2xl font-bold text-gray-900">{brief.title}</h2>}
                                singleLine
                            />
                            <EditableText
                                value={brief.one_liner}
                                onChange={(one_liner) => updateBrief({ one_liner })}
                                locked={locked}
                                label={t("match.ideas.oneLiner")}
                                display={<p className="text-gray-600">{brief.one_liner}</p>}
                                onRegenerate={() => regenerate("one_liner")}
                                regenerating={busy === "regen:one_liner"}
                                singleLine
                            />

                            <dl className="mt-4 grid grid-cols-1 gap-x-6 text-sm md:grid-cols-2">
                                {(["vision", "problem", "target_users"] as TextField[]).map((field) => (
                                    <EditableText
                                        key={field}
                                        value={brief[field]}
                                        onChange={(value) => updateBrief({ [field]: value })}
                                        locked={locked}
                                        label={t(`match.ideas.${field === "target_users" ? "targetUsers" : field}`)}
                                        display={<dd className="text-gray-900">{brief[field]}</dd>}
                                        onRegenerate={() => regenerate(field)}
                                        regenerating={busy === `regen:${field}`}
                                    />
                                ))}
                                {(["blockers", "next_steps"] as ListField[]).map((field) => (
                                    <EditableText
                                        key={field}
                                        value={brief[field].join("\n")}
                                        onChange={(value) => updateBrief({ [field]: value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                                        locked={locked}
                                        label={t(`match.ideas.${field === "next_steps" ? "nextSteps" : field}`)}
                                        hint={t("match.ideas.listHint")}
                                        className={field === "next_steps" ? "md:col-span-2" : ""}
                                        display={
                                            field === "next_steps" ? (
                                                <ol className="list-decimal space-y-1 pl-5 text-gray-900">{brief[field].map((s) => <li key={s}>{s}</li>)}</ol>
                                            ) : (
                                                <ul className="list-disc space-y-1 pl-5 text-gray-900">{brief[field].map((s) => <li key={s}>{s}</li>)}</ul>
                                            )
                                        }
                                        onRegenerate={() => regenerate(field)}
                                        regenerating={busy === `regen:${field}`}
                                    />
                                ))}
                            </dl>

                            <div className="mt-6 flex items-center justify-between gap-3">
                                <div>
                                    <h3 className="font-semibold text-gray-900">{target ? t("match.ideas.suggestedRoles") : t("match.ideas.roles")}</h3>
                                    {target && !locked && <p className="mt-0.5 text-xs text-gray-500">{t("match.ideas.suggestedRolesNote")}</p>}
                                </div>
                                {!locked && (
                                    <Button variant="ghost" size="sm" onClick={() => regenerate("roles")} loading={busy === "regen:roles"} icon={<RefreshCw className="h-3.5 w-3.5" />}>
                                        {busy === "regen:roles" ? t("match.ideas.regenerating") : t("match.ideas.regenerate")}
                                    </Button>
                                )}
                            </div>
                            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                                {brief.roles.map((r, i) => (
                                    <RoleEditor
                                        key={i}
                                        role={r}
                                        locked={locked}
                                        onChange={(role) => updateBrief({ roles: brief.roles.map((x, j) => (j === i ? role : x)) })}
                                        onRemove={() => updateBrief({ roles: brief.roles.filter((_, j) => j !== i) })}
                                    />
                                ))}
                                {!locked && brief.roles.length < 5 && (
                                    <button
                                        onClick={() => updateBrief({ roles: [...brief.roles, { title: t("match.ideas.newRole"), description: "", skills: [], hours_per_week: 6, spots: 1, first_week: "" }] })}
                                        className="flex min-h-[120px] items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 transition hover:border-indigo-300 hover:text-indigo-700"
                                    >
                                        <Plus className="h-4 w-4" /> {t("match.ideas.addRole")}
                                    </button>
                                )}
                            </div>

                            <details className="mt-6 rounded-lg border border-gray-200 p-4">
                                <summary className="cursor-pointer text-sm font-medium text-gray-700">{t("match.ideas.advanced")}</summary>
                                <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-900 p-4 text-xs text-gray-100">{brief.agent_prompt}</pre>
                                <Button variant="ghost" size="sm" className="mt-2" onClick={copyPrompt} icon={copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}>
                                    {copied ? t("match.ideas.copied") : t("match.ideas.copy")}
                                </Button>
                            </details>

                            {!locked && target && (
                                <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-5">
                                    <Button onClick={saveToProject} disabled={busy !== null} loading={busy === "publish"} icon={<Check className="h-4 w-4" />}>
                                        {t("match.ideas.saveToProject", { title: target.name })}
                                    </Button>
                                    <p className="w-full text-xs text-gray-500">{t("match.ideas.saveToProjectNote")}</p>
                                </div>
                            )}
                            {!locked && !target && (
                                <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-5">
                                    <Button variant="secondary" onClick={() => setPreviewing(true)} icon={<Eye className="h-4 w-4" />}>
                                        {t("match.ideas.preview")}
                                    </Button>
                                    <Button variant="success" onClick={publish} disabled={busy !== null || !brief.title.trim()} loading={busy === "publish"} icon={<Rocket className="h-4 w-4" />}>
                                        {busy === "publish" ? t("match.ideas.publishing") : t("match.ideas.publish")}
                                    </Button>
                                    <p className="w-full text-xs text-gray-500">{t("match.ideas.publishNote")}</p>
                                </div>
                            )}
                        </FadeIn>
                    )}
                    </>
                    )}
                </main>
            </div>

            {brief && (
                <Dialog
                    open={previewing}
                    onClose={() => setPreviewing(false)}
                    size="lg"
                    title={t("match.ideas.previewTitle")}
                    description={t("match.ideas.previewNote")}
                    footer={
                        <>
                            <Button variant="secondary" onClick={() => setPreviewing(false)}>{t("match.ideas.backToEdit")}</Button>
                            <Button variant="success" onClick={() => { setPreviewing(false); publish(); }} icon={<Rocket className="h-4 w-4" />}>{t("match.ideas.publish")}</Button>
                        </>
                    }
                >
                    <BriefPreview brief={brief} />
                </Dialog>
            )}
        </div>
    );
};

interface EditableTextProps {
    value: string;
    onChange: (value: string) => void;
    label: string;
    display: React.ReactNode;
    locked: boolean;
    hint?: string;
    className?: string;
    singleLine?: boolean;
    onRegenerate?: () => void;
    regenerating?: boolean;
}

// EditableText shows a brief section and turns into an editor on click.
const EditableText: React.FC<EditableTextProps> = ({ value, onChange, label, display, locked, hint, className, singleLine, onRegenerate, regenerating }) => {
    const { t } = useTranslation();
    const [editing, setEditing] = useState(false);
    return (
        <div className={cx("group relative -mx-2 mt-3 rounded-lg p-2 transition", !locked && !editing && "hover:bg-gray-50", className)}>
            <div className="flex items-center justify-between gap-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
                {!locked && (
                    <div className={cx("flex gap-1 transition", !editing && "sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100")}>
                        {onRegenerate && (
                            <button
                                onClick={onRegenerate}
                                disabled={regenerating}
                                title={t("match.ideas.regenerate")}
                                aria-label={t("match.ideas.regenerate")}
                                className="rounded-md p-1 text-gray-400 hover:bg-white hover:text-indigo-600 disabled:opacity-50"
                            >
                                <RefreshCw className={cx("h-3.5 w-3.5", regenerating && "animate-spin")} />
                            </button>
                        )}
                        <button
                            onClick={() => setEditing((v) => !v)}
                            title={editing ? t("match.ideas.done") : t("match.ideas.edit")}
                            aria-label={editing ? t("match.ideas.done") : t("match.ideas.edit")}
                            className="rounded-md p-1 text-gray-400 hover:bg-white hover:text-indigo-600"
                        >
                            {editing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                        </button>
                    </div>
                )}
            </div>
            {editing ? (
                singleLine ? (
                    <Input value={value} onChange={(e) => onChange(e.target.value)} onBlur={() => setEditing(false)} autoFocus />
                ) : (
                    <>
                        <TextArea value={value} onChange={(e) => onChange(e.target.value)} autoFocus />
                        {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
                    </>
                )
            ) : (
                <div className={cx("mt-1", regenerating && "animate-pulse", !locked && "cursor-text")} onClick={() => !locked && setEditing(true)}>
                    {display}
                </div>
            )}
        </div>
    );
};

interface RoleEditorProps {
    role: RoleCard;
    locked: boolean;
    onChange: (role: RoleCard) => void;
    onRemove: () => void;
}

const RoleEditor: React.FC<RoleEditorProps> = ({ role, locked, onChange, onRemove }) => {
    const { t } = useTranslation();
    const [editing, setEditing] = useState(false);

    if (!editing) {
        return (
            <div className="group relative rounded-lg border border-gray-200 bg-gray-50 p-4">
                {!locked && (
                    <button
                        onClick={() => setEditing(true)}
                        className="absolute right-2 top-2 rounded-md p-1 text-gray-400 hover:bg-white hover:text-indigo-600 sm:opacity-0 sm:group-hover:opacity-100"
                        aria-label={t("match.ideas.edit")}
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                )}
                <p className="pr-6 font-medium text-gray-900">{role.title}</p>
                {role.description && <p className="mt-1 text-sm text-gray-600">{role.description}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">{role.skills.map((s) => <Tag key={s}>{s}</Tag>)}</div>
                {role.first_week && (
                    <p className="mt-2 text-sm text-gray-700"><span className="font-medium text-indigo-700">{t("match.ideas.firstWeek")}</span>{role.first_week}</p>
                )}
                <p className="mt-2 text-xs text-gray-500">{t("match.ideas.roleMeta", { hours: role.hours_per_week, spots: role.spots || 1 })}</p>
            </div>
        );
    }

    return (
        <div className="space-y-2 rounded-lg border border-indigo-200 bg-white p-4">
            <Label label={t("match.ideas.roleTitle")}>
                <Input value={role.title} onChange={(e) => onChange({ ...role, title: e.target.value })} />
            </Label>
            <Label label={t("match.ideas.roleDescription")}>
                <TextArea className="min-h-[60px]" value={role.description} onChange={(e) => onChange({ ...role, description: e.target.value })} />
            </Label>
            <Label label={t("match.ideas.roleSkills")}>
                <Input
                    defaultValue={role.skills.join(", ")}
                    onBlur={(e) => onChange({ ...role, skills: e.target.value.split(/[,，、]/).map((s) => s.trim()).filter(Boolean) })}
                />
            </Label>
            <div className="grid grid-cols-2 gap-2">
                <Label label={t("match.ideas.roleHours")}>
                    <Input type="number" min={1} max={40} value={role.hours_per_week} onChange={(e) => onChange({ ...role, hours_per_week: Number(e.target.value) || 0 })} />
                </Label>
                <Label label={t("match.ideas.roleSpots")}>
                    <Input type="number" min={1} max={10} value={role.spots || 1} onChange={(e) => onChange({ ...role, spots: Number(e.target.value) || 1 })} />
                </Label>
            </div>
            <Label label={t("match.ideas.roleFirstWeek")}>
                <Input value={role.first_week || ""} onChange={(e) => onChange({ ...role, first_week: e.target.value })} />
            </Label>
            <div className="flex justify-between pt-1">
                <Button variant="danger" size="sm" onClick={onRemove} icon={<Trash2 className="h-3.5 w-3.5" />}>{t("match.ideas.removeRole")}</Button>
                <Button size="sm" onClick={() => setEditing(false)} icon={<Check className="h-3.5 w-3.5" />}>{t("match.ideas.done")}</Button>
            </div>
        </div>
    );
};

// BriefPreview mirrors what the public recruiting page shows.
const BriefPreview: React.FC<{ brief: IdeaBrief }> = ({ brief }) => {
    const { t } = useTranslation();
    return (
        <div className="max-h-[60vh] space-y-4 overflow-y-auto rounded-xl bg-gray-50 p-4">
            <div>
                <h3 className="text-xl font-bold text-gray-900">{brief.title}</h3>
                <p className="text-gray-600">{brief.one_liner}</p>
            </div>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div><dt className="font-medium text-gray-500">{t("match.detail.problem")}</dt><dd className="text-gray-900">{brief.problem}</dd></div>
                <div><dt className="font-medium text-gray-500">{t("match.detail.targetUsers")}</dt><dd className="text-gray-900">{brief.target_users}</dd></div>
                <div className="sm:col-span-2">
                    <dt className="font-medium text-gray-500">{t("match.detail.nextSteps")}</dt>
                    <dd><ol className="list-decimal pl-5 text-gray-900">{brief.next_steps.map((s) => <li key={s}>{s}</li>)}</ol></dd>
                </div>
            </dl>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {brief.roles.map((r) => (
                    <div key={r.title} className="rounded-lg border border-gray-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-gray-900">{r.title}</p>
                            <Badge tone="green">{t("match.roles.open", { n: r.spots || 1 })}</Badge>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1">{r.skills.map((s) => <Tag key={s}>{s}</Tag>)}</div>
                        {r.first_week && <p className="mt-1.5 text-xs text-gray-600"><span className="font-medium text-indigo-700">{t("match.roles.firstWeek")}</span>{r.first_week}</p>}
                        <p className="mt-1.5 text-xs text-gray-500">{t("match.roles.hours", { n: r.hours_per_week })}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

const SaveIndicator: React.FC<{ state: string }> = ({ state }) => {
    const { t } = useTranslation();
    if (state === "idle") return null;
    const label = state === "saving" ? t("match.ideas.saving") : state === "saved" ? t("match.ideas.saved") : t("match.ideas.saveFailed");
    return <span className={cx("text-xs font-normal", state === "error" ? "text-red-600" : "text-gray-400")}>{label}</span>;
};

interface DraftListProps {
    drafts: IdeaDraft[];
    activeId: number | null;
    disabled: boolean;
    onOpen: (draft: IdeaDraft) => void;
    onNew: () => void;
    onDelete: (draft: IdeaDraft) => void;
}

// DraftList is the "My ideas" sidebar; below the workbench on small screens.
const DraftList: React.FC<DraftListProps> = ({ drafts, activeId, disabled, onOpen, onNew, onDelete }) => {
    const { t, i18n } = useTranslation();
    const dateFormat = new Intl.DateTimeFormat(i18n.language, { month: "short", day: "numeric" });
    const status = (d: IdeaDraft) =>
        d.project_id ? (d.target_project_sid ? t("match.ideas.savedToProject") : t("match.ideas.becameProject"))
            : d.target_project_sid ? t("match.ideas.stageForProject")
            : d.post_sid ? t("match.ideas.published")
            : d.brief ? t("match.ideas.stageBrief")
                : t("match.ideas.stageThinking", { n: (d.rounds?.length || 0) + (d.current ? 1 : 0) });

    return (
        <aside className="order-last lg:order-first lg:pt-2">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">{t("match.ideas.draftsTitle")}</h2>
                <Button variant="ghost" size="sm" onClick={onNew} disabled={disabled} icon={<Plus className="h-3.5 w-3.5" />}>
                    {t("match.ideas.newIdea")}
                </Button>
            </div>
            {drafts.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">{t("match.ideas.noDrafts")}</p>
            ) : (
                <ul className="mt-3 space-y-2">
                    <AnimatePresence initial={false}>
                        {drafts.map((d) => {
                            const title = d.project?.title || (d.brief as IdeaBrief | null)?.title || d.idea || t("match.ideas.untitled");
                            return (
                                <motion.li
                                    key={d.id}
                                    layout
                                    initial={{ opacity: 0, x: -6 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className={cx(
                                        "group rounded-lg border p-3 transition-colors",
                                        d.id === activeId ? "border-indigo-300 bg-indigo-50" : "border-gray-200 bg-white hover:border-gray-300"
                                    )}
                                >
                                    <button onClick={() => onOpen(d)} disabled={disabled} className="block w-full text-left disabled:cursor-not-allowed">
                                        <p className="line-clamp-2 text-sm font-medium text-gray-900">{title}</p>
                                        <p className={cx("mt-1 text-xs", d.post_sid ? "text-emerald-700" : "text-gray-500")}>
                                            {status(d)} · {dateFormat.format(new Date(d.updated_at))}
                                        </p>
                                    </button>
                                    {/* A draft that became a project is kept as the project's thinking record */}
                                    {!d.project_id && (
                                        <button
                                            onClick={() => onDelete(d)}
                                            disabled={disabled}
                                            className="mt-1 text-xs text-gray-400 hover:text-red-600 disabled:opacity-50 lg:invisible lg:group-hover:visible lg:group-focus-within:visible"
                                        >
                                            {t("match.ideas.deleteDraft")}
                                        </button>
                                    )}
                                </motion.li>
                            );
                        })}
                    </AnimatePresence>
                </ul>
            )}
        </aside>
    );
};

export default withAuth(IdeaWorkbench);
