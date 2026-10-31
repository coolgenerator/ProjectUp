import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BellRing, CheckCircle2, ClipboardList, Inbox, MailOpen, PenLine } from "lucide-react";
import fetchWithAuth from "../../hooks/fetchWithAuth";
import { Badge, Button, Card, FadeIn } from "../ui";

interface Todo {
    new_applications: number;
    trials_running: number;
    my_trials: number;
    invitations: number;
    missing_checkins: number;
}

interface MyApplication {
    application_id: number;
    post_sid: string;
    title: string;
    role: string;
    status: number;
    stage: "new" | "talking" | "trial";
    trial_task: string;
    trial_due: string | null;
    applied_at: string;
}

const statusKey = (a: MyApplication) => (a.status === 1 ? "accepted" : a.status === 2 ? "declined" : a.stage);
const STATUS_TONES = { new: "blue", talking: "indigo", trial: "amber", accepted: "green", declined: "neutral" } as const;

// MatchTodo is the top of My Projects: what's waiting on you, and where your own applications stand.
// The compact variant is a single bar of to-dos for the community feed, hidden when nothing is waiting.
const MatchTodo: React.FC<{ compact?: boolean }> = ({ compact }) => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [todo, setTodo] = useState<Todo | null>(null);
    const [applications, setApplications] = useState<MyApplication[] | null>(null);

    useEffect(() => {
        fetchWithAuth("/api/match/todo").then((r) => (r.ok ? r.json() : null)).then(setTodo).catch(() => setTodo(null));
        if (compact) {
            setApplications([]);
            return;
        }
        fetchWithAuth("/api/match/my-applications")
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => setApplications(d?.applications || []))
            .catch(() => setApplications([]));
    }, [compact]);

    if (!todo || !applications) return null;

    const items = [
        { n: todo.new_applications, key: "newApplications", icon: Inbox, onClick: () => navigate("/applications") },
        { n: todo.trials_running, key: "trialsRunning", icon: ClipboardList, onClick: () => navigate("/applications") },
        {
            n: todo.my_trials,
            key: "myTrials",
            icon: PenLine,
            onClick: compact ? () => navigate("/my-projects") : () => document.getElementById("my-applications")?.scrollIntoView({ behavior: "smooth" }),
        },
        { n: todo.invitations, key: "invitations", icon: MailOpen, onClick: () => navigate("/notifications") },
        { n: todo.missing_checkins, key: "missingCheckins", icon: BellRing, onClick: compact ? () => navigate("/my-projects") : undefined },
    ].filter((i) => i.n > 0);
    if (compact) {
        if (items.length === 0) return null;
        return (
            <FadeIn className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 sm:p-4">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="mr-1 text-sm font-semibold text-indigo-900">{t("match.todo.title")}</span>
                    {items.map(({ n, key, icon: Icon, onClick }) => (
                        <button
                            key={key}
                            onClick={onClick}
                            disabled={!onClick}
                            className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-white px-3 py-1 text-sm text-gray-800 shadow-sm transition hover:border-indigo-300 disabled:cursor-default disabled:hover:border-indigo-100"
                        >
                            <Icon className="h-3.5 w-3.5 text-indigo-600" aria-hidden />
                            {t(`match.todo.${key}`, { n })}
                        </button>
                    ))}
                </div>
            </FadeIn>
        );
    }

    const date = (d: string) => new Date(d).toLocaleDateString(i18n.language, { month: "short", day: "numeric" });

    return (
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <FadeIn>
                <Card className="h-full">
                    <h2 className="font-semibold text-gray-900">{t("match.todo.title")}</h2>
                    {items.length === 0 ? (
                        <p className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden /> {t("match.todo.allClear")}
                        </p>
                    ) : (
                        <ul className="mt-3 space-y-2">
                            {items.map(({ n, key, icon: Icon, onClick }) => (
                                <li key={key}>
                                    <button
                                        onClick={onClick}
                                        disabled={!onClick}
                                        className="flex w-full items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-left text-sm text-gray-800 transition hover:border-indigo-200 hover:bg-indigo-50 disabled:cursor-default disabled:hover:border-gray-100 disabled:hover:bg-gray-50"
                                    >
                                        <Icon className="h-4 w-4 shrink-0 text-indigo-600" aria-hidden />
                                        {t(`match.todo.${key}`, { n })}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </FadeIn>

            <FadeIn delay={0.05}>
                <Card className="h-full" id="my-applications">
                    <h2 className="font-semibold text-gray-900">{t("match.todo.myApplications")}</h2>
                    {applications.length === 0 ? (
                        <div className="mt-3 text-sm text-gray-500">
                            <p>{t("match.todo.noApplications")}</p>
                            <Button variant="ghost" size="sm" className="mt-2 -ml-2.5" onClick={() => navigate("/projects")}>{t("match.todo.browse")}</Button>
                        </div>
                    ) : (
                        <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                            {applications.map((a) => {
                                const key = statusKey(a);
                                return (
                                    <li key={a.application_id}>
                                        <button
                                            onClick={() => navigate(a.status === 0 ? `/project/${a.post_sid}/apply` : `/projectpost/${a.post_sid}`)}
                                            className="w-full rounded-lg border border-gray-100 px-3 py-2 text-left transition hover:border-indigo-200 hover:bg-indigo-50/40"
                                        >
                                            <span className="flex items-center justify-between gap-2">
                                                <span className="truncate text-sm font-medium text-gray-900">{a.title}</span>
                                                <Badge tone={STATUS_TONES[key]}>{t(`match.todo.status.${key}`)}</Badge>
                                            </span>
                                            <span className="mt-0.5 block text-xs text-gray-500">
                                                {a.role || t("match.applications.noRole")} · {t("match.board.applied", { date: date(a.applied_at) })}
                                            </span>
                                            {key === "trial" && a.trial_task && (
                                                <span className="mt-1.5 block rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900">
                                                    {t("match.board.trialLabel")}{a.trial_due ? ` · ${t("match.board.dueOn", { date: date(a.trial_due) })}` : ""}: {a.trial_task}
                                                </span>
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Card>
            </FadeIn>
        </div>
    );
};

export default MatchTodo;
