import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Bookmark, Heart, MessageCircle, Pencil, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import config from "../../config";
import SharePopup from "../SharePopup";
import PostModal from "./PostModal";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { useNavigate } from "react-router-dom";
import { getDisplayName } from "../../utils/displayName";
import fetchWithAuth from "../../hooks/fetchWithAuth";
import { Alert, Badge, Button, Card, cx } from "../ui";
import { avatarSrc } from "../match/PostTeam";

const { AWS_BASE_URL, API_BASE_URL } = config;

interface HomePostCardProps {
    post: any;
    onLove: () => void;
    onSave: () => void;
    isLoved: boolean;
    isSaved: boolean;
    loveCount: number;
    showEditOptions?: boolean;
    onPostDeleted?: () => void;
}

const HomePostCard: React.FC<HomePostCardProps> = ({
    post,
    onLove,
    onSave,
    isLoved: initialIsLoved,
    isSaved: initialIsSaved,
    loveCount: initialLoveCount,
    showEditOptions = false,
    onPostDeleted
}) => {
    const { t, i18n } = useTranslation();
    // State to manage interactions locally
    const [isLoved, setIsLoved] = useState(initialIsLoved);
    const [isSaved, setIsSaved] = useState(initialIsSaved);
    const [currentLoveCount, setCurrentLoveCount] = useState(initialLoveCount);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    const navigate = useNavigate();
    const currentUserId = useSelector((state: RootState) => state.auth.user?.id);

    // The user_id can be in different places in the post object depending on the API response structure
    // Try different possible locations for the post's user ID
    const postUserId = post.user_id || (post.user && post.user.id) || 0;
    const isOwnPost = Number(currentUserId) === Number(postUserId);

    // Update state when props change
    React.useEffect(() => {
        setIsLoved(initialIsLoved);
        setIsSaved(initialIsSaved);
        setCurrentLoveCount(initialLoveCount);
    }, [initialIsLoved, initialIsSaved, initialLoveCount]);

    // Handlers for local interactions
    const handleLocalLove = () => {
        const newIsLoved = !isLoved;
        const newLoveCount = newIsLoved ? currentLoveCount + 1 : currentLoveCount - 1;

        // Update local state
        setIsLoved(newIsLoved);
        setCurrentLoveCount(newLoveCount);

        // Call parent handler
        onLove();
    };

    const handleLocalSave = () => {
        // Update local state
        setIsSaved(!isSaved);

        // Call parent handler
        onSave();
    };

    const handleModalInteractions = (newIsLoved: boolean, newIsSaved: boolean, newLoveCount: number) => {
        setIsLoved(newIsLoved);
        setIsSaved(newIsSaved);
        setCurrentLoveCount(newLoveCount);

        // Sync with parent if changes were made
        if (newIsLoved !== isLoved) {
            onLove();
        }

        if (newIsSaved !== isSaved) {
            onSave();
        }
    };

    const handleEdit = () => {
        // The post identifier should be the shortId (sid) to match the route definition in router.tsx
        const postShortId = post.sid || post.short_id || post.ShortID || post.shortId;
        navigate(`/edit-post/${postShortId || post.id}`);
    };

    const handleDelete = async () => {
        if (!window.confirm(t('home.postCard.deleteConfirmation'))) {
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
        } catch (error) {
            setDeleteError(t('home.postCard.deleteError'));
        } finally {
            setIsDeleting(false);
        }
    };

    // Get the unique post identifier, trying all possible property names
    const postId = post.sid || post.short_id || post.ShortID || post.shortId || post.id;
    const shareLink = `${window.location.origin}/post/${postId}`;

    // Modal handlers with proper event handling
    const openModal = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsModalOpen(true);
    }, []);

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
    }, []);

    const author = getDisplayName({ ...post.profile, ...post.user });
    const iconButton = "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors";

    return (
        <>
            <Card padded={false} className="overflow-hidden transition hover:border-indigo-200 hover:shadow-md">
                {post.media && Array.isArray(post.media) && post.media.length > 0 && (
                    <button onClick={openModal} className="block w-full bg-gray-50">
                        <img
                            src={post.media[0].url.startsWith('http') ? post.media[0].url : `${AWS_BASE_URL}${post.media[0].url}`}
                            alt={post.title}
                            className="w-full object-contain"
                            style={{ maxHeight: '420px' }}
                        />
                    </button>
                )}

                <div className="p-5 sm:p-6">
                    <div className="flex items-center gap-3">
                        <img
                            src={avatarSrc(post.profile?.avatar_url)}
                            alt={author}
                            className="h-9 w-9 rounded-full object-cover ring-1 ring-gray-200"
                            onError={(e) => {
                                e.currentTarget.src = '/default-avatar.jpg';
                            }}
                        />
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900">{author}</p>
                            <p className="text-xs text-gray-500">
                                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: i18n.language.startsWith('zh') ? zhCN : undefined })}
                            </p>
                        </div>
                    </div>

                    <button onClick={openModal} className="mt-4 block w-full text-left">
                        <h2 className="text-lg font-semibold text-gray-900 hover:text-indigo-700">{post.title}</h2>
                        {post.content ? (
                            <p className="mt-2 line-clamp-4 whitespace-pre-line text-sm leading-relaxed text-gray-600">{post.content}</p>
                        ) : (
                            <p className="mt-2 text-sm italic text-gray-400">{t('home.postCard.noContent')}</p>
                        )}
                    </button>

                    {post.tags && Array.isArray(post.tags) && post.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {post.tags.map((tag: string, index: number) => (
                                <Badge key={index} tone="indigo">#{tag}</Badge>
                            ))}
                        </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleLocalLove}
                                className={cx(iconButton, isLoved ? "bg-pink-50 text-pink-600" : "text-gray-500 hover:bg-gray-100")}
                                aria-label={isLoved ? t('home.postCard.unlike') : t('home.postCard.like')}
                                title={isLoved ? t('home.postCard.unlike') : t('home.postCard.like')}
                            >
                                <Heart className={cx("h-4 w-4", isLoved && "fill-current")} aria-hidden />
                                {currentLoveCount > 0 && <span className="font-medium">{currentLoveCount}</span>}
                            </button>
                            <button
                                onClick={openModal}
                                className={cx(iconButton, "text-gray-500 hover:bg-gray-100")}
                                aria-label={t('home.postCard.viewPost')}
                                title={t('home.postCard.viewPost')}
                            >
                                <MessageCircle className="h-4 w-4" aria-hidden />
                                {post.comments_count > 0 && <span className="font-medium">{post.comments_count}</span>}
                            </button>
                            <button
                                onClick={handleLocalSave}
                                className={cx(iconButton, isSaved ? "bg-indigo-50 text-indigo-600" : "text-gray-500 hover:bg-gray-100")}
                                aria-label={isSaved ? t('home.postCard.unsave') : t('home.postCard.save')}
                                title={isSaved ? t('home.postCard.unsave') : t('home.postCard.save')}
                            >
                                <Bookmark className={cx("h-4 w-4", isSaved && "fill-current")} aria-hidden />
                            </button>
                            <SharePopup shareLink={shareLink} subtle />
                        </div>

                        {showEditOptions && isOwnPost && (
                            <div className="flex items-center gap-2">
                                <Button variant="secondary" size="sm" icon={<Pencil className="h-3.5 w-3.5" />} onClick={handleEdit}>
                                    {t('home.postCard.edit')}
                                </Button>
                                <Button variant="danger" size="sm" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={handleDelete} loading={isDeleting}>
                                    {t('home.postCard.delete')}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {deleteError && <Alert className="m-4 mt-0">{deleteError}</Alert>}
            </Card>

            {isModalOpen && (
                <PostModal
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    post={post}
                    onInteractionUpdate={handleModalInteractions}
                    showEditOptions={showEditOptions && isOwnPost}
                    onPostDeleted={onPostDeleted}
                />
            )}
        </>
    );
};

export default HomePostCard; 