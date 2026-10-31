import React from "react";
import { useNavigate } from "react-router-dom";
import { MapPinIcon, TagIcon, ClockIcon } from "@heroicons/react/24/outline";
import config from "../../config";
import { statusLabels, visibilityLabels } from "../../types/project/statusMappings";

const { AWS_BASE_URL } = config;

interface ProjectCardProps {
    project: any;
}

// Check if user has management permissions (owner or admin)
const canManageProject = (userRole?: string): boolean => {
    return userRole === 'owner' || userRole === 'admin';
};

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
    const navigate = useNavigate();

    // Format topics to handle different data structures
    const getTopics = () => {
        if (Array.isArray(project.topics)) {
            return project.topics;
        } else if (Array.isArray(project.topic)) {
            return project.topic;
        } else if (typeof project.topic === 'string') {
            try {
                return JSON.parse(project.topic);
            } catch (e) {
                return [];
            }
        }
        return [];
    };

    const topics = getTopics();
    const status = statusLabels[project.status] || { label: "Unknown", color: "bg-gray-100 text-gray-800" };
    const visibility = visibilityLabels[project.visibility?.toLowerCase()] || { label: "Unknown", color: "text-gray-700" };

    return (
        <div className="bg-white dark:bg-slate-800 shadow-md rounded-lg hover:shadow-lg transition-shadow overflow-hidden h-full flex flex-col border border-gray-200 dark:border-slate-700">
            {/* Header with cover image */}
            <div className="relative h-32 bg-gray-200 dark:bg-slate-700 overflow-hidden">
                {project.cover ? (
                    <img
                        src={project.cover.startsWith('http') ? project.cover : `${AWS_BASE_URL}${project.cover}`}
                        alt={project.title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full bg-gradient-to-r from-blue-500 to-indigo-600">
                        <span className="text-white text-xl font-bold">{project.title?.charAt(0) || 'P'}</span>
                    </div>
                )}

                {/* Project type badge */}
                <div className="absolute top-2 left-2">
                    <span className="px-2 py-1 text-xs font-medium bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 rounded-full shadow-sm">
                        {project.style || project.project_type || "Project"}
                    </span>
                </div>

                {/* Project status badge */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/30 backdrop-blur-sm py-1.5 px-3">
                    <div className="flex justify-between items-center gap-1 text-white text-xs">
                        <div>
                            <span className={`px-2 py-0.5 rounded-full ${status.color}`}>
                                {status.label}
                            </span>
                        </div>
                        <div>
                            {project.visibility === "private" ? (
                                <span className={`px-2 py-0.5 rounded-full text-gray-700 bg-gray-100`}>
                                    Private
                                </span>
                            ) : (
                                <span className={`px-2 py-0.5 rounded-full ${project.is_published ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                                    {`${visibility.label} ${project.is_published ? "(Published)" : "(Draft)"}`}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 flex-grow">
                <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-2 line-clamp-1">{project.title}</h2>

                <p className="text-gray-600 dark:text-slate-300 text-sm mb-3 line-clamp-2">
                    {project.description || "No description available."}
                </p>

                <div className="space-y-1.5 mb-3">
                    {/* Time period */}
                    <div className="flex items-start text-xs">
                        <ClockIcon className="w-3.5 h-3.5 mt-0.5 mr-1.5 text-gray-400 dark:text-slate-500 flex-shrink-0" />
                        <div className="text-gray-600 dark:text-slate-300">
                            {project.start_time && (
                                <span>From: {new Date(project.start_time).toLocaleDateString()}</span>
                            )}
                            {project.end_time && (
                                <span className="block">To: {new Date(project.end_time).toLocaleDateString()}</span>
                            )}
                        </div>
                    </div>

                    {/* Location */}
                    {project.location && (
                        <div className="flex items-center text-xs">
                            <MapPinIcon className="w-3.5 h-3.5 mr-1.5 text-gray-400 dark:text-slate-500 flex-shrink-0" />
                            <span className="text-gray-600 dark:text-slate-300 truncate" title={project.location}>
                                {project.location}
                            </span>
                        </div>
                    )}
                </div>

                {/* Topics */}
                {topics.length > 0 && (
                    <div className="mb-2">
                        <div className="flex items-center mb-1">
                            <TagIcon className="w-3.5 h-3.5 mr-1 text-gray-400 dark:text-slate-500" />
                            <span className="text-xs text-gray-500 dark:text-slate-400">Topics</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {topics.slice(0, 3).map((topic: string, index: number) => (
                                <span
                                    key={index}
                                    className="inline-block bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full text-xs border border-blue-100 dark:border-blue-800"
                                >
                                    {topic}
                                </span>
                            ))}
                            {topics.length > 3 && (
                                <span className="inline-block bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full text-xs">
                                    +{topics.length - 3}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Action buttons */}
            <div className="px-4 py-3 bg-gray-50 dark:bg-slate-700 border-t border-gray-100 dark:border-slate-600 mt-auto flex justify-between items-center">
                {project.is_removed ? (
                    /* Show message for removed members */
                    <div className="w-full text-center">
                        <span className="text-sm text-gray-500 dark:text-slate-400 italic">
                            You were removed from this project
                        </span>
                    </div>
                ) : (
                    /* Show buttons for active members */
                    <>
                        {canManageProject(project.user_role) && (
                            <button
                                onClick={() => navigate(`/project/${project.sid}/dashboard?section=settings`)}
                                className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded transition-colors"
                            >
                                Manage
                            </button>
                        )}
                        <button
                            data-tour="project-dashboard-button"
                            data-project-sid={project.sid}
                            onClick={() => navigate(`/project/${project.sid}/dashboard`)}
                            className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded transition-colors ml-auto"
                        >
                            Dashboard
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default ProjectCard;
