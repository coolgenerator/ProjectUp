import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { RootState } from "../../store/store";
import { RecommendedCandidates } from "../../components/match/Recommendations";
import RoleCards, { parseRoles } from "../../components/match/RoleCards";
import PostTeam from "../../components/match/PostTeam";
import ProjectBriefCard, { ProjectBrief } from "../../components/match/ProjectBriefCard";
import {
    HeartIcon as OutlineHeartIcon,
    BookmarkIcon as OutlineBookmarkIcon,
} from "@heroicons/react/24/outline";
import {
    HeartIcon as SolidHeartIcon,
    BookmarkIcon as SolidBookmarkIcon,
} from "@heroicons/react/24/solid";
import config from "../../config";
import UserProfileBubble from "../../components/UserProfileBubble";
import fetchWithAuth from "../../hooks/fetchWithAuth";
import withAuth from "../../hooks/withAuth";
import CommentSection from "../../components/CommentSection";
import SharePopup from "../../components/SharePopup";
import NotFound from "../login/NotFound";
import MediaCarousel from "../../components/MediaCarousel";
import { Alert, Badge, Button, Card, FadeIn, Skeleton } from "../../components/ui";
import { getUserProfile, getUserProfileById } from "../../services/userServices";
import { getDisplayName } from "../../utils/displayName";

const { API_BASE_URL, AWS_BASE_URL } = config;

const ProjectPostPage: React.FC = () => {
    const { shortId } = useParams<{ shortId: string }>();
    const { t, i18n } = useTranslation();
    const currentUserId = useSelector((state: RootState) => state.auth.user?.id);
    const [project, setProject] = useState<any>(null);
    const [roleFills, setRoleFills] = useState<Record<string, number>>({});
    const [brief, setBrief] = useState<ProjectBrief | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isBubbleOpen, setIsBubbleOpen] = useState(false);
    const [userProfile, setUserProfile] = useState<any>(null);
    const userProfileRef = useRef<HTMLDivElement>(null);
    const bubbleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Local interaction state
    const [isLoved, setIsLoved] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [loveCount, setLoveCount] = useState(0);

    useEffect(() => {
        if (shortId) {
            fetchProject();
        }
    }, [shortId]);

    useEffect(() => {
        if (project && project.user_id) {
            fetchUserProfile(project.user_id);

            // Update local interaction state from project data
            setIsLoved(project.is_loved || false);
            setIsSaved(project.is_saved || false);
            setLoveCount(project.love_count || 0);
        }
    }, [project]);

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

    const fetchProject = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/post/${shortId}`);
            if (!response.ok) {
                throw new Error("Failed to fetch project");
            }
            const data = await response.json();
            console.log(data);
            setProject(data.project_post);
            setRoleFills(data.role_fills || {});
            setBrief(data.brief || null);
        } catch (err) {
            setError("Failed to load project.");
        } finally {
            setLoading(false);
        }
    };

    const fetchUserProfile = async (userId: number) => {
        if (!userId) {
            console.error("No user_id found in project data");
            return;
        }

        try {
            console.log("Fetching user profile for ID:", userId);

            // First try the getUserProfileById method which uses a different endpoint
            try {
                const profileData = await getUserProfileById(userId);
                if (profileData) {
                    console.log("User profile data from getUserProfileById:", profileData);

                    // If we have avatar_url in profiles object, use it
                    if (profileData.profiles && profileData.profiles.avatar_url) {
                        setUserProfile({
                            ...profileData,
                            avatar_url: profileData.profiles.avatar_url,
                            username: profileData.username || profileData.profiles.preferred_name,
                            preferred_name: profileData.profiles.preferred_name
                        });
                        return;
                    } else if (profileData.avatar_url) {
                        setUserProfile(profileData);
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
                    setUserProfile(profileData);
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
                    setUserProfile(data.profile);
                    return;
                }
            } catch (error) {
                console.error("All profile fetching methods failed:", error);
            }
        } catch (error) {
            console.error("Failed to fetch user details after all attempts:", error);
        }
    };

    // Format avatar URL with AWS base URL if needed
    const getFormattedAvatarUrl = (url: string | null | undefined): string => {
        if (!url) return "/default-avatar.jpg";

        // If URL already contains http/https, use it as is
        if (url.startsWith('http')) return url;

        // Otherwise, prepend AWS base URL
        return `${AWS_BASE_URL}${url}`;
    };

    const handleLove = async () => {
        try {
            // Optimistically update UI
            const newIsLoved = !isLoved;
            const newLoveCount = newIsLoved ? loveCount + 1 : Math.max(0, loveCount - 1);

            setIsLoved(newIsLoved);
            setLoveCount(newLoveCount);

            // Make API call
            const response = await fetchWithAuth(`${API_BASE_URL}/api/content/interactions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    entity_type: 1, // 1 = Project Post
                    entity_id: project.post_id,
                    type: 1, // 1 = Like/Love
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update love status');
            }

            // Update with server response if needed
            const data = await response.json();
            if (data.is_active !== undefined && data.is_active !== newIsLoved) {
                // If server state differs from our optimistic update, correct it
                setIsLoved(data.is_active);
                setLoveCount(data.is_active ? loveCount + 1 : Math.max(0, loveCount - 1));
            }
        } catch (err) {
            console.error("Error updating love status:", err);
            // Revert on error
            setIsLoved(!isLoved);
            setLoveCount(isLoved ? loveCount + 1 : Math.max(0, loveCount - 1));
        }
    };

    const handleSave = async () => {
        try {
            // Optimistically update UI
            const newIsSaved = !isSaved;
            setIsSaved(newIsSaved);

            // Make API call
            const response = await fetchWithAuth(`${API_BASE_URL}/api/content/interactions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    entity_type: 1, // 1 = Project Post
                    entity_id: project.post_id,
                    type: 2, // 2 = Save
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update save status');
            }

            // Update with server response if needed
            const data = await response.json();
            if (data.is_active !== undefined && data.is_active !== newIsSaved) {
                // If server state differs from our optimistic update, correct it
                setIsSaved(data.is_active);
            }
        } catch (err) {
            console.error("Error updating save status:", err);
            // Revert on error
            setIsSaved(!isSaved);
        }
    };

    if (loading) {
        return (
            <div className="mx-auto max-w-4xl space-y-4 px-4 py-10">
                <Skeleton className="h-48" />
                <Skeleton className="h-64" />
            </div>
        );
    }
    if (error) return <div className="mx-auto max-w-4xl px-4 py-10"><Alert>{error}</Alert></div>;
    if (!project) return <NotFound />;

    // Use the current URL's shortId for both share link and apply button
    const shareLink = `${window.location.origin}/projectpost/${shortId}`;
    const isOwner = currentUserId !== undefined && project.user_id === currentUserId;
    const parseList = (value: unknown): any[] => {
        if (Array.isArray(value)) return value;
        if (typeof value === "string") {
            try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
        }
        return [];
    };
    const topics: string[] = parseList(project.topics ?? project.topic);
    const media = parseList(project.medias ?? project.media);
    // Workbench projects have no images; skip the media area instead of showing an empty box
    const hasMedia = Boolean(project.cover) || media.length > 0;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
                <FadeIn>
                <Card padded={false} className="overflow-hidden">
                {hasMedia && <MediaCarousel media={media} cover={project.cover} />}
                <div className="p-5 sm:p-6">
                {/* Founder */}
                <div className="mb-4 flex items-center">
                    <div
                        ref={userProfileRef}
                        className="relative inline-flex items-center cursor-pointer"
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                    >
                        {userProfile ? (
                            <>
                                <img
                                    src={getFormattedAvatarUrl(userProfile.avatar_url)}
                                    alt={getDisplayName(userProfile)}
                                    className="w-12 h-12 rounded-full border border-gray-300 mr-2 object-cover"
                                    onError={(e) => {
                                        e.currentTarget.src = "/default-avatar.jpg";
                                    }}
                                />
                                <span className="text-gray-800 font-medium">
                                    {getDisplayName(userProfile)}
                                </span>

                                {isBubbleOpen && (
                                    <div
                                        className="absolute left-0 top-12 z-50"
                                        onMouseEnter={handleMouseEnter}
                                        onMouseLeave={handleMouseLeave}
                                    >
                                        <UserProfileBubble userId={project.user_id} />
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex items-center">
                                <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse mr-2"></div>
                                <div className="h-4 bg-gray-200 animate-pulse w-24 rounded"></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Title, summary and the facts applicants scan for */}
                <div className="flex flex-wrap gap-1.5">
                    {topics.map((topic: string) => <Badge key={topic} tone="indigo">{topic}</Badge>)}
                </div>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{project.title}</h1>
                {project.description && <p className="mt-2 whitespace-pre-line text-gray-600">{project.description}</p>}
                <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                    {project.start_time && <span>{t("match.detail.started")}: {new Date(project.start_time).toLocaleDateString(i18n.language)}</span>}
                    {project.location && <span>{project.location}</span>}
                </p>

                {/* Social actions and apply */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleLove}
                            className="flex items-center gap-1.5 rounded-full p-2 text-sm text-gray-600 transition hover:bg-pink-50"
                            aria-label={isLoved ? "Unlike" : "Like"}
                        >
                            {isLoved ? <SolidHeartIcon className="h-5 w-5 text-pink-500" /> : <OutlineHeartIcon className="h-5 w-5 text-pink-500" />}
                            {loveCount > 0 && <span>{loveCount}</span>}
                        </button>
                        <button
                            onClick={handleSave}
                            className="rounded-full p-2 transition hover:bg-indigo-50"
                            aria-label={isSaved ? "Unsave" : "Save"}
                        >
                            {isSaved ? <SolidBookmarkIcon className="h-5 w-5 text-indigo-600" /> : <OutlineBookmarkIcon className="h-5 w-5 text-indigo-600" />}
                        </button>
                        <SharePopup shareLink={shareLink} />
                    </div>
                    {!isOwner && (
                        <Button size="lg" onClick={() => document.getElementById("roles")?.scrollIntoView({ behavior: "smooth" })}>
                            {t("match.roles.applyGeneral")}
                        </Button>
                    )}
                </div>
                </div>
                </Card>
                </FadeIn>

                {brief && <ProjectBriefCard brief={brief} />}

                {shortId && (
                    <div id="roles" className="scroll-mt-20">
                        <RoleCards postSid={shortId} roles={parseRoles(project.spots)} roleFills={roleFills} isOwner={isOwner} />
                    </div>
                )}

                {shortId && <PostTeam postSid={shortId} isOwner={isOwner} projectTitle={project.title} />}

                {isOwner && shortId && (
                    <div className="mt-6">
                        <RecommendedCandidates postSid={shortId} />
                    </div>
                )}

                {/* Comments Section */}
                <CommentSection postId={project.post_id} />
            </div>
        </div>
    );
};

export default withAuth(ProjectPostPage);
