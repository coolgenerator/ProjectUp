import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Circle, ExternalLink, Megaphone, Trash2 } from "lucide-react";
import fetchWithAuth from "../../hooks/fetchWithAuth";
import { RoleCard } from "./RoleCards";
import { avatarSrc, PersonCard } from "./PostTeam";
import { Alert, Badge, Button, Card, Input, ProgressBar, TextArea, cx } from "../ui";

interface Checkin {
    done: string;
    next: string;
    blockers: string;
    updated_at: string;
}

interface KickoffItem {
    key: string;
    done: boolean;
    auto: boolean;
}

interface Decision {
    id: number;
    text: string;
    author: string;
    user_id: number;
    created_at: string;
}

interface Pulse {
    is_admin: boolean;
    me: number;
    week_start: string;
    recruiting: { post_sid: string; status: number; roles: RoleCard[] | null; role_fills: Record<string, number> } | null;
    team: { person: PersonCard; is_owner: boolean; checkin: Checkin | null }[];
    kickoff: KickoffItem[];
    decisions: Decision[];
}

const FIELDS = ["done", "next", "blockers"] as const;

// TeamPulse keeps a small team moving: kickoff steps, open roles, a weekly
// one-line-each check-in, and a log of what was decided.
const TeamPulse: React.FC<{ projectSid: string }> = ({ projectSid }) => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [pulse, setPulse] = useState<Pulse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [draft, setDraft] = useState<Record<(typeof FIELDS)[number], string>>({ done: "", next: "", blockers: "" });
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [decisionText, setDecisionText] = useState("");

    const load = useCallback(async () => {
        try {
            const response = await fetchWithAuth(`/api/match/projects/${projectSid}/pulse`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            setPulse(data);
            const mine = (data as Pulse).team.find((m) => m.person.user_id === data.me)?.checkin;
            setDraft({ done: mine?.done || "", next: mine?.next || "", blockers: mine?.blockers || "" });
            setEditing(!mine);
        } catch {
            setError(t("match.pulse.failed"));
        }
    }, [projectSid, t]);

    useEffect(() => {
        load();
    }, [load]);

    const call = async (url: string, method: string, body?: unknown) => {
        setError(null);
        const response = await fetchWithAuth(url, { method, body: body === undefined ? undefined : JSON.stringify(body) });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || t("match.board.updateFailed"));
        }
        return response;
    };

    const saveCheckin = async () => {
        setSaving(true);
        try {
            await call(`/api/match/projects/${projectSid}/checkin`, "PUT", draft);
            await load();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const reopen = async () => {
        try {
            await call(`/api/match/projects/${projectSid}/reopen`, "POST");
            setNotice(t("match.pulse.reopened"));
            load();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const toggleKickoff = async (item: KickoffItem) => {
        if (!pulse) return;
        // Optimistic: the checklist should feel instant
        setPulse({ ...pulse, kickoff: pulse.kickoff.map((k) => (k.key === item.key ? { ...k, done: !k.done } : k)) });
        try {
            await call(`/api/match/projects/${projectSid}/kickoff`, "PUT", { key: item.key, done: !item.done });
        } catch (err: any) {
            setError(err.message);
            load();
        }
    };

    const addDecision = async () => {
        if (!decisionText.trim()) return;
        try {
            await call(`/api/match/projects/${projectSid}/decisions`, "POST", { text: decisionText });
            setDecisionText("");
            load();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const deleteDecision = async (id: number) => {
        try {
            await call(`/api/match/projects/${projectSid}/decisions/${id}`, "DELETE");
            load();
        } catch (err: any) {
            setError(err.message);
        }
    };

    if (error && !pulse) return <Alert className="mb-6">{error}</Alert>;
    if (!pulse) return null;

    const roles = pulse.recruiting?.roles || [];
    const gaps = roles.filter((r) => (pulse.recruiting!.role_fills[r.title] || 0) < Math.max(r.spots || 1, 1));
    const weekOf = new Date(`${pulse.week_start}T00:00:00`).toLocaleDateString(i18n.language, { month: "short", day: "numeric" });
    const kickoffDone = pulse.kickoff.filter((k) => k.done).length;
    const date = (d: string) => new Date(d).toLocaleDateString(i18n.language, { month: "short", day: "numeric" });

    return (
        <section className="mb-6 space-y-6">
            {error && <Alert>{error}</Alert>}
            {notice && <Alert tone="success">{notice}</Alert>}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Kickoff checklist */}
                <Card>
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h3 className="font-semibold text-gray-900">{t("match.kickoff.title")}</h3>
                            <p className="text-sm text-gray-500">{t("match.kickoff.hint")}</p>
                        </div>
                        <Badge tone={kickoffDone === pulse.kickoff.length ? "green" : "indigo"}>{kickoffDone}/{pulse.kickoff.length}</Badge>
                    </div>
                    <ProgressBar value={kickoffDone} max={pulse.kickoff.length} className="mt-3" />
                    <ul className="mt-3 space-y-1">
                        {pulse.kickoff.map((item) => {
                            const canToggle = pulse.is_admin && !item.auto;
                            return (
                                <li key={item.key}>
                                    <button
                                        onClick={() => canToggle && toggleKickoff(item)}
                                        disabled={!canToggle}
                                        className={cx("flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition", canToggle && "hover:bg-gray-50", !canToggle && "cursor-default")}
                                    >
                                        <motion.span key={String(item.done)} initial={{ scale: 0.6 }} animate={{ scale: 1 }}>
                                            {item.done ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-gray-300" />}
                                        </motion.span>
                                        <span className={cx(item.done ? "text-gray-500 line-through" : "text-gray-800")}>{t(`match.kickoff.${item.key}`)}</span>
                                        {item.auto && <span className="text-xs text-gray-400">({t("match.kickoff.auto")})</span>}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </Card>

                {/* Roles and gaps */}
                <Card>
                    <h3 className="font-semibold text-gray-900">{t("match.pulse.rolesTitle")}</h3>
                    {!pulse.recruiting ? (
                        <p className="mt-2 text-sm text-gray-500">{t("match.pulse.noPost")}</p>
                    ) : (
                        <>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {roles.map((r) => {
                                    const total = Math.max(r.spots || 1, 1);
                                    const filled = pulse.recruiting!.role_fills[r.title] || 0;
                                    return <Badge key={r.title} tone={filled >= total ? "green" : "amber"}>{r.title} {filled}/{total}</Badge>;
                                })}
                            </div>
                            <p className="mt-3 text-sm text-gray-700">
                                {gaps.length === 0 ? t("match.pulse.allFilled") : t("match.pulse.gaps", { roles: gaps.map((g) => g.title).join(i18n.language.startsWith("zh") ? "、" : ", ") })}
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {pulse.is_admin && gaps.length > 0 && (
                                    <Button onClick={reopen} icon={<Megaphone className="h-4 w-4" />}>{t("match.pulse.reopen")}</Button>
                                )}
                                <Button variant="secondary" onClick={() => navigate(`/projectpost/${pulse.recruiting!.post_sid}`)} icon={<ExternalLink className="h-4 w-4" />}>
                                    {t("match.pulse.viewPost")}
                                </Button>
                            </div>
                        </>
                    )}
                </Card>
            </div>

            {/* Weekly check-in */}
            <Card>
                <h3 className="font-semibold text-gray-900">{t("match.pulse.checkinTitle")}</h3>
                <p className="text-sm text-gray-500">{t("match.pulse.checkinHint", { date: weekOf })}</p>

                <AnimatePresence initial={false}>
                    {editing && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                                {FIELDS.map((field) => (
                                    <label key={field} className="text-xs font-medium text-gray-600">
                                        {t(`match.pulse.${field}`)}
                                        <TextArea className="min-h-[64px]" value={draft[field]} onChange={(e) => setDraft({ ...draft, [field]: e.target.value })} />
                                    </label>
                                ))}
                            </div>
                            <Button className="mt-3" onClick={saveCheckin} loading={saving} disabled={!FIELDS.some((f) => draft[f].trim())}>
                                {t("match.pulse.save")}
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <ul className="mt-4 divide-y divide-gray-100">
                    {pulse.team.map(({ person, is_owner, checkin }) => (
                        <li key={person.user_id} className="flex gap-3 py-3">
                            <img src={avatarSrc(person.avatar_url)} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" onError={(e) => { e.currentTarget.src = "/default-avatar.jpg"; }} />
                            <div className="min-w-0 flex-1 text-sm">
                                <p className="font-medium text-gray-900">
                                    {person.name}
                                    <span className="ml-2 text-xs font-normal text-gray-500">{is_owner ? t("match.pulse.owner") : person.role}</span>
                                    {person.user_id === pulse.me && checkin && !editing && (
                                        <button onClick={() => setEditing(true)} className="ml-2 text-xs font-normal text-indigo-600 hover:underline">{t("match.pulse.edit")}</button>
                                    )}
                                </p>
                                {checkin ? (
                                    <dl className="mt-1 grid grid-cols-1 gap-x-4 gap-y-0.5 text-gray-700 md:grid-cols-3">
                                        {FIELDS.filter((f) => checkin[f]).map((f) => (
                                            <div key={f}>
                                                <dt className="text-xs text-gray-500">{t(`match.pulse.${f}`)}</dt>
                                                <dd className={f === "blockers" ? "text-amber-800" : ""}>{checkin[f]}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                ) : (
                                    <p className="text-xs text-gray-400">{t("match.pulse.missing")}</p>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </Card>

            {/* Decision log */}
            <Card>
                <h3 className="font-semibold text-gray-900">{t("match.decisions.title")}</h3>
                <p className="text-sm text-gray-500">{t("match.decisions.hint")}</p>
                <form
                    className="mt-3 flex gap-2"
                    onSubmit={(e) => { e.preventDefault(); addDecision(); }}
                >
                    <Input value={decisionText} onChange={(e) => setDecisionText(e.target.value)} placeholder={t("match.decisions.placeholder")} className="mt-0" />
                    <Button type="submit" disabled={!decisionText.trim()}>{t("match.decisions.add")}</Button>
                </form>
                {pulse.decisions.length === 0 ? (
                    <p className="mt-3 text-sm text-gray-400">{t("match.decisions.empty")}</p>
                ) : (
                    <ul className="mt-3 space-y-2">
                        <AnimatePresence initial={false}>
                            {pulse.decisions.map((d) => (
                                <motion.li
                                    key={d.id}
                                    layout
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="group flex items-start gap-3 rounded-lg border border-gray-100 px-3 py-2"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm text-gray-900">{d.text}</p>
                                        <p className="text-xs text-gray-500">{d.author} · {date(d.created_at)}</p>
                                    </div>
                                    {(pulse.is_admin || d.user_id === pulse.me) && (
                                        <button
                                            onClick={() => deleteDecision(d.id)}
                                            className="rounded-md p-1 text-gray-300 hover:bg-gray-100 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100"
                                            aria-label={t("match.decisions.delete")}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </motion.li>
                            ))}
                        </AnimatePresence>
                    </ul>
                )}
            </Card>
        </section>
    );
};

export default TeamPulse;
