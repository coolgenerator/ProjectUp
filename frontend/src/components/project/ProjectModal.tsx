import React, { useState, useEffect, useRef } from "react";
import {
    HeartIcon as OutlineHeartIcon,
    BookmarkIcon as OutlineBookmarkIcon,
} from "@heroicons/react/24/outline";
import {
    HeartIcon as SolidHeartIcon,
    BookmarkIcon as SolidBookmarkIcon,
} from "@heroicons/react/24/solid";
import config from "../../config";
import fetchWithAuth from "../../hooks/fetchWithAuth";
import CommentSection from "../CommentSection";
import ProjectInfo from "./ProjectInfo";
import { getUserProfile, getUserProfileById } from "../../services/userServices";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import SharePopup from "../SharePopup";
import UserProfileBubble from "../UserProfileBubble";
import { useProjectInteractions } from "../../hooks/useProjectInteractions";
import { Position } from "../../types/project/positions";
import { getDisplayName, getPreferredOrFirstName } from "../../utils/displayName";

const { API_BASE_URL } = config;

type ProjectModalProps = {
    isOpen: boolean;
    onClose: () => void;
    projectPost: any;
    projectId?: string;
    onInteractionUpdate?: (isLoved: boolean, isSaved: boolean, loveCount: number) => void;
};

const ProjectModal: React.FC<ProjectModalProps> = ({
    isOpen,
    onClose,
    projectPost,
    onInteractionUpdate,
}) => {
    const userId = projectPost.user_id || projectPost.owner_id;
    const [userDetails, setUserDetails] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [isBubbleOpen, setIsBubbleOpen] = useState(false);
    const userProfileRef = useRef<HTMLDivElement>(null);
    const bubbleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Use the project interactions hook with the same project ID
    const { interactions, toggleLove, toggleSave } = useProjectInteractions(
        projectPost.post_id || projectPost.id,
        {
            isLoved: projectPost.isLoved !== undefined ? projectPost.isLoved : false,
            isSaved: projectPost.isSaved !== undefined ? projectPost.isSaved : false,
            loveCount: projectPost.loveCount !== undefined ? projectPost.loveCount : 0,
            saveCount: 0
        }
    );

    // Process positions/spots data to ensure consistent format
    const processPositionsData = (project: any): Position[] => {
        // If positions exists and is an array
        if (Array.isArray(project.positions) && project.positions.length > 0) {
            return project.positions.map((pos: any): Position => ({
                title: pos.title || pos.name,
                name: pos.name,
                description: pos.description || pos.responsibility,
                responsibility: pos.responsibility,
                spots: pos.spots || 1
            }));
        }

        // If spots is an array
        if (Array.isArray(project.spots) && project.spots.length > 0) {
            return project.spots.map((spot: any): Position => ({
                title: spot.title || spot.name,
                name: spot.name,
                description: spot.description || spot.responsibility,
                responsibility: spot.responsibility,
                spots: spot.spots || 1
            }));
        }

        // If spots is a string, try to parse it
        if (typeof project.spots === 'string') {
            try {
                const parsed = JSON.parse(project.spots);
                return Array.isArray(parsed) ? parsed.map((spot: any): Position => ({
                    title: spot.title || spot.name,
                    name: spot.name,
                    description: spot.description || spot.responsibility,
                    responsibility: spot.responsibility,
                    spots: spot.spots || 1
                })) : [];
            } catch (e) {
                return [];
            }
        }

        return [];
    };

    // Format project data for ProjectInfo component
    const projectData = {
        ...projectPost,
        // Ensure style is set from project_type for consistent display in ProjectInfo
        style: projectPost.project_type || projectPost.style,
        // Explicitly set project_type if it exists in the original data or can be derived from style
        project_type: projectPost.project_type ||
            (projectPost.style === "Personal Project" ? "Personal Project" :
                projectPost.style === "Research" ? "Research" :
                    projectPost.style === "School Work" ? "School Work" :
                        projectPost.style),
        // Process positions data
        spots: processPositionsData(projectPost)
    };

    // Handle love with hook
    const handleLove = async () => {
        await toggleLove();
        // Notify parent component about the interaction update
        if (onInteractionUpdate) {
            onInteractionUpdate(
                interactions.isLoved,
                interactions.isSaved,
                interactions.loveCount
            );
        }
    };

    // Handle save with hook
    const handleSave = async () => {
        await toggleSave();
        // Notify parent component about the interaction update
        if (onInteractionUpdate) {
            onInteractionUpdate(
                interactions.isLoved,
                interactions.isSaved,
                interactions.loveCount
            );
        }
    };

    const shareLink = `${window.location.origin}/projectpost/${projectPost.short_id || projectPost.sid}`;

    useEffect(() => {
        if (projectPost && userId) {
            fetchUserDetails();
        }
    }, [projectPost, userId]);

    const fetchUserDetails = async () => {
        if (!userId) {
            console.error("No user_id or owner_id found in project data");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            console.log("Fetching user profile for ID:", userId);

            // First try the getUserProfileById method which uses a different endpoint
            try {
                const profileData = await getUserProfileById(userId);
                if (profileData) {
                    console.log("User profile data from getUserProfileById:", profileData);

                    // If we have avatar_url in profiles object, use it
                    if (profileData.profiles && profileData.profiles.avatar_url) {
                        setUserDetails({
                            ...profileData,
                            avatar_url: profileData.profiles.avatar_url,
                            username: profileData.username || profileData.profiles.preferred_name,
                            preferred_name: profileData.profiles.preferred_name,
                            first_name: profileData.profiles.first_name || profileData.first_name,
                            last_name: profileData.profiles.last_name || profileData.last_name,
                            display_name_preference: profileData.profiles.display_name_preference ?? profileData.display_name_preference
                        });
                        return;
                    } else if (profileData.avatar_url) {
                        setUserDetails(profileData);
                        return;
                    }
                }
            } catch (error) {
                console.log("Failed to fetch user profile with getUserProfileById, trying alternatives", error);
            }

            // Try the regular getUserProfile method
            try {
                const profileData = await getUserProfile(userId);
                if (profileData) {
                    console.log("User profile data from getUserProfile:", profileData);
                    setUserDetails(profileData);
                    return;
                }
            } catch (error) {
                console.log("Failed to fetch user profile with getUserProfile, falling back to direct API call", error);
            }

            // Last resort: direct API call to a specific endpoint that returns avatar info
            try {
                const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/user-profile?id=${userId}`);
                if (!response.ok) {
                    throw new Error(`API call failed: ${response.statusText}`);
                }

                const data = await response.json();
                console.log("API response from projects/user-profile:", data);

                if (data && data.profile) {
                    setUserDetails(data.profile);
                    return;
                }
            } catch (error) {
                console.error("All profile fetching methods failed");
            }

            // Ultimate fallback - create a basic user profile from project data
            console.log("Using fallback with project data:", projectPost);
            const fallbackUserData = {
                id: userId,
                username: projectPost.owner_username || "User",
                preferred_name: projectPost.owner_name || projectPost.owner_username || "Unknown User",
                first_name: projectPost.owner_first_name || null,
                last_name: projectPost.owner_last_name || null,
                display_name_preference: projectPost.owner_display_name_preference,
                avatar_url: projectPost.owner_avatar || null
            };
            console.log("Fallback user data:", fallbackUserData);
            setUserDetails(fallbackUserData);
        } catch (error) {
            console.error("Failed to fetch user details");
        } finally {
            setLoading(false);
        }
    };

    // Profile hover functionality
    const handleMouseEnter = () => {
        // Clear any existing timeout
        if (bubbleTimeoutRef.current) {
            clearTimeout(bubbleTimeoutRef.current);
            bubbleTimeoutRef.current = null;
        }
        setIsBubbleOpen(true);
    };

    const handleMouseLeave = () => {
        // Add a delay before closing to allow moving to the bubble
        bubbleTimeoutRef.current = setTimeout(() => {
            setIsBubbleOpen(false);
        }, 200); // 200ms delay
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (bubbleTimeoutRef.current) {
                clearTimeout(bubbleTimeoutRef.current);
            }
        };
    }, []);

    // Close bubble when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userProfileRef.current && !userProfileRef.current.contains(event.target as Node)) {
                setIsBubbleOpen(false);
            }
        };

        if (isBubbleOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isBubbleOpen]);

    return (
        <>
            <div
                className={`fixed inset-0 z-50 overflow-y-auto ${isOpen ? "block" : "hidden"
                    }`}
            >
                <div className="flex items-center justify-center min-h-screen">
                    <div className="fixed inset-0 bg-black opacity-40" onClick={onClose}></div>
                    <div className="relative bg-white rounded-lg max-w-4xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto shadow-2xl">
                        {/* Close button */}
                        <button
                            className="absolute right-4 top-4 text-gray-600 hover:text-gray-900 z-10"
                            onClick={onClose}
                        >
                            <svg
                                className="h-6 w-6"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>

                        {/* Loading state */}
                        {loading ? (
                            <div className="flex justify-center items-center h-96">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                            </div>
                        ) : (
                            <div className="p-6">
                                {/* User info */}
                                <div className="flex items-center mb-6 gap-3 border-b pb-4">
                                    <div
                                        ref={userProfileRef}
                                        className="relative cursor-pointer"
                                        onMouseEnter={handleMouseEnter}
                                        onMouseLeave={handleMouseLeave}
                                    >
                                        <div
                                            className="w-12 h-12 rounded-full bg-cover bg-center"
                                            style={{
                                                backgroundImage: `url(${userDetails?.avatar_url || "/default-avatar.png"})`,
                                            }}
                                            title={getPreferredOrFirstName(userDetails)}
                                        ></div>

                                        {isBubbleOpen && userId && (
                                            <div
                                                className="absolute left-0 top-12 z-50"
                                                onMouseEnter={handleMouseEnter}
                                                onMouseLeave={handleMouseLeave}
                                            >
                                                <UserProfileBubble userId={Number(userId)} />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">
                                            {getDisplayName(userDetails)}
                                        </h3>
                                        {projectPost?.updated_at && (
                                            <p className="text-gray-500 text-sm">
                                                Updated {formatDistanceToNow(new Date(projectPost.updated_at), { addSuffix: true })}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Project info */}
                                <ProjectInfo
                                    project={projectData}
                                    showFullDetails={true}
                                    showActions={false}
                                />

                                {/* Social Actions */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-6 gap-3">
                                    <div className="flex gap-4">
                                        <button
                                            className={`p-2 rounded-full ${interactions.isLoved ? "bg-pink-100 text-pink-600" : "hover:bg-gray-100 text-gray-700"
                                                } transition-colors`}
                                            onClick={handleLove}
                                            aria-label={interactions.isLoved ? "Unlike" : "Like"}
                                            title={interactions.isLoved ? "Unlike" : "Like"}
                                        >
                                            {interactions.isLoved ? (
                                                <SolidHeartIcon className="w-5 h-5 text-pink-600" />
                                            ) : (
                                                <OutlineHeartIcon className="w-5 h-5 text-gray-700" />
                                            )}
                                            {interactions.loveCount > 0 && (
                                                <span className="sr-only">{interactions.loveCount}</span>
                                            )}
                                        </button>
                                        <button
                                            className={`p-2 rounded-full ${interactions.isSaved ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100 text-gray-700"
                                                } transition-colors`}
                                            onClick={handleSave}
                                            aria-label={interactions.isSaved ? "Unsave" : "Save"}
                                            title={interactions.isSaved ? "Unsave" : "Save"}
                                        >
                                            {interactions.isSaved ? (
                                                <SolidBookmarkIcon className="w-5 h-5 text-blue-600" />
                                            ) : (
                                                <OutlineBookmarkIcon className="w-5 h-5 text-gray-700" />
                                            )}
                                        </button>
                                        <SharePopup shareLink={shareLink} />
                                    </div>

                                    {projectData && projectData.short_id && (
                                        <Link
                                            to={`/project/${projectData.short_id}/apply`}
                                            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                                            </svg>
                                            Apply Now
                                        </Link>
                                    )}
                                </div>

                                {/* Comments section */}
                                <div className="mt-8 border-t pt-6">
                                    <CommentSection
                                        postId={projectPost.post_id || projectPost.id}
                                        sourceType="project"
                                        postAuthorId={Number(userId || 0)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default ProjectModal;
