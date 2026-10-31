import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowRight, Compass, Pencil, RefreshCw, Sparkles } from "lucide-react";
import { ProjectBrief } from "../match/ProjectBriefCard";
import { Alert, Button, Card, Label, TextArea, cx } from "../ui";
import { STALE_DAYS, briefAgeDays, linesOf, rewriteBriefField, saveBrief } from "./ProjectBriefSection";

type PlanField = "next_steps" | "blockers";

interface BriefPlanCardProps {
    sid: string;
    brief: ProjectBrief | null;
    briefUpdatedAt?: string | null;
    recruiting: boolean;
    isAdmin: boolean;
    onSaved: () => Promise<void> | void;
    onOpenDetails: () => void;
}

// BriefPlanCard puts the brief's two fast-moving parts, the next two weeks
// and the blockers, on the overview next to the weekly check-in, so the team
// sees the plan where it reports progress and admins update it in place.
const BriefPlanCard: React.FC<BriefPlanCardProps> = ({ sid, brief, briefUpdatedAt, recruiting, isAdmin, onSaved, onOpenDetails }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [form, setForm] = useState<Record<PlanField, string> | null>(null);
    const [saving, setSaving] = useState(false);
    const [rewriting, setRewriting] = useState<PlanField | null>(null);
    const [error, setError] = useState<string | null>(null);

    if (!brief) {
        if (!isAdmin) return null;
        return (
            <Card className="flex flex-col gap-3 border-dashed sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="font-semibold text-gray-900">{t("match.briefPlan.title")}</h3>
                    <p className="text-sm text-gray-500">{t("match.briefPlan.missing")}</p>
                </div>
                <Button variant="secondary" icon={<Sparkles className="h-4 w-4" />} onClick={() => navigate(`/ideas?project=${sid}`)}>
                    {t("match.projectBrief.write")}
                </Button>
            </Card>
        );
    }

    const nextSteps = brief.next_steps || [];
    const blockers = brief.blockers || [];
    const daysOld = briefAgeDays(briefUpdatedAt);
    const stale = recruiting && daysOld !== null && daysOld >= STALE_DAYS;
    const startEdit = () => setForm({ next_steps: nextSteps.join("\n"), blockers: blockers.join("\n") });

    const save = async () => {
        if (!form || saving) return;
        setSaving(true);
        setError(null);
        try {
            await saveBrief(sid, { next_steps: linesOf(form.next_steps), blockers: linesOf(form.blockers) });
            await onSaved();
            setForm(null);
        } catch (err) {
            setError(err instanceof Error && err.message ? err.message : t("match.projectBrief.saveFailed"));
        } finally {
            setSaving(false);
        }
    };

    const rewrite = async (field: PlanField) => {
        if (!form || rewriting) return;
        setRewriting(field);
        setError(null);
        try {
            const value = await rewriteBriefField(sid, field, { ...brief, next_steps: linesOf(form.next_steps), blockers: linesOf(form.blockers) });
            setForm((f) => (f ? { ...f, [field]: value } : f));
        } catch {
            setError(t("match.projectBrief.rewriteFailed"));
        } finally {
            setRewriting(null);
        }
    };

    return (
        <Card>
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                        <Compass className="h-4 w-4 text-indigo-600" aria-hidden />
                        {t("match.briefPlan.title")}
                    </h3>
                    <p className="text-sm text-gray-500">
                        {t("match.briefPlan.hint")}
                        {daysOld !== null && <> · {daysOld === 0 ? t("match.projectBrief.updatedToday") : t("match.projectBrief.updatedDaysAgo", { n: daysOld })}</>}
                    </p>
                </div>
                {isAdmin && !form && (
                    <Button variant="ghost" size="sm" icon={<Pencil className="h-3.5 w-3.5" />} onClick={startEdit}>
                        {t("match.briefPlan.update")}
                    </Button>
                )}
            </div>

            {stale && !form && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                        {t("match.projectBrief.stale", { n: daysOld })}
                    </span>
                    {isAdmin && (
                        <button className="font-medium underline-offset-2 hover:underline" onClick={startEdit}>
                            {t("match.projectBrief.updateNow")}
                        </button>
                    )}
                </div>
            )}

            {form ? (
                <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {(["next_steps", "blockers"] as const).map((field) => (
                            <Label
                                key={field}
                                hint={t("match.projectBrief.onePerLine")}
                                label={
                                    <span className="flex items-center justify-between gap-2">
                                        {t(`match.projectBrief.fields.${field}`)}
                                        <button
                                            type="button"
                                            onClick={() => rewrite(field)}
                                            disabled={rewriting !== null}
                                            className="flex items-center gap-1 text-xs font-normal text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                                        >
                                            <RefreshCw className={cx("h-3 w-3", rewriting === field && "animate-spin")} aria-hidden />
                                            {t("match.projectBrief.rewrite")}
                                        </button>
                                    </span>
                                }
                            >
                                <TextArea rows={4} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} className={cx(rewriting === field && "animate-pulse")} />
                            </Label>
                        ))}
                    </div>
                    <p className="text-xs text-gray-500">{t("match.projectBrief.rewriteHint")} {t("match.projectBrief.announceHint")}</p>
                    {error && <Alert>{error}</Alert>}
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setForm(null)} disabled={saving}>{t("projects.dashboard.buttons.cancel")}</Button>
                        <Button onClick={save} loading={saving} disabled={rewriting !== null}>{t("projects.dashboard.buttons.saveChanges")}</Button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 text-sm md:grid-cols-2">
                        <div>
                            <p className="text-xs font-medium text-gray-500">{t("match.detail.nextSteps")}</p>
                            {nextSteps.length > 0 ? (
                                <ol className="mt-1 list-decimal space-y-1 pl-5 text-gray-900">{nextSteps.map((s) => <li key={s}>{s}</li>)}</ol>
                            ) : (
                                <p className="mt-1 text-gray-400">{t("match.briefPlan.empty")}</p>
                            )}
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500">{t("match.detail.blockers")}</p>
                            {blockers.length > 0 ? (
                                <ul className="mt-1 list-disc space-y-1 pl-5 text-amber-800">{blockers.map((s) => <li key={s}>{s}</li>)}</ul>
                            ) : (
                                <p className="mt-1 text-gray-400">{t("match.briefPlan.noBlockers")}</p>
                            )}
                        </div>
                    </div>
                    <button onClick={onOpenDetails} className="mt-4 inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800">
                        {t("match.briefPlan.fullBrief")}
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </button>
                </>
            )}
        </Card>
    );
};

export default BriefPlanCard;
