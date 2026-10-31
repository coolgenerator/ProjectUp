import React, { useState, useEffect, useRef } from "react";
import {
    HeartIcon as OutlineHeartIcon,
    BookmarkIcon as OutlineBookmarkIcon,
    XMarkIcon,
    PencilIcon,
    TrashIcon
} from "@heroicons/react/24/outline";
import {
    HeartIcon as SolidHeartIcon,
    BookmarkIcon as SolidBookmarkIcon,
} from "@heroicons/react/24/solid";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";
import config from "../../config";
import fetchWithAuth from "../../hooks/fetchWithAuth";
import SharePopup from "../SharePopup";
import CommentSection from "../CommentSection";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { getDisplayName, getPreferredOrFirstName } from "../../utils/displayName";
import UserProfileBubble from "../UserProfileBubble";

const { API_BASE_URL, AWS_BASE_URL } = config;

interface PostModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: any;
    onInteractionUpdate?: (isLoved: boolean, isSaved: boolean, loveCount: number) => void;
    showEditOptions?: boolean;
    onPostDeleted?: () => void;
}

const PostModal: React.FC<PostModalProps> = ({
    isOpen,
    onClose,
    post,
    onInteractionUpdate,
    showEditOptions = false,
    onPostDeleted
}) => {
    const { t } = useTranslation();
    const [isLoved, setIsLoved] = useState(post?.is_loved || false);
    const [isSaved, setIsSaved] = useState(post?.is_saved || false);
    const [loveCount, setLoveCount] = useState(post?.likes_count || 0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const [isBubbleOpen, setIsBubbleOpen] = useState(false);

    const modalRef = useRef<HTMLDivElement>(null);
    const userProfileRef = useRef<HTMLDivElement>(null);
    const bubbleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const navigate = useNavigate();
    const currentUserId = useSelector((state: RootState) => state.auth.user?.id);

    // The user_id can be in different places in the post object depending on the API response structure
    // Try different possible locations for the post's user ID
    const postUserId = post?.user_id || (post?.user && post.user.id) || 0;
    const isOwnPost = Number(currentUserId) === Number(postUserId);

    // Debug info
    console.log("PostModal rendered for post:", post?.id, "showEditOptions:", showEditOptions, "currentUserId:", currentUserId, "post.user_id:", post?.user_id, "isOwnPost:", isOwnPost);

    useEffect(() => {
        if (post) {
            setIsLoved(post.is_loved || false);
            setIsSaved(post.is_saved || false);
            setLoveCount(post.likes_count || 0);
        }
    }, [post]);

    // Effect to handle clicks outside modal
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        // Add event listener only if modal is open
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        // Clean up
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }

        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isOpen]);

    const handleLove = async () => {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/content/interactions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    entity_type: 2, // 2 = General Post (updated from 0)
                    entity_id: post.id,
                    type: 1, // 1 = Like/Love
                }),
            });

            if (!response.ok) throw new Error('Failed to update love status');

            const data = await response.json();
            const newIsLoved = data.is_active !== undefined ? data.is_active : false;
            const newLoveCount = newIsLoved ? loveCount + 1 : Math.max(0, loveCount - 1);

            setIsLoved(newIsLoved);
            setLoveCount(newLoveCount);

            if (onInteractionUpdate) {
                onInteractionUpdate(newIsLoved, isSaved, newLoveCount);
            }
        } catch (error) {
            console.error("Error updating love status:", error);
        }
    };

    const handleSave = async () => {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/content/interactions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    entity_type: 2, // 2 = General Post (updated from 0)
                    entity_id: post.id,
                    type: 2, // 2 = Save
                }),
            });

            if (!response.ok) throw new Error('Failed to update save status');

            const data = await response.json();
            const newIsSaved = data.is_active !== undefined ? data.is_active : false;

            setIsSaved(newIsSaved);

            if (onInteractionUpdate) {
                onInteractionUpdate(isLoved, newIsSaved, loveCount);
            }
        } catch (error) {
            console.error("Error updating save status:", error);
        }
    };

    const handleEdit = () => {
        // The post identifier should be the shortId (sid) to match the route definition in router.tsx
        const postShortId = post.sid || post.short_id || post.ShortID || post.shortId;
        onClose();
        navigate(`/edit-post/${postShortId || post.id}`);
    };

    const handleDelete = async () => {
        if (!window.confirm(t('posts.modal.deleteConfirmation'))) {
            return;
        }

        try {
            setIsDeleting(true);
            setDeleteError("");

            const response = await fetchWithAuth(`${API_BASE_URL}/api/home/posts/${post.id}`, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error("Failed to delete post");
            }

            if (onPostDeleted) {
                onPostDeleted();
            }
            onClose();
        } catch (error) {
            console.error("Error deleting post:", error);
            setDeleteError(t('posts.modal.deleteError'));
        } finally {
            setIsDeleting(false);
        }
    };

    // Mouse event handlers for profile bubble
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

    if (!isOpen || !post) return null;

    // Get the unique post identifier, trying all possible property names
    const postId = post.sid || post.short_id || post.ShortID || post.shortId || post.id;
    const shareLink = `${window.location.origin}/post/${postId}`;

    // Ensure we have a numeric user ID
    const authorId = Number(post.user_id || post.user?.id || 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-0 md:p-4">
            <div
                ref={modalRef}
                className="bg-white rounded-xl shadow-xl w-full md:w-auto max-w-[95vw] max-h-[100vh] md:max-h-[95vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
                style={{ minHeight: '80vh', width: '100%', maxWidth: '1200px' }}
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <div
                            ref={userProfileRef}
                            className="relative"
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                        >
                            <img
                                src={post.profile?.avatar_url || 'https://via.placeholder.com/40'}
                                alt={getDisplayName({ ...post.profile, ...post.user })}
                                title={getPreferredOrFirstName({ ...post.profile, ...post.user })}
                                className="w-12 h-12 rounded-full border-2 border-purple-200 cursor-pointer"
                                onError={(e) => {
                                    e.currentTarget.src = 'https://via.placeholder.com/40';
                                }}
                            />

                            {isBubbleOpen && authorId && (
                                <div
                                    className="absolute left-0 top-14 z-50"
                                    onMouseEnter={handleMouseEnter}
                                    onMouseLeave={handleMouseLeave}
                                >
                                    <UserProfileBubble userId={authorId} />
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="font-medium text-xl text-gray-800">
                                {getDisplayName({ ...post.profile, ...post.user })}
                            </p>
                            <p className="text-sm text-gray-500">
                                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        {showEditOptions && isOwnPost && (
                            <>
                                <button
                                    onClick={handleEdit}
                                    className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                                    title={t('posts.modal.editPost')}
                                >
                                    <PencilIcon className="w-6 h-6" />
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="p-2 rounded-full hover:bg-red-100 text-gray-500 hover:text-red-500"
                                    title={t('posts.modal.deletePost')}
                                    disabled={isDeleting}
                                >
                                    <TrashIcon className="w-6 h-6" />
                                </button>
                            </>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                            }}
                            className="p-2 rounded-full hover:bg-gray-100"
                        >
                            <XMarkIcon className="w-8 h-8 text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-6">{post.title}</h1>

                    {deleteError && (
                        <div className="p-4 mb-6 bg-red-50 text-red-600 text-sm border border-red-100 rounded-lg">
                            {deleteError}
                        </div>
                    )}

                    {/* Media */}
                    {post.media && post.media.length > 0 && (
                        <div className="mb-8 flex justify-center items-center">
                            <img
                                src={post.media[0].url.startsWith('http') ? post.media[0].url : `${AWS_BASE_URL}${post.media[0].url}`}
                                alt={post.title}
                                className="rounded-lg object-contain max-w-full"
                                style={{ maxHeight: '700px' }}
                            />
                        </div>
                    )}

                    {/* Content */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-gray-700 whitespace-pre-wrap text-lg">{post.content}</p>
                    </div>

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-8">
                            {post.tags.map((tag: string, index: number) => (
                                <span
                                    key={index}
                                    className="bg-purple-50 text-purple-600 px-4 py-2 rounded-full text-md border border-purple-100"
                                >
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Comments Section */}
                    <div className="mt-10 pt-8 border-t">
                        <CommentSection
                            postId={post.id}
                            sourceType="post"
                            postAuthorId={authorId}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-6">
                            <button
                                onClick={handleLove}
                                className={`flex items-center space-x-2 ${isLoved ? "text-pink-500" : "text-gray-500 hover:text-pink-500"
                                    }`}
                            >
                                {isLoved ? (
                                    <SolidHeartIcon className="w-8 h-8" />
                                ) : (
                                    <OutlineHeartIcon className="w-8 h-8" />
                                )}
                                <span className="text-lg">{loveCount}</span>
                            </button>

                            <button
                                onClick={handleSave}
                                className={`${isSaved ? "text-blue-500" : "text-gray-500 hover:text-blue-500"
                                    }`}
                            >
                                {isSaved ? (
                                    <SolidBookmarkIcon className="w-8 h-8" />
                                ) : (
                                    <OutlineBookmarkIcon className="w-8 h-8" />
                                )}
                            </button>

                            <SharePopup shareLink={shareLink} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PostModal; 