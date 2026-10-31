import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Calendar, FileText, Link2, MapPin, MessageCircle, Pencil, School, Shapes, Users } from "lucide-react";
import config from "../../config";
import fetchWithAuth from "../../hooks/fetchWithAuth";
import { ProjectDetails } from "../../types/project/projectDetails";
import { ProjectBrief } from "../match/ProjectBriefCard";
import ProjectBriefSection from "./ProjectBriefSection";
import { Badge, Button, Card, Input, Label, Select, Tag, TextArea } from "../ui";

const { AWS_BASE_URL } = config;

interface RecruitingRole {
    title: string;
    description?: string;
    skills?: string[];
    hours_per_week?: number;
    spots?: number;
    first_week?: string;
}

// The project API adds the brief, the recruiting post's roles (the one source
// of a project's roles) and, for the founder, the idea the project came from
export type DetailsProject = ProjectDetails & {
    brief?: ProjectBrief | null;
    recruiting?: { post_sid: string; status: number; roles: RecruitingRole[] | null; role_fills: Record<string, number> } | null;
    idea_draft_id?: number;
    brief_updated_at?: string | null;
};

interface ProjectDetailsPanelProps {
    project: DetailsProject;
    sid: string;
    isAdmin: boolean;
    onSaved: () => Promise<void> | void;
    onManagePosts: () => void;
}

const EDITABLE_FIELDS = ["name", "type", "otherType", "location", "startTime", "deadline", "communicationApp", "otherApp", "school", "class", "description"] as const;
type EditableField = typeof EDITABLE_FIELDS[number];
type Draft = Record<EditableField, string>;

const mediaUrl = (file: string | File) => (typeof file === "string" ? (file.startsWith("http") ? file : `${AWS_BASE_URL}${file}`) : URL.createObjectURL(file));

// Dates arrive as RFC 3339; date inputs want the local YYYY-MM-DD shown in view mode
const toDateInput = (value?: string) => {
    const date = value ? new Date(value) : null;
    if (!date || isNaN(date.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const Section: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <Card className={className}>
        <h3 className="mb-4 text-base font-semibold text-gray-900">{title}</h3>
        {children}
    </Card>
);

const Fact: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
    <div className="flex items-start gap-3">
        <span className="mt-0.5 text-gray-400 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
        <div className="min-w-0">
            <dt className="text-xs text-gray-500">{label}</dt>
            <dd className="mt-0.5 break-words text-sm text-gray-900">{children}</dd>
        </div>
    </div>
);

// ProjectDetailsPanel is the "Project details" tab: what the project is about
// (the workbench brief when there is one), its basics, and inline editing for admins.
const ProjectDetailsPanel: React.FC<ProjectDetailsPanelProps> = ({ project, sid, isAdmin, onSaved, onManagePosts }) => {
    const { t, i18n } = useTranslation();
    const [draft, setDraft] = useState<Draft | null>(null);
    const [saving, setSaving] = useState(false);
    const brief = project.brief || null;
    const roles = project.recruiting?.roles || [];
    const fills = project.recruiting?.role_fills || {};
    const topics: string[] = Array.isArray(project.topics) ? project.topics : Array.isArray(project.topic) ? project.topic : [];
    const cover = project.cover ? mediaUrl(project.cover) : null;
    const media = Array.isArray(project.media) ? project.media : [];

    const startEdit = () => {
        const next = {} as Draft;
        EDITABLE_FIELDS.forEach((field) => {
            const value = (project as any)[field];
            next[field] = field === "startTime" || field === "deadline" ? toDateInput(value) : value || "";
        });
        setDraft(next);
    };

    const save = async () => {
        if (!draft || saving) return;
        setSaving(true);
        try {
            const response = await fetchWithAuth(`/projects/${sid}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
            if (!response.ok) throw new Error();
            await onSaved();
            setDraft(null);
        } catch {
            alert(t("match.projectDetails.saveFailed"));
        } finally {
            setSaving(false);
        }
    };

    const changeStatus = async (value: string) => {
        const [visibility, published] = value.split("-");
        try {
            const response = await fetchWithAuth(`/projects/${sid}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ visibility: parseInt(visibility), isPublished: published === "1" }),
            });
            if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error);
            await onSaved();
        } catch (error) {
            alert(`${t("match.projectDetails.statusFailed")} ${error instanceof Error && error.message ? error.message : ""}`);
        }
    };

    const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString(i18n.language, { year: "numeric", month: "short", day: "numeric" }) : "");
    const dates = [formatDate(project.startTime), formatDate(project.deadline)].filter(Boolean).join(" – ");
    const facts = [
        { key: "type", icon: <Shapes />, value: project.otherType || project.type },
        { key: "location", icon: <MapPin />, value: project.location },
        { key: "dates", icon: <Calendar />, value: dates },
        { key: "communication", icon: <MessageCircle />, value: project.communicationApp },
        { key: "otherApps", icon: <Link2 />, value: project.otherApp },
        { key: "school", icon: <School />, value: [project.school, project.class].filter(Boolean).join(" · ") },
    ].filter((f) => f.value);
    // Workbench projects store vision + problem as the description; show it only when it says something else
    const showDescription = project.description && (!brief || !project.description.includes(brief.problem || "\u0000"));
    const set = (field: EditableField) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setDraft((d) => (d ? { ...d, [field]: e.target.value } : d));

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            {isAdmin && <div className="flex flex-wrap items-center justify-end gap-2">
                {isAdmin && !draft && (
                    <Select
                        value={`${project.visibility}-${project.isPublished ? "1" : "0"}`}
                        onChange={(e) => changeStatus(e.target.value)}
                        aria-label={t("match.projectDetails.status")}
                        className="mt-0 w-auto"
                    >
                        <option value="0-0">{t("projects.dashboard.visibility.private")}</option>
                        <option value="1-0">{t("projects.dashboard.visibility.public")} · {t("match.projectDetails.draft")}</option>
                        <option value="1-1">{t("projects.dashboard.visibility.public")} · {t("match.projectDetails.published")}</option>
                        <option value="2-0">{t("projects.dashboard.visibility.unlisted")} · {t("match.projectDetails.draft")}</option>
                        <option value="2-1">{t("projects.dashboard.visibility.unlisted")} · {t("match.projectDetails.published")}</option>
                    </Select>
                )}
                {isAdmin && (draft ? (
                    <>
                        <Button variant="ghost" onClick={() => setDraft(null)} disabled={saving}>{t("projects.dashboard.buttons.cancel")}</Button>
                        <Button onClick={save} loading={saving}>{t("projects.dashboard.buttons.saveChanges")}</Button>
                    </>
                ) : (
                    <>
                        <Button variant="secondary" icon={<FileText className="h-4 w-4" />} onClick={onManagePosts}>{t("projects.dashboard.buttons.managePosts")}</Button>
                        <Button variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={startEdit}>{t("projects.dashboard.buttons.editProject")}</Button>
                    </>
                ))}
            </div>}

            {/* Header */}
            <Card padded={false} className="overflow-hidden">
                {cover && <img src={cover} alt="" className="h-40 w-full object-cover sm:h-56" />}
                <div className="p-5 sm:p-6">
                    {draft ? (
                        <Label label={t("match.projectDetails.name")}>
                            <Input value={draft.name} onChange={set("name")} />
                        </Label>
                    ) : (
                        <>
                            <h2 className="text-2xl font-bold text-gray-900">{project.name || "Untitled Project"}</h2>
                            {brief?.one_liner && <p className="mt-1 text-gray-600">{brief.one_liner}</p>}
                        </>
                    )}
                    {topics.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {topics.map((topic) => <Tag key={topic}>{topic}</Tag>)}
                        </div>
                    )}
                </div>
            </Card>

            {/* What it's about, kept current by admins */}
            {!draft && (
                <ProjectBriefSection
                    sid={sid}
                    brief={brief}
                    briefUpdatedAt={project.brief_updated_at}
                    recruiting={project.recruiting?.status === 1}
                    isAdmin={isAdmin}
                    ideaDraftId={project.idea_draft_id}
                    onSaved={onSaved}
                />
            )}

            {/* Roles, from the recruiting post */}
            {project.recruiting && !draft && (
                <Card>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-base font-semibold text-gray-900">{t("match.projectDetails.roles")}</h3>
                        {isAdmin && (
                            <Button variant="ghost" size="sm" icon={<Pencil className="h-3.5 w-3.5" />} onClick={onManagePosts}>
                                {t("match.projectDetails.editRoles")}
                            </Button>
                        )}
                    </div>
                    {roles.length === 0 ? (
                        <p className="text-sm text-gray-500">{t("match.projectDetails.noRoles")}</p>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {roles.map((role) => {
                                const total = role.spots || 1;
                                const filled = Math.min(fills[role.title] || 0, total);
                                return (
                                    <div key={role.title} className="rounded-lg border border-gray-200 p-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="font-medium text-gray-900">{role.title}</p>
                                            <div className="flex shrink-0 gap-1.5">
                                                <Badge tone={filled >= total ? "green" : "amber"}><Users className="h-3 w-3" />{t("match.projectDetails.filled", { n: filled, total })}</Badge>
                                                {!!role.hours_per_week && <Badge tone="indigo">{t("match.projectDetails.hoursPerWeek", { n: role.hours_per_week })}</Badge>}
                                            </div>
                                        </div>
                                        {role.description && <p className="mt-1 text-sm text-gray-600">{role.description}</p>}
                                        {role.skills && role.skills.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1.5">{role.skills.map((s) => <Tag key={s}>{s}</Tag>)}</div>
                                        )}
                                        {role.first_week && (
                                            <p className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
                                                <span className="font-medium text-gray-700">{t("match.projectDetails.firstWeek")}</span> {role.first_week}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>
            )}

            {/* Basics */}
            <Section title={t("match.projectDetails.basics")}>
                {draft ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Label label={t("match.projectDetails.type")}>
                            <Select value={draft.type} onChange={set("type")}>
                                <option value="">—</option>
                                {[draft.type, "Idea", "Research", "School Work", "Personal Project", "Others"]
                                    .filter((v, i, all) => v && all.indexOf(v) === i)
                                    .map((v) => <option key={v} value={v}>{v}</option>)}
                            </Select>
                        </Label>
                        <Label label={t("match.projectDetails.location")}><Input value={draft.location} onChange={set("location")} placeholder="Remote" /></Label>
                        <Label label={t("match.projectDetails.start")}><Input type="date" value={draft.startTime} onChange={set("startTime")} /></Label>
                        <Label label={t("match.projectDetails.deadline")}><Input type="date" value={draft.deadline} onChange={set("deadline")} /></Label>
                        <Label label={t("match.projectDetails.communication")}><Input value={draft.communicationApp} onChange={set("communicationApp")} placeholder="WeChat, Slack, Discord…" /></Label>
                        <Label label={t("match.projectDetails.otherApps")}><Input value={draft.otherApp} onChange={set("otherApp")} placeholder="GitHub, Figma…" /></Label>
                        <Label label={t("match.projectDetails.school")}><Input value={draft.school} onChange={set("school")} /></Label>
                        <Label label={t("match.projectDetails.class")}><Input value={draft.class} onChange={set("class")} /></Label>
                        <Label label={t("match.projectDetails.description")} className="sm:col-span-2">
                            <TextArea value={draft.description} onChange={set("description")} rows={5} />
                        </Label>
                    </div>
                ) : (
                    <>
                        {facts.length > 0 ? (
                            <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                                {facts.map((f) => <Fact key={f.key} icon={f.icon} label={t(`match.projectDetails.${f.key}`)}>{f.value}</Fact>)}
                            </dl>
                        ) : (
                            <p className="text-sm text-gray-500">{t("match.projectDetails.noBasics")}</p>
                        )}
                        {showDescription && (
                            <div className="mt-5 border-t border-gray-100 pt-5">
                                <p className="text-xs text-gray-500">{t("match.projectDetails.description")}</p>
                                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-gray-900">{project.description}</p>
                            </div>
                        )}
                    </>
                )}
            </Section>

            {media.length > 0 && (
                <Section title={t("match.projectDetails.media")}>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                        {media.map((file, index) => (
                            <img key={index} src={mediaUrl(file)} alt="" className="aspect-square w-full rounded-lg object-cover ring-1 ring-gray-200" />
                        ))}
                    </div>
                </Section>
            )}
        </div>
    );
};

export default ProjectDetailsPanel;
