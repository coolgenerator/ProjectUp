import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import withAuth from "../../hooks/withAuth";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import config from "../../config";
import fetchWithAuth from "../../hooks/fetchWithAuth";
import HomePostCard from "../../components/home/HomePostCard";
import { Link } from "react-router-dom";

const { API_BASE_URL } = config;

// Post skeleton component for loading state
const PostSkeleton = ({ className = "" }: { className?: string }) => (
    <div className={`bg-white rounded-lg shadow-sm overflow-hidden animate-pulse skeleton-pulse ${className}`}>
        <div className="p-4">
            {/* User info skeleton */}
            <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="ml-3">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-3 bg-gray-100 rounded w-16 mt-1"></div>
                </div>
            </div>
            {/* Content skeleton */}
            <div className="space-y-2">
                <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-100 rounded w-full"></div>
                <div className="h-4 bg-gray-100 rounded w-5/6"></div>
                <div className="h-4 bg-gray-100 rounded w-4/6"></div>
            </div>
            {/* Media placeholder */}
            <div className="h-40 bg-gray-200 rounded-md my-4"></div>
            {/* Actions skeleton */}
            <div className="flex justify-between items-center pt-2">
                <div className="flex space-x-4">
                    <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                    <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                </div>
                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
            </div>
        </div>
    </div>
);

// Empty state component
const EmptyState = ({ t }: { t: any }) => (
    <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-md empty-state-container">
        <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <p className="text-gray-600 text-lg mb-2">{t('profile.myPosts.emptyState.title')}</p>
        <p className="text-gray-500 text-sm mb-4">{t('profile.myPosts.emptyState.description')}</p>
        <Link to="/create">
            <button className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-6 rounded-lg transition duration-200">
                {t('profile.myPosts.emptyState.createButton')}
            </button>
        </Link>
    </div>
);

// Error state component
const ErrorState = ({ message }: { message: string }) => (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md shadow-sm animate-fadeIn">
        <div className="flex">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{message}</span>
        </div>
    </div>
);

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
    sid: string;
    user_id: number;
    title: string;
    content: string;
    created_at: string;
    updated_at: string;
    tags: string[];
    media: { url: string; type: string }[];
    likes_count: number;
    comments_count: number;
    is_loved: boolean;
    is_saved: boolean;
    user: User;
}

const MyPosts: React.FC = () => {
    const { t } = useTranslation();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const userId = useSelector((state: RootState) => state.auth.user?.id);

    const fetchUserPosts = async (resetPage = false) => {
        setLoading(true);
        setError(null);

        try {
            const currentPage = resetPage ? 1 : page;
            const url = new URL(`${API_BASE_URL}/api/home/user-posts`);
            url.searchParams.append('page', currentPage.toString());
            url.searchParams.append('limit', '10');
            url.searchParams.append('user_id', userId?.toString() || '');

            const response = await fetchWithAuth(url.toString());

            if (!response.ok) {
                throw new Error('Failed to fetch posts');
            }

            const data = await response.json();

            // Safely extract posts and hasMore, handling potential different response structures
            let fetchedPosts = [];
            let newHasMore = false;

            if (data && typeof data === 'object') {
                // If data is a wrapped object with posts and hasMore properties
                if (Array.isArray(data.posts)) {
                    fetchedPosts = data.posts;
                    newHasMore = Boolean(data.hasMore);
                }
                // If data is an array directly
                else if (Array.isArray(data)) {
                    fetchedPosts = data;
                    newHasMore = fetchedPosts.length === 10; // Assume hasMore if we got full page
                }
            }

            // Reset posts if it's a new search or first page
            if (resetPage || currentPage === 1) {
                setPosts(fetchedPosts);
                setPage(1);
            } else {
                // Only add new posts that don't already exist
                setPosts(prev => {
                    const existingIds = new Set(prev.map(post => post.id));
                    const newPosts = fetchedPosts.filter((post: Post) => !existingIds.has(post.id));
                    return [...prev, ...newPosts];
                });
            }
            setHasMore(newHasMore);
        } catch (error) {
            setError(t('profile.myPosts.errors.fetchFailed'));
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
            fetchUserPosts(false);
        }
    }, [page]);

    // Initial load
    useEffect(() => {
        fetchUserPosts(true);
    }, [userId]);

    const handleLove = async (postId: number) => {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/content/interactions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    entity_type: 2, // 2 = General Post
                    entity_id: postId,
                    type: 1, // 1 = Like/Love
                }),
            });

            if (!response.ok) throw new Error('Failed to update love status');

            const data = await response.json();
            const isActive = data.is_active !== undefined ? data.is_active : false;

            setPosts(prevPosts => {
                return prevPosts.map(post => {
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
                    entity_type: 2, // 2 = General Post
                    entity_id: postId,
                    type: 2, // 2 = Save
                }),
            });

            if (!response.ok) throw new Error('Failed to update save status');

            const data = await response.json();
            const isActive = data.is_active !== undefined ? data.is_active : false;

            setPosts(prevPosts => {
                return prevPosts.map(post => {
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

    const handlePostDeleted = (postId: number) => {
        setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
    };

    // Loading state with skeleton UI
    if (loading && posts.length === 0) {
        return (
            <div className="bg-gradient-to-b from-purple-50 to-white min-h-screen">
                <div className="container mx-auto px-4 py-8">
                    <h1 className="text-3xl font-bold mb-8 text-center text-purple-800 animate-fadeIn">{t('profile.myPosts.title')}</h1>
                    <div className="max-w-6xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[...Array(6)].map((_, index) => (
                                <div
                                    key={index}
                                    style={{ animation: `fadeInUp 0.5s ease-out ${index * 0.05}s both` }}
                                >
                                    <PostSkeleton />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-b from-purple-50 to-white min-h-screen transition-all duration-500">
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-8 text-center text-purple-800 animate-fadeIn">{t('profile.myPosts.title')}</h1>

                {/* Posts Display Area */}
                <div>
                    {error ? (
                        <ErrorState message={error} />
                    ) : posts.length === 0 && !loading ? (
                        <EmptyState t={t} />
                    ) : (
                        <>
                            <div className="flex flex-col space-y-8">
                                {posts.map((post, index) => {
                                    return (
                                        <div
                                            key={post.id}
                                            className="transition-all duration-300 hover:shadow-md post-card w-full"
                                            style={{
                                                animation: `fadeInUp 0.5s ease-out ${index * 0.05}s both`
                                            }}
                                        >
                                            <HomePostCard
                                                post={post}
                                                onLove={() => handleLove(post.id)}
                                                onSave={() => handleSave(post.id)}
                                                isLoved={post.is_loved}
                                                isSaved={post.is_saved}
                                                loveCount={post.likes_count}
                                                showEditOptions={true}
                                                onPostDeleted={() => handlePostDeleted(post.id)}
                                            />
                                        </div>
                                    );
                                })}

                                {loading && posts.length > 0 && (
                                    <PostSkeleton />
                                )}
                            </div>

                            {/* Load More Button */}
                            {hasMore ? (
                                <div className="flex justify-center mt-12 mb-12">
                                    <button
                                        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-8 rounded-lg shadow-sm transition duration-200 flex items-center"
                                        onClick={loadMorePosts}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white loading-spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                {t('profile.myPosts.loading')}
                                            </>
                                        ) : (
                                            t('profile.myPosts.loadMore')
                                        )}
                                    </button>
                                </div>
                            ) : posts.length > 0 && (
                                <div className="flex justify-center mt-12 mb-12 animate-fadeIn">
                                    <p className="text-gray-500 text-sm italic bg-gray-50 py-2 px-4 rounded-full">
                                        {t('profile.myPosts.endMessage')}
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default withAuth(MyPosts); 