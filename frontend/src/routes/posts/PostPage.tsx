import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    HeartIcon as OutlineHeartIcon,
    BookmarkIcon as OutlineBookmarkIcon,
} from "@heroicons/react/24/outline";
import {
    HeartIcon as SolidHeartIcon,
    BookmarkIcon as SolidBookmarkIcon,
} from "@heroicons/react/24/solid";
import { formatDistanceToNow } from "date-fns";
import config from "../../config";
import fetchWithAuth from "../../hooks/fetchWithAuth";
import withAuth from "../../hooks/withAuth";
import SharePopup from "../../components/SharePopup";
import CommentSection from "../../components/CommentSection";
import { getDisplayName } from "../../utils/displayName";

// Simple loading component
const Loading: React.FC = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-purple-50 to-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
    </div>
);

const { API_BASE_URL, AWS_BASE_URL } = config;

interface Post {
    id: number;
    sid?: string;          // Different API responses use different property names
    short_id?: string;     // Include all possible variations
    ShortID?: string;
    shortId?: string;
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
    user: {
        id: number;
        username: string;
        name?: string;
        profile?: {
            avatar_url?: string;
            preferred_name?: string;
        };
    };
    profile?: {
        avatar_url?: string;
        preferred_name?: string;
    };
}

const PostPage: React.FC = () => {
    const { shortId } = useParams<{ shortId: string }>();
    const navigate = useNavigate();
    const [post, setPost] = useState<Post | null>(null);
    const [isLoved, setIsLoved] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [loveCount, setLoveCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPost = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetchWithAuth(`${API_BASE_URL}/api/content/post/${shortId}`);

                if (!response.ok) {
                    throw new Error("Failed to fetch post");
                }

                const data = await response.json();
                setPost(data);
                setIsLoved(data.is_loved || false);
                setIsSaved(data.is_saved || false);
                setLoveCount(data.likes_count || 0);
            } catch (error) {
                console.error("Error fetching post:", error);
                setError("We couldn't find the post you're looking for.");
            } finally {
                setLoading(false);
            }
        };

        if (shortId) {
            fetchPost();
        }
    }, [shortId]);

    const handleLove = async () => {
        if (!post) return;

        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/content/interactions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    entity_type: 2, // 2 = General Post
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
        } catch (error) {
            console.error("Error updating love status:", error);
        }
    };

    const handleSave = async () => {
        if (!post) return;

        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/content/interactions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    entity_type: 2, // 2 = General Post
                    entity_id: post.id,
                    type: 2, // 2 = Save
                }),
            });

            if (!response.ok) throw new Error('Failed to update save status');

            const data = await response.json();
            const newIsSaved = data.is_active !== undefined ? data.is_active : false;

            setIsSaved(newIsSaved);
        } catch (error) {
            console.error("Error updating save status:", error);
        }
    };

    if (loading) {
        return <Loading />;
    }

    if (error || !post) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-md p-8 max-w-md w-full text-center">
                    <div className="text-red-500 text-5xl mb-4">404</div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Post Not Found</h1>
                    <p className="text-gray-600 mb-6">{error || "We couldn't find the post you're looking for."}</p>
                    <button
                        onClick={() => navigate("/home")}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    // Get the unique post identifier, trying all possible property names
    const postId = post.sid || post.short_id || post.ShortID || post.shortId || post.id;
    const shareLink = `${window.location.origin}/post/${postId}`;

    return (
        <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white py-8">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center space-x-3 mb-4">
                            <img
                                src={post.profile?.avatar_url || 'https://via.placeholder.com/40'}
                                alt={getDisplayName({ ...post.profile, ...post.user })}
                                className="w-10 h-10 rounded-full border-2 border-purple-200"
                                onError={(e) => {
                                    e.currentTarget.src = 'https://via.placeholder.com/40';
                                }}
                            />
                            <div>
                                <p className="font-medium text-gray-800">
                                    {getDisplayName({ ...post.profile, ...post.user })}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                                </p>
                            </div>
                        </div>

                        <h1 className="text-2xl font-bold text-gray-900">{post.title}</h1>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {/* Media */}
                        {post.media && post.media.length > 0 && (
                            <div className="mb-6 flex justify-center">
                                <img
                                    src={post.media[0].url.startsWith('http') ? post.media[0].url : `${AWS_BASE_URL}${post.media[0].url}`}
                                    alt={post.title}
                                    className="rounded-lg object-contain max-w-full"
                                    style={{ maxHeight: '700px' }}
                                />
                            </div>
                        )}

                        {/* Content */}
                        <div className="prose max-w-none mb-6">
                            <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
                        </div>

                        {/* Tags */}
                        {post.tags && post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-6">
                                {post.tags.map((tag: string, index: number) => (
                                    <span
                                        key={index}
                                        className="bg-purple-50 text-purple-600 px-3 py-1 rounded-full text-sm"
                                    >
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Interactions - Moved here from header */}
                        <div className="flex items-center space-x-4 py-4 border-t border-b border-gray-200 mb-8">
                            <button
                                onClick={handleLove}
                                className={`flex items-center space-x-1 ${isLoved ? "text-pink-500" : "text-gray-500 hover:text-pink-500"}`}
                            >
                                {isLoved ? (
                                    <SolidHeartIcon className="w-6 h-6" />
                                ) : (
                                    <OutlineHeartIcon className="w-6 h-6" />
                                )}
                                <span>{loveCount}</span>
                            </button>

                            <button
                                onClick={handleSave}
                                className={`${isSaved ? "text-blue-500" : "text-gray-500 hover:text-blue-500"}`}
                            >
                                {isSaved ? (
                                    <SolidBookmarkIcon className="w-6 h-6" />
                                ) : (
                                    <OutlineBookmarkIcon className="w-6 h-6" />
                                )}
                            </button>

                            <SharePopup shareLink={shareLink} />
                        </div>

                        {/* Comments Section */}
                        <div className="mt-8">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Comments</h2>
                            <CommentSection
                                postId={post.id}
                                sourceType="post"
                                postAuthorId={Number(post.user_id || 0)}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default withAuth(PostPage); 