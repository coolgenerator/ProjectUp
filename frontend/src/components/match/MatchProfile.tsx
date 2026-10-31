import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Sparkles, X } from "lucide-react";
import fetchWithAuth from "../../hooks/fetchWithAuth";
import { Alert, Badge, Button, Card, Dialog, Input, Label, ProgressBar, Select, Tag } from "../ui";

export interface MatchProfileData {
    skills: { name: string; level: number }[];
    hours_per_week: number;
    timezone: string;
    desired_roles: string[];
    completed: number;
    total: number;
}

// Timezones most users pick; anything else can still be typed via the browser default.
const COMMON_TIMEZONES = [
    "Asia/Shanghai", "Asia/Hong_Kong", "Asia/Taipei", "Asia/Singapore", "Asia/Tokyo", "Asia/Seoul",
    "Europe/London", "Europe/Berlin", "America/New_York", "America/Chicago", "America/Los_Angeles", "Australia/Sydney",
];

export function useMatchProfile() {
    const [profile, setProfile] = useState<MatchProfileData | null>(null);
    const load = useCallback(async () => {
        const response = await fetchWithAuth("/api/match/profile");
        if (response.ok) setProfile(await response.json());
    }, []);
    useEffect(() => {
        load().catch(() => setProfile(null));
    }, [load]);
    return { profile, setProfile, reload: load };
}

interface EditorProps {
    open: boolean;
    profile: MatchProfileData;
    onClose: () => void;
    onSaved: (profile: MatchProfileData) => void;
}

// MatchProfileEditor edits the four fields matching depends on.
export const MatchProfileEditor: React.FC<EditorProps> = ({ open, profile, onClose, onSaved }) => {
    const { t } = useTranslation();
    const levels = t("match.matchProfile.levels", { returnObjects: true }) as string[];
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const [skills, setSkills] = useState(profile.skills);
    const [newSkill, setNewSkill] = useState("");
    const [hours, setHours] = useState(profile.hours_per_week ? String(profile.hours_per_week) : "");
    const [timezone, setTimezone] = useState(profile.timezone || browserTimezone);
    const [roles, setRoles] = useState(profile.desired_roles.join(", "));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setSkills(profile.skills);
        setHours(profile.hours_per_week ? String(profile.hours_per_week) : "");
        setTimezone(profile.timezone || browserTimezone);
        setRoles(profile.desired_roles.join(", "));
        setError(null);
    }, [open, profile, browserTimezone]);

    const addSkill = () => {
        const name = newSkill.trim();
        if (name && !skills.some((s) => s.name.toLowerCase() === name.toLowerCase())) setSkills([...skills, { name, level: 3 }]);
        setNewSkill("");
    };

    const save = async () => {
        setSaving(true);
        setError(null);
        try {
            const response = await fetchWithAuth("/api/match/profile", {
                method: "PUT",
                body: JSON.stringify({
                    skills,
                    hours_per_week: Number(hours) || 0,
                    timezone,
                    desired_roles: roles.split(/[,，、]/).map((r) => r.trim()).filter(Boolean),
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            onSaved(data);
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const timezones = COMMON_TIMEZONES.includes(timezone) ? COMMON_TIMEZONES : [timezone, ...COMMON_TIMEZONES];

    return (
        <Dialog
            open={open}
            onClose={onClose}
            size="lg"
            title={t("match.matchProfile.title")}
            description={t("match.matchProfile.subtitle")}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>{t("match.board.cancel")}</Button>
                    <Button onClick={save} loading={saving}>{t("match.matchProfile.save")}</Button>
                </>
            }
        >
            <div className="space-y-5">
                {error && <Alert>{error}</Alert>}
                <div>
                    <Label label={t("match.matchProfile.skills")} hint={t("match.matchProfile.skillsHint")}><span /></Label>
                    <ul className="mt-2 space-y-2">
                        {skills.map((skill, i) => (
                            <li key={skill.name} className="flex items-center gap-2">
                                <span className="min-w-0 flex-1 truncate text-sm text-gray-900">{skill.name}</span>
                                <Select
                                    value={skill.level}
                                    onChange={(e) => setSkills(skills.map((s, j) => (j === i ? { ...s, level: Number(e.target.value) } : s)))}
                                    className="mt-0 w-32"
                                    aria-label={`${skill.name} level`}
                                >
                                    {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} · {levels[n]}</option>)}
                                </Select>
                                <button onClick={() => setSkills(skills.filter((_, j) => j !== i))} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600" aria-label={t("match.matchProfile.remove")}>
                                    <X className="h-4 w-4" />
                                </button>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-2 flex gap-2">
                        <Input
                            value={newSkill}
                            onChange={(e) => setNewSkill(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                            placeholder={t("match.matchProfile.skillPlaceholder")}
                            className="mt-0"
                        />
                        <Button variant="secondary" onClick={addSkill} icon={<Plus className="h-4 w-4" />} disabled={!newSkill.trim()}>
                            {t("match.matchProfile.addSkill")}
                        </Button>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Label label={t("match.matchProfile.hours")}>
                        <Input type="number" min={1} max={80} value={hours} onChange={(e) => setHours(e.target.value)} />
                    </Label>
                    <Label label={t("match.matchProfile.timezone")}>
                        <Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                            {timezones.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                        </Select>
                    </Label>
                </div>
                <Label label={t("match.matchProfile.roles")} hint={t("match.matchProfile.rolesHint")}>
                    <Input value={roles} onChange={(e) => setRoles(e.target.value)} />
                </Label>
            </div>
        </Dialog>
    );
};

const missingFields = (p: MatchProfileData, t: (k: string) => string) =>
    [
        p.skills.length === 0 && t("match.profileNudge.skills"),
        !p.hours_per_week && t("match.profileNudge.hours"),
        !p.timezone && t("match.profileNudge.timezone"),
        p.desired_roles.length === 0 && t("match.profileNudge.roles"),
    ].filter(Boolean) as string[];

// ProfileNudge asks users to finish their matching profile, right where it pays off.
export const ProfileNudge: React.FC<{ className?: string }> = ({ className }) => {
    const { t, i18n } = useTranslation();
    const { profile, setProfile } = useMatchProfile();
    const [editing, setEditing] = useState(false);
    if (!profile || profile.completed >= profile.total) return null;

    const missing = missingFields(profile, t).join(i18n.language.startsWith("zh") ? "、" : ", ");
    return (
        <>
            <Card className={`flex flex-col gap-3 border-indigo-100 bg-indigo-50/60 sm:flex-row sm:items-center ${className || ""}`} padded={false}>
                <div className="flex min-w-0 flex-1 items-start gap-3 p-4">
                    <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" aria-hidden />
                    <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">{t("match.profileNudge.title", { done: profile.completed, total: profile.total })}</p>
                        <p className="text-sm text-gray-600">{t("match.profileNudge.hint", { missing })}</p>
                        <ProgressBar value={profile.completed} max={profile.total} className="mt-2 max-w-xs" />
                    </div>
                </div>
                <div className="px-4 pb-4 sm:pb-0">
                    <Button onClick={() => setEditing(true)}>{t("match.profileNudge.complete")}</Button>
                </div>
            </Card>
            <MatchProfileEditor open={editing} profile={profile} onClose={() => setEditing(false)} onSaved={setProfile} />
        </>
    );
};

// MatchProfileCard shows the matching profile on the user's own profile page, with an edit button.
export const MatchProfileCard: React.FC = () => {
    const { t } = useTranslation();
    const { profile, setProfile } = useMatchProfile();
    const [editing, setEditing] = useState(false);
    if (!profile) return null;
    const levels = t("match.matchProfile.levels", { returnObjects: true }) as string[];

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">{t("match.matchProfile.title")}</h2>
                    <p className="text-sm text-gray-500">{t("match.matchProfile.subtitle")}</p>
                </div>
                <Badge tone={profile.completed >= profile.total ? "green" : "amber"}>{profile.completed}/{profile.total}</Badge>
            </div>
            <dl className="space-y-3 text-sm">
                <div>
                    <dt className="text-gray-500">{t("match.matchProfile.skills")}</dt>
                    <dd className="mt-1 flex flex-wrap gap-1.5">
                        {profile.skills.length > 0
                            ? profile.skills.map((s) => <Tag key={s.name}>{s.name} · {levels[s.level]}</Tag>)
                            : <span className="text-gray-400">{t("match.matchProfile.notSet")}</span>}
                    </dd>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <dt className="text-gray-500">{t("match.matchProfile.hours")}</dt>
                        <dd className="text-gray-900">{profile.hours_per_week || <span className="text-gray-400">{t("match.matchProfile.notSet")}</span>}</dd>
                    </div>
                    <div>
                        <dt className="text-gray-500">{t("match.matchProfile.timezone")}</dt>
                        <dd className="text-gray-900">{profile.timezone || <span className="text-gray-400">{t("match.matchProfile.notSet")}</span>}</dd>
                    </div>
                </div>
                <div>
                    <dt className="text-gray-500">{t("match.matchProfile.roles")}</dt>
                    <dd className="mt-1 flex flex-wrap gap-1.5">
                        {profile.desired_roles.length > 0
                            ? profile.desired_roles.map((r) => <Badge key={r} tone="indigo">{r}</Badge>)
                            : <span className="text-gray-400">{t("match.matchProfile.notSet")}</span>}
                    </dd>
                </div>
            </dl>
            <Button variant="secondary" className="mt-4" onClick={() => setEditing(true)}>{t("match.matchProfile.edit")}</Button>
            <MatchProfileEditor open={editing} profile={profile} onClose={() => setEditing(false)} onSaved={setProfile} />
        </div>
    );
};
