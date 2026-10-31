import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Clock, MessageCircle, RefreshCw } from "lucide-react";
import fetchWithAuth from "../../hooks/fetchWithAuth";
import { openChatWith } from "../../utils/chat/openChat";
import { Badge, Button, FadeIn, Tag, cx } from "../ui";

interface Candidate {
    user_id: number;
    sid: string;
    name: string;
    field: string;
    school: string;
    skills: string[] | null;
    hours_per_week: number;
}

interface RoleCard {
    title: string;
    skills?: string[];
    hours_per_week?: number;
}

interface RecommendedPost {
    post_sid: string;
    title: string;
    description: string;
    topics: string[] | null;
    roles: RoleCard[] | null;
}

export interface Match<T> {
    role: string;
    score: number;
    reason: string;
    risk: string;
    candidate?: T;
    post?: T;
}

// useMatches loads an AI match list; refresh() bypasses the server cache.
function useMatches<T>(url: string) {
    const { t, i18n } = useTranslation();
    // AI reasons are written in the UI language; the server caches per language
    const lang = i18n.language.startsWith("zh") ? "zh" : "en";
    const [matches, setMatches] = useState<Match<T>[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (refresh = false) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetchWithAuth(`${url}?lang=${lang}${refresh ? "&refresh=1" : ""}`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || t("match.recs.loadFailed"));
            setMatches(data.matches || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [url, lang, t]);

    useEffect(() => {
        load();
    }, [load]);

    return { matches, loading, error, refresh: () => load(true) };
}

const PanelShell: React.FC<{
    title: string;
    subtitle: string;
    loading: boolean;
    error: string | null;
    empty: boolean;
    onRefresh: () => void;
    children: React.ReactNode;
}> = ({ title, subtitle, loading, error, empty, onRefresh, children }) => {
    const { t } = useTranslation();
    return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
            <div>
                <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
            </div>
            <button
                onClick={onRefresh}
                disabled={loading}
                className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
                {t("match.recs.refresh")}
            </button>
        </div>
        {loading ? (
            <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />
                ))}
                <p className="text-sm text-gray-500">{t("match.recs.loading")}</p>
            </div>
        ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
        ) : empty ? (
            <p className="text-sm text-gray-500">{t("match.recs.empty")}</p>
        ) : (
            <div className="space-y-3">{children}</div>
        )}
    </section>
    );
};

interface CandidateRole extends RoleCard {
    spots?: number;
    first_week?: string;
}

export interface CandidateMatches {
    title: string;
    matches: Match<Candidate>[];
    roles: CandidateRole[];
    poolSize: number;
    loading: boolean;
    error: string | null;
    refresh: () => void;
}

// useCandidateMatches loads AI-picked candidates for a post's open roles.
export function useCandidateMatches(postSid: string | null): CandidateMatches {
    const { t, i18n } = useTranslation();
    const lang = i18n.language.startsWith("zh") ? "zh" : "en";
    const [data, setData] = useState<{ title: string; matches: Match<Candidate>[]; roles: CandidateRole[]; poolSize: number }>({ title: "", matches: [], roles: [], poolSize: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (refresh = false) => {
        if (!postSid) return;
        setLoading(true);
        setError(null);
        try {
            const response = await fetchWithAuth(`/api/match/posts/${postSid}/candidates?lang=${lang}${refresh ? "&refresh=1" : ""}`);
            const body = await response.json();
            if (!response.ok) throw new Error(body.error || t("match.recs.loadFailed"));
            setData({ title: body.title || "", matches: body.matches || [], roles: body.roles || [], poolSize: body.pool_size || 0 });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [postSid, lang, t]);

    useEffect(() => {
        load();
    }, [load]);

    return { ...data, loading, error, refresh: () => load(true) };
}

const initials = (name: string) => (name.trim()[0] || "?").toUpperCase();

const CandidateCard: React.FC<{ match: Match<Candidate>; role?: CandidateRole; projectTitle: string; index: number }> = ({ match, role, projectTitle, index }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const c = match.candidate!;
    const short = role?.hours_per_week && c.hours_per_week ? c.hours_per_week < role.hours_per_week : false;
    return (
        <FadeIn delay={index * 0.08} className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">{initials(c.name)}</span>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <p className="truncate font-semibold text-gray-900">{c.name}</p>
                        <Badge tone="indigo" title={t("match.recs.scoreHint")}>{t("match.recs.score", { n: match.score })}</Badge>
                    </div>
                    <p className="truncate text-sm text-gray-500">{[c.field, c.school].filter(Boolean).join(" · ")}</p>
                    <p className={cx("mt-0.5 text-xs", short ? "text-amber-700" : "text-gray-500")}>
                        <Clock className="mr-1 inline h-3 w-3" aria-hidden />
                        {t("match.recs.available", { n: c.hours_per_week || "?" })}
                    </p>
                </div>
            </div>
            {c.skills && c.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.skills.slice(0, 5).map((s) => <Tag key={s}>{s}</Tag>)}
                </div>
            )}
            <div className="mt-3 space-y-2 text-sm">
                <p className="flex gap-2 text-gray-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label={t("match.recs.reason")} />
                    <span>{match.reason}</span>
                </p>
                <p className="flex gap-2 text-gray-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-label={t("match.recs.risk")} />
                    <span>{match.risk}</span>
                </p>
            </div>
            <div className="mt-auto flex gap-2 pt-4">
                <Button variant="secondary" size="sm" onClick={() => navigate(`/profile/${c.sid}`)}>{t("match.recs.viewProfile")}</Button>
                <Button
                    size="sm"
                    icon={<MessageCircle className="h-3.5 w-3.5" />}
                    onClick={() =>
                        openChatWith(navigate, c.sid, [
                            t("match.chat.invite", { name: c.name, project: projectTitle, role: match.role }),
                            role?.hours_per_week ? t("match.chat.inviteHours", { n: role.hours_per_week }) : "",
                            role?.first_week ? t("match.chat.inviteFirstWeek", { task: role.first_week }) : "",
                            t("match.chat.inviteClose"),
                        ].join(""))
                    }
                >
                    {t("match.recs.invite")}
                </Button>
            </div>
        </FadeIn>
    );
};

// CandidatesByRole lays candidates out under the open role each could fill,
// so the founder sees every gap in the team next to the people for it.
export const CandidatesByRole: React.FC<{ matches: Match<Candidate>[]; roles: CandidateRole[]; projectTitle: string }> = ({ matches, roles, projectTitle }) => {
    const { t } = useTranslation();
    const groups = roles.length > 0 ? roles : [...new Set(matches.map((m) => m.role))].map((title) => ({ title }) as CandidateRole);
    return (
        <div className="space-y-6">
            {groups.map((role) => {
                const forRole = matches.filter((m) => m.candidate && m.role === role.title);
                return (
                    <section key={role.title}>
                        <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <h3 className="font-semibold text-gray-900">{role.title}</h3>
                            <span className="text-sm text-gray-500">
                                {[
                                    role.spots ? t("match.recs.needs", { n: role.spots }) : null,
                                    role.hours_per_week ? t("match.roles.hours", { n: role.hours_per_week }) : null,
                                ].filter(Boolean).join(" · ")}
                            </span>
                        </div>
                        {forRole.length === 0 ? (
                            <p className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-3 text-sm text-gray-500">{t("match.recs.noneForRole")}</p>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {forRole.map((m, i) => <CandidateCard key={m.candidate!.user_id} match={m} role={role} projectTitle={projectTitle} index={i} />)}
                            </div>
                        )}
                    </section>
                );
            })}
        </div>
    );
};

// RecommendedCandidates shows the post owner who could fill their open roles.
export const RecommendedCandidates: React.FC<{ postSid: string }> = ({ postSid }) => {
    const { t } = useTranslation();
    const { title, matches, roles, loading, error, refresh } = useCandidateMatches(postSid);

    return (
        <PanelShell
            title={t("match.recs.candidatesTitle")}
            subtitle={t("match.recs.candidatesSubtitle")}
            loading={loading}
            error={error}
            empty={matches.length === 0}
            onRefresh={refresh}
        >
            <CandidatesByRole matches={matches} roles={roles} projectTitle={title} />
        </PanelShell>
    );
};

// How many recommendations show before "show all"; one row on desktop
const PROJECT_RECS_VISIBLE = 3;
const RECS_COLLAPSED_KEY = "recs.projects.collapsed";

const readCollapsed = () => {
    try {
        return localStorage.getItem(RECS_COLLAPSED_KEY) === "1";
    } catch {
        return false;
    }
};

const ProjectRecCard: React.FC<{ match: Match<RecommendedPost>; index: number }> = ({ match, index }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const post = match.post!;
    const role = post.roles?.find((r) => r.title === match.role);
    return (
        <FadeIn
            delay={index * 0.05}
            className="flex w-[82%] shrink-0 snap-start flex-col rounded-xl border border-gray-200 bg-white p-4 transition hover:border-indigo-200 hover:shadow-sm sm:w-auto"
        >
            <div className="flex items-start justify-between gap-2">
                <button onClick={() => navigate(`/projectpost/${post.post_sid}`)} className="min-w-0 text-left">
                    <p className="truncate font-semibold text-gray-900 hover:text-indigo-700">{post.title}</p>
                </button>
                <Badge tone="indigo" title={t("match.recs.scoreHint")}>{match.score}</Badge>
            </div>
            <p className="mt-0.5 truncate text-sm text-gray-600">
                <span className="font-medium text-gray-800">{match.role}</span>
                {role?.hours_per_week ? <span className="text-gray-500"> · {t("match.roles.hours", { n: role.hours_per_week })}</span> : null}
            </p>
            <div className="mt-3 space-y-1.5 text-sm">
                <p className="flex gap-1.5 text-gray-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label={t("match.recs.reason")} />
                    <span className="line-clamp-2">{match.reason}</span>
                </p>
                <p className="flex gap-1.5 text-gray-600" title={match.risk}>
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-label={t("match.recs.risk")} />
                    <span className="line-clamp-1">{match.risk}</span>
                </p>
            </div>
            <div className="mt-auto flex items-center gap-2 pt-4">
                <Button size="sm" onClick={() => navigate(`/project/${post.post_sid}/apply?role=${encodeURIComponent(match.role)}`)}>
                    {t("match.recs.apply")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate(`/projectpost/${post.post_sid}`)}>
                    {t("match.recs.viewProject")}
                </Button>
            </div>
        </FadeIn>
    );
};

// RecommendedProjects shows the current user open roles they could fill: one
// compact row of cards, so the full project list stays in view below it.
export const RecommendedProjects: React.FC = () => {
    const { t } = useTranslation();
    const { matches, loading, error, refresh } = useMatches<RecommendedPost>("/api/match/recommended-posts");
    const [collapsed, setCollapsed] = useState(readCollapsed);
    const [showAll, setShowAll] = useState(false);
    const shown = matches.filter((m) => m.post);
    const visible = showAll ? shown : shown.slice(0, PROJECT_RECS_VISIBLE);

    const toggleCollapsed = () => {
        setCollapsed((c) => {
            try {
                localStorage.setItem(RECS_COLLAPSED_KEY, c ? "0" : "1");
            } catch {
                // Preference is just not remembered
            }
            return !c;
        });
    };

    return (
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-baseline gap-2">
                    <h2 className="font-semibold text-gray-900">{t("match.recs.projectsTitle")}</h2>
                    {!loading && !error && shown.length > 0 && <span className="text-sm text-gray-500">{t("match.recs.count", { n: shown.length })}</span>}
                </div>
                <div className="flex items-center gap-1">
                    {!collapsed && (
                        <Button variant="ghost" size="sm" onClick={refresh} disabled={loading} icon={<RefreshCw className="h-3.5 w-3.5" />}>
                            {t("match.recs.refresh")}
                        </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={toggleCollapsed} aria-expanded={!collapsed} icon={collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}>
                        {collapsed ? t("match.recs.expand") : t("match.recs.collapse")}
                    </Button>
                </div>
            </div>
            {!collapsed && (
                <>
                    <p className="mt-0.5 text-sm text-gray-500">{t("match.recs.projectsSubtitle")}</p>
                    {loading ? (
                        <div className="mt-4">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                {[0, 1, 2].map((i) => <div key={i} className={cx("h-44 animate-pulse rounded-xl bg-gray-100", i > 0 && "hidden sm:block")} />)}
                            </div>
                            <p className="mt-2 text-xs text-gray-500">{t("match.recs.loading")}</p>
                        </div>
                    ) : error ? (
                        <p className="mt-3 text-sm text-red-600">{error}</p>
                    ) : shown.length === 0 ? (
                        <p className="mt-3 text-sm text-gray-500">{t("match.recs.empty")}</p>
                    ) : (
                        <>
                            {/* Phones swipe through the cards; wider screens get a grid */}
                            <div className="-mx-4 mt-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
                                {visible.map((m, i) => <ProjectRecCard key={m.post!.post_sid} match={m} index={i} />)}
                            </div>
                            {shown.length > PROJECT_RECS_VISIBLE && (
                                <div className="mt-3 hidden justify-center sm:flex">
                                    <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
                                        {showAll ? t("match.recs.showLess") : t("match.recs.showAll", { n: shown.length })}
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
        </section>
    );
};
