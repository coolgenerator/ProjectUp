import React, { useState } from "react";
import {
    HeartIcon as OutlineHeartIcon,
    BookmarkIcon as OutlineBookmarkIcon,
    EyeIcon,
    ClockIcon,
    MapPinIcon,
    TagIcon,
    UserGroupIcon,
} from "@heroicons/react/24/outline";
import {
    HeartIcon as SolidHeartIcon,
    BookmarkIcon as SolidBookmarkIcon,
} from "@heroicons/react/24/solid";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";
import config from "../../config";
import ProjectModal from "./ProjectModal";
import SharePopup from "../SharePopup";
import { useProjectInteractions } from "../../hooks/useProjectInteractions";

const { AWS_BASE_URL } = config;

// Projects without a cover get a gradient picked from the title, so cards stay distinguishable.
const COVER_GRADIENTS = [
    "from-violet-500 to-fuchsia-500",
    "from-sky-500 to-indigo-500",
    "from-emerald-500 to-teal-500",
    "from-amber-500 to-orange-500",
    "from-rose-500 to-pink-500",
    "from-cyan-500 to-blue-500",
];

const coverGradient = (seed: string) => {
    let hash = 0;
    for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
    return COVER_GRADIENTS[Math.abs(hash) % COVER_GRADIENTS.length];
};

interface ProjectCardProps {
    project: any;
    onLove?: () => void;  // Make callbacks optional
    onSave?: () => void;  // Make callbacks optional
    isLoved: boolean;
    isSaved: boolean;
    loveCount: number;
}

const ProjectPostCard: React.FC<ProjectCardProps> = ({
    project,
    onLove,
    onSave,
    isLoved: initialIsLoved,
    isSaved: initialIsSaved,
    loveCount: initialLoveCount,
}) => {
    // Use the project interactions hook
    const { interactions, toggleLove, toggleSave } = useProjectInteractions(
        project.post_id || project.id,
        {
            isLoved: initialIsLoved,
            isSaved: initialIsSaved,
            loveCount: initialLoveCount,
            saveCount: 0
        }
    );

    // Shared state for the modal
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const { t } = useTranslation();
    const [coverFailed, setCoverFailed] = useState(false);
    const [comments, setComments] = useState<{ [key: number]: string[] }>({});
    const [selectedProject, setSelectedProject] = useState<any>(null);
    const shareLink = `${window.location.origin}/projectpost/${project.short_id}`;

    // Parse positions/spots data if it exists
    const parsePositions = (project: any) => {
        if (!project.spots) return [];

        // If spots is a string, try to parse it as JSON
        if (typeof project.spots === 'string') {
            try {
                return JSON.parse(project.spots);
            } catch (e) {
                return [];
            }
        }

        // If spots is already an array, return it
        if (Array.isArray(project.spots)) {
            return project.spots;
        }

        return [];
    };

    // Format topics data to ensure consistency
    const formatTopics = (project: any) => {
        // If topics exists and is an array, use it
        if (Array.isArray(project.topics)) {
            return project.topics;
        }
        // If topic exists and is an array, use it
        else if (Array.isArray(project.topic)) {
            return project.topic;
        }
        // If topics is a JSON string, parse it
        else if (typeof project.topics === 'string') {
            try {
                return JSON.parse(project.topics);
            } catch (e) {
                return [];
            }
        }
        // If topic is a JSON string, parse it
        else if (typeof project.topic === 'string') {
            try {
                return JSON.parse(project.topic);
            } catch (e) {
                return [];
            }
        }
        // Default empty array
        return [];
    };

    // Handlers for interactions that call both the hook methods and the parent callbacks
    const handleLove = async () => {
        await toggleLove();
        if (onLove) onLove();
    };

    const handleSave = async () => {
        await toggleSave();
        if (onSave) onSave();
    };

    const openModal = (project: any) => {
        const projectToOpen = {
            ...project,
            imageUrl: project.cover,
            type: project.style,
            project_type: project.project_type ||
                (project.style === "Personal Project" ? "Personal Project" :
                    project.style === "Research" ? "Research" :
                        project.style === "School Work" ? "School Work" :
                            project.style),
            post_id: project.post_id || project.id,
            user_id: project.user_id || project.owner_id,
            cover: project.cover,
            positions: project.spots,
            spots: project.spots,
            start_time: project.start_time,
            deadline: project.deadline,
            updated_at: project.updated_at,
            timePeriod: `${project.start_time} - ${project.deadline}`,
            topics: formatTopics(project),
            topic: formatTopics(project),
            medias: project.medias || project.media || [],
            isLoved: interactions.isLoved,
            isSaved: interactions.isSaved,
            loveCount: interactions.loveCount
        };

        setSelectedProject(projectToOpen);
        setModalIsOpen(true);

        if (!comments[project.id]) {
            setComments({ ...comments, [project.id]: [] });
        }
    };

    const closeModal = () => {
        setModalIsOpen(false);
        setSelectedProject(null);
    };

    // Function to sync interactions from the modal
    const handleInteractionSync = () => {
        // This is called when the modal updates its interactions
        // We don't need to update our state since the hooks share the same state
        if (onLove) onLove();
        if (onSave) onSave();
    };

    // Format topics for display in the card
    const displayTopics = formatTopics(project);

    // Parse positions for display
    const positions = parsePositions(project);

    // Calculate total spots
    const totalSpots = positions.reduce((sum: number, pos: any) => sum + (Number(pos.spots) || 0), 0);

    // Recruiting progress from the list API: accepted applicants per role and team size
    const roleFills: Record<string, number> = project.role_fills || {};
    const spotsLeft = (position: any) => Math.max((Number(position.spots) || 1) - (roleFills[position.title] || 0), 0);
    const openSpots = positions.reduce((sum: number, pos: any) => sum + spotsLeft(pos), 0);
    const memberCount: number = project.member_count || 0;

    return (
        <>
            <div className="bg-white shadow-sm hover:shadow-lg rounded-lg overflow-hidden transition-all duration-300 relative border border-gray-100 flex flex-col h-full">
                {/* Cover Image Section */}
                <div className="relative w-full h-48 bg-gray-200 overflow-hidden">
                    {project.cover && !coverFailed ? (
                        <img
                            src={project.cover.startsWith('http') ? project.cover : `${AWS_BASE_URL}${project.cover}`}
                            alt={project.title}
                            onError={() => setCoverFailed(true)}
                            className="absolute top-0 left-0 w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                        />
                    ) : (
                        <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${coverGradient(project.title || "")}`}>
                            <span className="text-6xl font-bold text-white/90 drop-shadow-sm">
                                {(project.title || "P").trim().charAt(0).toUpperCase()}
                            </span>
                        </div>
                    )}

                    {/* Project Type Tag */}
                    <div className="absolute top-4 left-0 z-10">
                        {(project.project_type || project.style) && (
                            <div className={`relative pl-4 pr-6 py-1.5 text-xs font-medium tracking-wide uppercase shadow-md bg-gradient-to-r 
                                ${(project.project_type || project.style) === 'School Work' ? 'from-blue-600 to-blue-500' :
                                    (project.project_type || project.style) === 'Research' ? 'from-emerald-600 to-emerald-500' :
                                        (project.project_type || project.style) === 'Personal Project' ? 'from-amber-600 to-amber-500' :
                                            'from-gray-600 to-gray-500'} text-white`}>
                                {project.project_type || project.style}
                                <div className="absolute top-0 -right-3 w-3 h-full overflow-hidden">
                                    <div className={`absolute top-0 left-0 w-4 h-full transform -skew-x-20 
                                        ${(project.project_type || project.style) === 'School Work' ? 'bg-blue-500' :
                                            (project.project_type || project.style) === 'Research' ? 'bg-emerald-500' :
                                                (project.project_type || project.style) === 'Personal Project' ? 'bg-amber-500' :
                                                    'bg-gray-500'}`}></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Content Section */}
                <div className="flex-grow p-5">
                    {/* Title and Description (Introduction) */}
                    <div>
                        {/* Title */}
                        <h2 className="text-xl font-bold text-gray-800 mb-1 line-clamp-2 leading-tight">{project.title}</h2>

                        {/* Activity: when it was last updated and how many people already joined */}
                        <div className="mb-2 text-xs text-gray-500">
                            {project.updated_at && <>Updated {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })} · </>}
                            {memberCount > 0 ? t("match.cards.joined", { n: memberCount }) : t("match.cards.noneJoined")}
                        </div>

                        {/* Description */}
                        <div className="relative text-gray-600 text-sm mb-3 min-h-[1.5rem] max-h-[4.5rem]">
                            {project.description ? (
                                <>
                                    <p className="line-clamp-3">{project.description}</p>
                                    {project.description?.length > 150 && (
                                        <div className="absolute bottom-0 left-0 w-full h-6 bg-gradient-to-t from-white to-transparent"></div>
                                    )}
                                </>
                            ) : (
                                <p className="italic text-gray-400">No description provided</p>
                            )}
                        </div>
                    </div>

                    {/* Two-column layout for details and positions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        {/* Left column: Time period, Location, Topics */}
                        <div className="space-y-3">
                            {/* Time period */}
                            {(project.start_time || project.deadline) && (
                                <div className="flex items-start">
                                    <ClockIcon className="w-4 h-4 mt-0.5 mr-2 text-gray-400 flex-shrink-0" />
                                    <div className="text-xs text-gray-600">
                                        {project.start_time && (
                                            <span>From: {new Date(project.start_time).toLocaleDateString()}</span>
                                        )}
                                        {project.deadline && (
                                            <span className="block mt-0.5">To: {new Date(project.deadline).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Location */}
                            {project.location && (
                                <div className="flex items-center">
                                    <MapPinIcon className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                                    <span className="text-xs text-gray-600 truncate" title={project.location}>
                                        {project.location}
                                    </span>
                                </div>
                            )}

                            {/* Topics */}
                            {displayTopics.length > 0 && (
                                <div>
                                    <div className="flex items-center mb-1.5">
                                        <TagIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                                        <span className="font-medium text-gray-600 text-xs">Topics</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {displayTopics.slice(0, 3).map((t: string, index: number) => (
                                            <span
                                                key={index}
                                                className="inline-block bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-xs border border-blue-100"
                                            >
                                                {t}
                                            </span>
                                        ))}
                                        {displayTopics.length > 3 && (
                                            <span className="inline-block bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                                                +{displayTopics.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right column: Open Positions */}
                        {positions.length > 0 && (
                            <div className="md:border-l md:pl-4 flex flex-col justify-start">
                                <div className="flex items-start mb-2">
                                    <UserGroupIcon className="w-4 h-4 mt-0.5 mr-2 text-gray-400 flex-shrink-0" />
                                    <span className="font-medium text-gray-600 text-xs">
                                        {openSpots > 0 ? t("match.cards.open", { n: openSpots }) : t("match.cards.full")}
                                        {totalSpots > 0 && <span className="font-normal text-gray-400"> / {totalSpots}</span>}
                                    </span>
                                </div>
                                <div>
                                    {positions.slice(0, 3).map((position: any, index: number) => (
                                        <div key={index} className="mb-1.5 last:mb-0">
                                            <div className="flex items-center">
                                                <span className="font-medium text-xs text-gray-700">{position.title}</span>
                                                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs whitespace-nowrap ${spotsLeft(position) > 0 ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                                                    {spotsLeft(position) > 0 ? spotsLeft(position) : t("match.roles.full")}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Bar */}
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleLove}
                            className={`p-1.5 rounded-full ${interactions.isLoved ? "bg-pink-50 text-pink-600" : "hover:bg-gray-100 text-gray-500"} transition-colors flex items-center`}
                            aria-label={interactions.isLoved ? "Unlike" : "Like"}
                            title={interactions.isLoved ? "Unlike" : "Like"}
                        >
                            {interactions.isLoved ? (
                                <SolidHeartIcon className="h-5 w-5 text-pink-500" />
                            ) : (
                                <OutlineHeartIcon className="h-5 w-5" />
                            )}
                            {interactions.loveCount > 0 && (
                                <span className="text-xs ml-1.5 font-medium">{interactions.loveCount}</span>
                            )}
                        </button>

                        <button
                            onClick={handleSave}
                            className={`p-1.5 rounded-full ${interactions.isSaved ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100 text-gray-500"} transition-colors`}
                            aria-label={interactions.isSaved ? "Unsave" : "Save"}
                            title={interactions.isSaved ? "Unsave" : "Save"}
                        >
                            {interactions.isSaved ? (
                                <SolidBookmarkIcon className="h-5 w-5 text-blue-500" />
                            ) : (
                                <OutlineBookmarkIcon className="h-5 w-5" />
                            )}
                        </button>

                        <SharePopup shareLink={shareLink} />
                    </div>

                    <button
                        onClick={() => openModal(project)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center"
                    >
                        <EyeIcon className="h-4 w-4 mr-1.5" />
                        View Details
                    </button>
                </div>
            </div>

            {modalIsOpen && selectedProject && (
                <ProjectModal
                    isOpen={modalIsOpen}
                    onClose={closeModal}
                    projectPost={selectedProject}
                    projectId={selectedProject.project_id?.toString() || ''}
                    onInteractionUpdate={handleInteractionSync}
                />
            )}
        </>
    );
};

export default ProjectPostCard;


