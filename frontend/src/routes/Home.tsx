import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ImagePlus, Lightbulb, Plus, Search, Users, X } from "lucide-react";
import withAuth from "../hooks/withAuth";
import config from "../config";
import fetchWithAuth from "../hooks/fetchWithAuth";
import HomePostCard from "../components/home/HomePostCard";
import MatchTodo from "../components/match/MatchTodo";
import { Alert, Badge, Button, Card, Dialog, EmptyState, FadeIn, Input, Label, PAGE_WIDTH, PageHeader, Skeleton, TextArea, cx } from "../components/ui";

const { API_BASE_URL } = config;

interface User {
    id: number;
    username: string;
    preferred_name?: string;
    first_name?: string;
    last_name?: string;
    avatar?: string;
    name?: string;
    profile?: {
        avatar_url?: string;
        preferred_name?: string;
    };
}

interface Post {
    id: number;
    sid: string; // Corresponds to ShortID in backend
    user_id: number; // Corresponds to UserID in backend
    title: string;
    content: string;
    created_at: string;
    updated_at: string;
    tags: string[];
    media: MediaItem[];
    likes_count: number;
    comments_count: number;
    is_loved: boolean;
    is_saved: boolean;
    user: User;
}

interface MediaItem {
    url: string;
    type: string;
}

const MAX_TAGS = 10;

// HomePage is the signed-in home: what's waiting on you, then the community feed
// where people share lessons from building projects and teaming up.
const HomePage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [postContent, setPostContent] = useState("");
    const [postTitle, setPostTitle] = useState("");
    const [postTags, setPostTags] = useState<string[]>([]);
    const [currentTag, setCurrentTag] = useState("");
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createError, setCreateError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [mediaFiles, setMediaFiles] = useState<File[]>([]);

    // Search as the user types, once they pause
    useEffect(() => {
        const timer = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const fetchPosts = async (resetPage = false) => {
        setLoading(true);
        setError(null);

        try {
            const currentPage = resetPage ? 1 : page;
            const url = new URL(`${API_BASE_URL}/api/home/posts`);
            url.searchParams.append('page', currentPage.toString());
            url.searchParams.append('limit', '10');
            if (searchQuery) {
                url.searchParams.append('q', searchQuery);
            }

            const response = await fetchWithAuth(url.toString(), {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch posts');
            }

            const { posts: fetchedPosts, hasMore: newHasMore } = await response.json();
            const postsArray = Array.isArray(fetchedPosts) ? fetchedPosts : [];

            if (resetPage || currentPage === 1) {
                setPosts(postsArray);
                setPage(1);
            } else {
                // Only add new posts that don't already exist
                setPosts(prev => {
                    const existingIds = new Set(prev.map(post => post.id));
                    return [...prev, ...postsArray.filter((post: Post) => !existingIds.has(post.id))];
                });
            }
            setHasMore(newHasMore);
        } catch (error) {
            // Don't leave results from an earlier search under the error
            if (resetPage) setPosts([]);
            setError(t('home.errors.fetchFailed'));
        } finally {
            setLoading(false);
        }
    };

    const loadMorePosts = () => {
        if (!hasMore || loading) return;
        setPage(prev => prev + 1);
    };

    useEffect(() => {
        if (page > 1) {
            fetchPosts(false);
        }
    }, [page]);

    useEffect(() => {
        fetchPosts(true);
    }, [searchQuery]);

    const closeCreateDialog = () => {
        setShowCreateDialog(false);
        setCreateError(null);
    };

    const handleCreatePost = async () => {
        setCreating(true);
        setCreateError(null);
        try {
            const formData = new FormData();
            formData.append('title', postTitle.trim());
            formData.append('content', postContent.trim());
            formData.append('tags', JSON.stringify(postTags));
            formData.append('visibility', '2'); // Public
            mediaFiles.forEach(file => formData.append('media', file));

            const response = await fetchWithAuth(`${API_BASE_URL}/api/home/create-post`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error('Failed to create post');
            }

            setPostTitle("");
            setPostContent("");
            setPostTags([]);
            setCurrentTag("");
            setMediaFiles([]);
            closeCreateDialog();
            // The create response has no author details, so reload the first page instead of inserting it
            setSearchInput("");
            if (searchQuery) setSearchQuery("");
            else fetchPosts(true);
        } catch (error) {
            setCreateError(t('home.errors.createFailed'));
        } finally {
            setCreating(false);
        }
    };

    const handleAddTag = () => {
        const tag = currentTag.trim().replace(/^#/, "");
        if (!tag || postTags.includes(tag)) {
            setCurrentTag("");
            return;
        }
        if (postTags.length >= MAX_TAGS) {
            setCreateError(t('home.createPostDialog.maxTagsError'));
            return;
        }
        setPostTags(prev => [...prev, tag]);
        setCurrentTag("");
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setPostTags(postTags.filter(tag => tag !== tagToRemove));
    };

    const handleLove = async (postId: number) => {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/content/interactions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    entity_type: 2, // 2 = General Post (updated from 0)
                    entity_id: postId,
                    type: 1, // 1 = Like/Love
                }),
            });

            if (!response.ok) throw new Error('Failed to update love status');

            const data = await response.json();
            const isActive = data.is_active !== undefined ? data.is_active : false;

            setPosts(prevPosts => {
                const postsArray = Array.isArray(prevPosts) ? prevPosts : [];
                return postsArray.map(post => {
                    if (post.id === postId) {
                        return {
                            ...post,
                            is_loved: isActive,
                            likes_count: isActive
                                ? (post.likes_count || 0) + 1
                                : Math.max(0, (post.likes_count || 0) - 1)
                        };
                    }
                    return post;
                });
            });

        } catch (error) {
            console.error("Error updating love status:", error);
        }
    };

    const handleSave = async (postId: number) => {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/content/interactions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    entity_type: 2, // 2 = General Post (updated from 0)
                    entity_id: postId,
                    type: 2, // 2 = Save
                }),
            });

            if (!response.ok) throw new Error('Failed to update save status');

            const data = await response.json();
            const isActive = data.is_active !== undefined ? data.is_active : false;

            setPosts(prevPosts => {
                const postsArray = Array.isArray(prevPosts) ? prevPosts : [];
                return postsArray.map(post => {
                    if (post.id === postId) {
                        return {
                            ...post,
                            is_saved: isActive
                        };
                    }
                    return post;
                });
            });

        } catch (error) {
            console.error("Error updating save status:", error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className={cx(PAGE_WIDTH, "py-8 sm:py-10")}>
                <PageHeader
                    title={t('home.feed.title')}
                    subtitle={t('home.feed.subtitle')}
                    actions={
                        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreateDialog(true)}>
                            {t('home.createPost')}
                        </Button>
                    }
                />

                <MatchTodo compact />

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
                <div className="min-w-0">
                <div className="relative mb-6">
                    <Search className="pointer-events-none absolute left-3 top-1/2 mt-0.5 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
                    <Input
                        type="search"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder={t('home.feed.searchPlaceholder')}
                        aria-label={t('home.feed.searchPlaceholder')}
                        className="pl-9"
                    />
                </div>

                {error && <Alert className="mb-4">{error}</Alert>}

                {loading && posts.length === 0 ? (
                    <div className="space-y-4">
                        {[0, 1, 2].map(i => <Skeleton key={i} className="h-44" />)}
                    </div>
                ) : posts.length === 0 && !error ? (
                    searchQuery ? (
                        <EmptyState
                            icon={<Search className="h-5 w-5" />}
                            title={t('home.feed.noResults', { q: searchQuery })}
                            action={<Button variant="secondary" onClick={() => setSearchInput("")}>{t('home.feed.clearSearch')}</Button>}
                        />
                    ) : (
                        <EmptyState
                            icon={<Plus className="h-5 w-5" />}
                            title={t('home.feed.emptyTitle')}
                            description={t('home.feed.emptyDescription')}
                            action={<Button onClick={() => setShowCreateDialog(true)}>{t('home.createPost')}</Button>}
                        />
                    )
                ) : (
                    <>
                        <div className="space-y-4">
                            {posts.map((post, i) => (
                                <FadeIn key={post.id} delay={Math.min(i, 5) * 0.04}>
                                    <HomePostCard
                                        post={post}
                                        onLove={() => handleLove(post.id)}
                                        onSave={() => handleSave(post.id)}
                                        isLoved={post.is_loved}
                                        isSaved={post.is_saved}
                                        loveCount={post.likes_count}
                                    />
                                </FadeIn>
                            ))}
                        </div>

                        <div className="mt-8 flex justify-center">
                            {hasMore ? (
                                <Button variant="secondary" onClick={loadMorePosts} loading={loading}>
                                    {t('home.loadMore')}
                                </Button>
                            ) : (
                                <p className="text-sm text-gray-400">{t('home.noMorePosts')}</p>
                            )}
                        </div>
                    </>
                )}
                </div>

                <aside className="hidden space-y-4 lg:block">
                    <Card className="p-5 sm:p-5">
                        <Lightbulb className="h-5 w-5 text-amber-500" aria-hidden />
                        <p className="mt-2 font-semibold text-gray-900">{t('home.feed.ideaTitle')}</p>
                        <p className="mt-1 text-sm text-gray-500">{t('home.feed.ideaBody')}</p>
                        <Button size="sm" className="mt-3" onClick={() => navigate('/ideas')}>{t('home.feed.ideaAction')}</Button>
                    </Card>
                    <Card className="p-5 sm:p-5">
                        <Users className="h-5 w-5 text-indigo-600" aria-hidden />
                        <p className="mt-2 font-semibold text-gray-900">{t('home.feed.joinTitle')}</p>
                        <p className="mt-1 text-sm text-gray-500">{t('home.feed.joinBody')}</p>
                        <Button variant="secondary" size="sm" className="mt-3" onClick={() => navigate('/projects')}>{t('home.feed.joinAction')}</Button>
                    </Card>
                </aside>
                </div>
            </div>

            <Dialog
                open={showCreateDialog}
                onClose={closeCreateDialog}
                title={t('home.createPostDialog.title')}
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={closeCreateDialog}>{t('common.cancel')}</Button>
                        <Button onClick={handleCreatePost} loading={creating} disabled={!postTitle.trim() || !postContent.trim()}>
                            {creating ? t('home.createPostDialog.creating') : t('home.createPostDialog.createButton')}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <Label label={t('home.createPostDialog.titleLabel')}>
                        <Input
                            value={postTitle}
                            onChange={(e) => setPostTitle(e.target.value)}
                            placeholder={t('home.createPostDialog.titlePlaceholder')}
                            maxLength={255}
                        />
                    </Label>
                    <Label label={t('home.createPostDialog.contentLabel')}>
                        <TextArea
                            value={postContent}
                            onChange={(e) => setPostContent(e.target.value)}
                            placeholder={t('home.createPostDialog.contentPlaceholder')}
                            className="min-h-[140px]"
                        />
                    </Label>

                    <div>
                        <span className="block text-sm font-medium text-gray-700">{t('home.createPostDialog.mediaLabel')}</span>
                        <label
                            htmlFor="media-upload"
                            className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 transition hover:border-indigo-300 hover:text-indigo-700"
                        >
                            <ImagePlus className="h-4 w-4" aria-hidden />
                            {mediaFiles.length > 0
                                ? `${mediaFiles.length} ${t('home.createPostDialog.mediaSelected')}`
                                : t('home.createPostDialog.mediaPlaceholder')}
                        </label>
                        <input
                            id="media-upload"
                            type="file"
                            multiple
                            accept="image/*,video/*"
                            className="hidden"
                            onChange={(e) => e.target.files && setMediaFiles(Array.from(e.target.files))}
                        />
                        {mediaFiles.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {mediaFiles.map((file, index) => (
                                    <div key={index} className="relative">
                                        {file.type.startsWith('image/') ? (
                                            <img src={URL.createObjectURL(file)} alt="" className="h-16 w-16 rounded-lg object-cover" />
                                        ) : (
                                            <video src={URL.createObjectURL(file)} className="h-16 w-16 rounded-lg object-cover" />
                                        )}
                                        <button
                                            onClick={() => setMediaFiles(prev => prev.filter((_, i) => i !== index))}
                                            className="absolute -right-1.5 -top-1.5 rounded-full bg-gray-900 p-0.5 text-white"
                                            aria-label={t('common.remove', 'Remove')}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <Label label={t('home.createPostDialog.tagsLabel')} hint={`${postTags.length}/${MAX_TAGS}`}>
                            <div className="flex gap-2">
                                <Input
                                    value={currentTag}
                                    onChange={(e) => setCurrentTag(e.target.value)}
                                    onKeyDown={(e) => {
                                        // Enter while an IME is composing confirms the characters, not the tag
                                        if ((e.key === 'Enter' && !e.nativeEvent.isComposing) || e.key === ',') {
                                            e.preventDefault();
                                            handleAddTag();
                                        }
                                    }}
                                    placeholder={t('home.createPostDialog.tagsPlaceholder')}
                                />
                                <Button variant="secondary" className="mt-1" onClick={handleAddTag} disabled={!currentTag.trim()}>
                                    <Plus className="h-4 w-4" aria-label={t('home.createPostDialog.tagsLabel')} />
                                </Button>
                            </div>
                        </Label>
                        {postTags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {postTags.map(tag => (
                                    <Badge key={tag} tone="indigo">
                                        #{tag}
                                        <button onClick={() => handleRemoveTag(tag)} className="ml-0.5 text-indigo-400 hover:text-indigo-700" aria-label={t('common.remove', 'Remove')}>
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>

                    {createError && <Alert>{createError}</Alert>}
                </div>
            </Dialog>
        </div>
    );
};

export default withAuth(HomePage);
