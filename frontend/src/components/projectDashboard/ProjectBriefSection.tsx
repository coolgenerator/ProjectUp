import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, History, Pencil, RefreshCw, Sparkles } from "lucide-react";
import fetchWithAuth from "../../hooks/fetchWithAuth";
import { ProjectBrief } from "../match/ProjectBriefCard";
import { Alert, Button, Card, Input, Label, TextArea, cx } from "../ui";

// A brief this many days old while recruiting is likely out of date
export const STALE_DAYS = 21;

// briefAgeDays is how many whole days ago the brief was last saved, or null
export const briefAgeDays = (updatedAt?: string | null) =>
    updatedAt ? Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86400000) : null;

// saveBrief saves some fields of a project's brief
export async function saveBrief(sid: string, patch: Partial<ProjectBrief>) {
    const response = await fetchWithAuth(`/api/match/projects/${sid}/brief`, { method: "PUT", body: JSON.stringify(patch) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
}

// rewriteBriefField asks AI to rewrite one field from the team's recent
// progress; brief carries the form's unsaved values. Lists come back one item per line.
export async function rewriteBriefField(sid: string, field: string, brief: Partial<ProjectBrief>) {
    const response = await fetchWithAuth(`/api/match/projects/${sid}/brief/regenerate`, { method: "POST", body: JSON.stringify({ field, brief }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return Array.isArray(data.value) ? data.value.join("\n") : String(data.value ?? "");
}

// linesOf splits a one-item-per-line text box into a list
export const linesOf = (text: string) => text.split("\n").map((s) => s.trim()).filter(Boolean);

type TextKey = "one_liner" | "vision" | "problem" | "target_users";
type ListKey = "next_steps" | "blockers";

interface FormState {
    one_liner: string;
    vision: string;
    problem: string;
    target_users: string;
    // Lists are edited one item per line
    next_steps: string;
    blockers: string;
}

const toForm = (brief: ProjectBrief | null): FormState => ({
    one_liner: brief?.one_liner || "",
    vision: brief?.vision || "",
    problem: brief?.problem || "",
    target_users: brief?.target_users || "",
    next_steps: (brief?.next_steps || []).join("\n"),
    blockers: (brief?.blockers || []).join("\n"),
});

const fromForm = (form: FormState) => ({
    one_liner: form.one_liner.trim(),
    vision: form.vision.trim(),
    problem: form.problem.trim(),
    target_users: form.target_users.trim(),
    next_steps: linesOf(form.next_steps),
    blockers: linesOf(form.blockers),
});

interface ProjectBriefSectionProps {
    sid: string;
    brief: ProjectBrief | null;
    briefUpdatedAt?: string | null;
    recruiting: boolean;
    isAdmin: boolean;
    ideaDraftId?: number;
    onSaved: () => Promise<void> | void;
}

// ProjectBriefSection shows the project's brief and lets admins keep it
// current: edit any field, or have AI rewrite one from the team's recent
// check-ins and decisions. Projects without a brief get a way to write one.
const ProjectBriefSection: React.FC<ProjectBriefSectionProps> = ({ sid, brief, briefUpdatedAt, recruiting, isAdmin, ideaDraftId, onSaved }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [form, setForm] = useState<FormState | null>(null);
    const [saving, setSaving] = useState(false);
    const [rewriting, setRewriting] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const daysOld = briefAgeDays(briefUpdatedAt);
    const stale = recruiting && daysOld !== null && daysOld >= STALE_DAYS;

    if (!brief) {
        if (!isAdmin) return null;
        return (
            <Card className="border-dashed">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-gray-900">{t("match.projectBrief.missingTitle")}</h3>
                        <p className="mt-1 text-sm text-gray-600">{t("match.projectBrief.missingHint")}</p>
                    </div>
                    <Button icon={<Sparkles className="h-4 w-4" />} onClick={() => navigate(`/ideas?project=${sid}`)}>
                        {t("match.projectBrief.write")}
                    </Button>
                </div>
            </Card>
        );
    }

    const save = async () => {
        if (!form || saving) return;
        setSaving(true);
        setError(null);
        try {
            await saveBrief(sid, fromForm(form));
            await onSaved();
            setForm(null);
        } catch (err) {
            setError(err instanceof Error && err.message ? err.message : t("match.projectBrief.saveFailed"));
        } finally {
            setSaving(false);
        }
    };

    const rewrite = async (field: TextKey | ListKey) => {
        if (!form || rewriting) return;
        setRewriting(field);
        setError(null);
        try {
            const value = await rewriteBriefField(sid, field, { ...brief, ...fromForm(form) });
            setForm((f) => (f ? { ...f, [field]: value } : f));
        } catch {
            setError(t("match.projectBrief.rewriteFailed"));
        } finally {
            setRewriting(null);
        }
    };

    const field = (key: TextKey | ListKey, multiline: boolean, rows = 3) => (
        <Label
            label={
                <span className="flex items-center justify-between gap-2">
                    {t(`match.projectBrief.fields.${key}`)}
                    <button
                        type="button"
                        onClick={() => rewrite(key)}
                        disabled={rewriting !== null}
                        className="flex items-center gap-1 text-xs font-normal text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                    >
                        <RefreshCw className={cx("h-3 w-3", rewriting === key && "animate-spin")} aria-hidden />
                        {t("match.projectBrief.rewrite")}
                    </button>
                </span>
            }
            hint={key === "next_steps" || key === "blockers" ? t("match.projectBrief.onePerLine") : undefined}
        >
            {multiline ? (
                <TextArea rows={rows} value={form![key]} onChange={(e) => setForm({ ...form!, [key]: e.target.value })} className={cx(rewriting === key && "animate-pulse")} />
            ) : (
                <Input value={form![key]} onChange={(e) => setForm({ ...form!, [key]: e.target.value })} className={cx(rewriting === key && "animate-pulse")} />
            )}
        </Label>
    );

    return (
        <Card>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h3 className="text-base font-semibold text-gray-900">{t("match.detail.about")}</h3>
                    {daysOld !== null && !form && (
                        <p className="mt-0.5 text-xs text-gray-400">{daysOld === 0 ? t("match.projectBrief.updatedToday") : t("match.projectBrief.updatedDaysAgo", { n: daysOld })}</p>
                    )}
                </div>
                {isAdmin && !form && (
                    <Button variant="ghost" size="sm" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setForm(toForm(brief))}>
                        {t("match.projectBrief.edit")}
                    </Button>
                )}
            </div>

            {stale && !form && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                        {t("match.projectBrief.stale", { n: daysOld })}
                    </span>
                    {isAdmin && (
                        <button className="font-medium underline-offset-2 hover:underline" onClick={() => setForm(toForm(brief))}>
                            {t("match.projectBrief.updateNow")}
                        </button>
                    )}
                </div>
            )}

            {form ? (
                <div className="space-y-4">
                    <p className="text-xs text-gray-500">{t("match.projectBrief.rewriteHint")}</p>
                    {field("one_liner", false)}
                    {field("vision", true, 2)}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {field("problem", true)}
                        {field("target_users", true)}
                        {field("next_steps", true, 4)}
                        {field("blockers", true, 4)}
                    </div>
                    <p className="text-xs text-gray-500">{t("match.projectBrief.announceHint")}</p>
                    {error && <Alert>{error}</Alert>}
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setForm(null)} disabled={saving}>{t("projects.dashboard.buttons.cancel")}</Button>
                        <Button onClick={save} loading={saving} disabled={rewriting !== null}>{t("projects.dashboard.buttons.saveChanges")}</Button>
                    </div>
                </div>
            ) : (
                <>
                    <dl className="grid grid-cols-1 gap-x-8 gap-y-5 text-sm md:grid-cols-2">
                        {brief.vision && (
                            <div className="md:col-span-2">
                                <dt className="text-xs font-medium text-gray-500">{t("match.projectDetails.vision")}</dt>
                                <dd className="mt-1 text-gray-900">{brief.vision}</dd>
                            </div>
                        )}
                        {brief.problem && (
                            <div>
                                <dt className="text-xs font-medium text-gray-500">{t("match.detail.problem")}</dt>
                                <dd className="mt-1 text-gray-900">{brief.problem}</dd>
                            </div>
                        )}
                        {brief.target_users && (
                            <div>
                                <dt className="text-xs font-medium text-gray-500">{t("match.detail.targetUsers")}</dt>
                                <dd className="mt-1 text-gray-900">{brief.target_users}</dd>
                            </div>
                        )}
                        {brief.next_steps && brief.next_steps.length > 0 && (
                            <div>
                                <dt className="text-xs font-medium text-gray-500">{t("match.detail.nextSteps")}</dt>
                                <dd className="mt-1"><ol className="list-decimal space-y-1 pl-5 text-gray-900">{brief.next_steps.map((s) => <li key={s}>{s}</li>)}</ol></dd>
                            </div>
                        )}
                        {brief.blockers && brief.blockers.length > 0 && (
                            <div>
                                <dt className="text-xs font-medium text-gray-500">{t("match.detail.blockers")}</dt>
                                <dd className="mt-1"><ul className="list-disc space-y-1 pl-5 text-gray-900">{brief.blockers.map((s) => <li key={s}>{s}</li>)}</ul></dd>
                            </div>
                        )}
                    </dl>
                    {ideaDraftId && (
                        <Link to={`/ideas?draft=${ideaDraftId}`} className="mt-5 inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800">
                            <History className="h-4 w-4" aria-hidden />
                            {t("match.projectDetails.originalIdea")}
                        </Link>
                    )}
                </>
            )}
        </Card>
    );
};

export default ProjectBriefSection;
