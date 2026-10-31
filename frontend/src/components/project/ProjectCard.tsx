import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Calendar, MapPin, Settings } from "lucide-react";
import config from "../../config";
import { coverGradient } from "./ProjectPostCard";
import { Badge, Card, Tag, cx } from "../ui";

const { AWS_BASE_URL } = config;

interface ProjectCardProps {
    project: any;
}

// Check if user has management permissions (owner or admin)
const canManageProject = (userRole?: string): boolean => {
    return userRole === 'owner' || userRole === 'admin';
};

const topicsOf = (project: any): string[] => {
    if (Array.isArray(project.topics)) return project.topics;
    if (Array.isArray(project.topic)) return project.topic;
    if (typeof project.topic === 'string') {
        try {
            return JSON.parse(project.topic);
        } catch {
            return [];
        }
    }
    return [];
};

// ProjectCard is a project the user owns or joined, on My Projects.
const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [coverFailed, setCoverFailed] = useState(false);
    const topics = topicsOf(project);
    const open = () => navigate(`/project/${project.sid}/dashboard`);
    const cover = project.cover && !coverFailed ? (project.cover.startsWith('http') ? project.cover : `${AWS_BASE_URL}${project.cover}`) : null;

    const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString(i18n.language, { month: "short", day: "numeric" }) : "");
    const dates = [formatDate(project.start_time), formatDate(project.end_time)].filter(Boolean).join(" – ");

    // Only states worth noticing get a badge; an active, published project needs none
    const badges: { label: string; tone: "neutral" | "amber" | "blue" | "green" }[] = [];
    if (project.status === 2) badges.push({ label: t("match.projectCard.archived"), tone: "amber" });
    if (project.status === 3) badges.push({ label: t("match.projectCard.completed"), tone: "blue" });
    if (project.visibility === "private") badges.push({ label: t("match.projectCard.private"), tone: "neutral" });
    else if (!project.is_published) badges.push({ label: t("match.projectCard.draft"), tone: "neutral" });

    return (
        <Card padded={false} interactive={!project.is_removed} className={cx("flex h-full flex-col overflow-hidden", project.is_removed && "opacity-70")}>
            <button type="button" onClick={open} disabled={project.is_removed} className="block text-left disabled:cursor-default">
                <div className="relative h-32 overflow-hidden">
                    {cover ? (
                        <img src={cover} alt="" className="h-full w-full object-cover" onError={() => setCoverFailed(true)} />
                    ) : (
                        <div className={`flex h-full items-center justify-center bg-gradient-to-br ${coverGradient(project.title || "")}`}>
                            <span className="text-3xl font-bold text-white/90">{project.title?.charAt(0) || 'P'}</span>
                        </div>
                    )}
                    {badges.length > 0 && (
                        <div className="absolute left-3 top-3 flex gap-1.5">
                            {badges.map((b) => <Badge key={b.label} tone={b.tone} className="shadow-sm">{b.label}</Badge>)}
                        </div>
                    )}
                </div>
                <div className="p-4 pb-3">
                    <h2 className="line-clamp-1 text-base font-semibold text-gray-900">{project.title}</h2>
                    {project.description && <p className="mt-1 line-clamp-2 text-sm text-gray-600">{project.description}</p>}
                    {(dates || project.location) && (
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                            {dates && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" aria-hidden />{dates}</span>}
                            {project.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden />{project.location}</span>}
                        </div>
                    )}
                    {topics.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {topics.slice(0, 3).map((topic) => <Tag key={topic}>{topic}</Tag>)}
                            {topics.length > 3 && <Tag>+{topics.length - 3}</Tag>}
                        </div>
                    )}
                </div>
            </button>

            <div className="mt-auto flex items-center gap-2 border-t border-gray-100 px-4 py-2.5">
                {project.is_removed ? (
                    <span className="w-full text-center text-sm italic text-gray-500">{t("match.projectCard.removed")}</span>
                ) : (
                    <>
                        <span className="text-xs text-gray-500">
                            {project.user_role === 'owner' ? t("match.projectCard.owner") : t("match.projectCard.member")}
                        </span>
                        {canManageProject(project.user_role) && (
                            <button
                                onClick={() => navigate(`/project/${project.sid}/dashboard?section=settings`)}
                                className="ml-auto rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                                title={t("match.projectCard.manage")}
                                aria-label={t("match.projectCard.manage")}
                            >
                                <Settings className="h-4 w-4" />
                            </button>
                        )}
                        <button
                            data-tour="project-dashboard-button"
                            data-project-sid={project.sid}
                            onClick={open}
                            className={cx(
                                "flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50",
                                !canManageProject(project.user_role) && "ml-auto"
                            )}
                        >
                            {t("match.projectCard.open")}
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                        </button>
                    </>
                )}
            </div>
        </Card>
    );
};

export default ProjectCard;
