import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import withAuth from "../../hooks/withAuth";
import fetchWithAuth from "../../hooks/fetchWithAuth";
import config from "../../config";
import { RootState } from "../../store/store";
import Loading from "../../components/app/Loading";

const { API_BASE_URL, AWS_BASE_URL } = config;

const EditPost: React.FC = () => {
    const { shortId } = useParams<{ shortId: string }>();
    const navigate = useNavigate();
    const userId = useSelector((state: RootState) => state.auth.user?.id);

    const [post, setPost] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState("");
    const [media, setMedia] = useState<any[]>([]);
    const [newMedia, setNewMedia] = useState<File[]>([]);

    // Fetch post data
    useEffect(() => {
        const fetchPost = async () => {
            try {
                setLoading(true);
                setError(null);

                // First, try to get the post by shortId to verify ownership
                const response = await fetchWithAuth(`${API_BASE_URL}/api/content/post/${shortId}`);

                if (!response.ok) {
                    throw new Error("Failed to fetch post");
                }

                const postData = await response.json();

                // Check if the current user is the post owner
                if (Number(postData.user_id) !== Number(userId)) {
                    navigate("/");
                    return;
                }

                setPost(postData);
                setTitle(postData.title || "");
                setContent(postData.content || "");
                setTags(postData.tags || []);
                setMedia(postData.media || []);

            } catch (error) {
                console.error("Error fetching post:", error);
                setError("Failed to load post. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        if (shortId && userId) {
            fetchPost();
        }
    }, [shortId, userId, navigate]);

    const handleTagAdd = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim()]);
            setTagInput("");
        }
    };

    const handleTagRemove = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const fileArray = Array.from(e.target.files);
            setNewMedia(fileArray);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) {
            setError("Title is required");
            return;
        }

        try {
            setSubmitting(true);
            setError(null);

            const formData = new FormData();
            formData.append("title", title);
            formData.append("content", content);
            formData.append("tags", JSON.stringify(tags));

            // Add any new media files
            newMedia.forEach(file => {
                formData.append("media", file);
            });

            // Use the post's numeric ID for the update request, not the shortId
            if (!post || !post.id) {
                throw new Error("Post ID not found");
            }

            const response = await fetchWithAuth(`${API_BASE_URL}/api/content/post/${shortId}`, {
                method: "PUT",
                body: formData,
            });

            if (!response.ok) {
                // Try to get more details about the error
                const errorText = await response.text();
                console.error("API error response:", {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText
                });
                throw new Error("Failed to update post");
            }

            // Navigate back to the post after successful update
            navigate("/my-posts");

        } catch (error) {
            console.error("Error updating post:", error);
            setError("Failed to update post. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <Loading />;
    }

    if (error && !post) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-3xl mx-auto bg-red-50 text-red-600 p-4 rounded-lg">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-b from-purple-50 to-white min-h-screen py-8">
            <div className="container mx-auto px-4">
                <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-6 md:p-8">
                    <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">Edit Post</h1>

                    {error && (
                        <div className="mb-6 bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {/* Title */}
                        <div className="mb-6">
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                                Title
                            </label>
                            <input
                                type="text"
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="Post title"
                                required
                            />
                        </div>

                        {/* Content */}
                        <div className="mb-6">
                            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                                Content
                            </label>
                            <textarea
                                id="content"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[200px]"
                                placeholder="Write your post content here..."
                            />
                        </div>

                        {/* Tags */}
                        <div className="mb-6">
                            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                                Tags
                            </label>
                            <div className="flex items-center">
                                <input
                                    type="text"
                                    id="tags"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleTagAdd())}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="Add a tag (press Enter to add)"
                                />
                                <button
                                    type="button"
                                    onClick={handleTagAdd}
                                    className="ml-2 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
                                >
                                    Add
                                </button>
                            </div>
                            {tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {tags.map((tag, index) => (
                                        <div key={index} className="bg-purple-50 text-purple-600 px-3 py-1 rounded-full text-sm flex items-center">
                                            #{tag}
                                            <button
                                                type="button"
                                                onClick={() => handleTagRemove(tag)}
                                                className="ml-2 text-purple-400 hover:text-purple-600"
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Current Media */}
                        {media.length > 0 && (
                            <div className="mb-6">
                                <h3 className="block text-sm font-medium text-gray-700 mb-1">
                                    Current Media
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {media.map((item, index) => (
                                        <div key={index} className="bg-gray-100 p-3 rounded flex items-center justify-center">
                                            {item.type === 'image' && (
                                                <img
                                                    src={item.url.startsWith('http') ? item.url : `${AWS_BASE_URL}${item.url}`}
                                                    alt={`Media ${index}`}
                                                    className="max-w-full max-h-60 object-contain rounded"
                                                />
                                            )}
                                            {item.type === 'video' && (
                                                <video
                                                    src={item.url.startsWith('http') ? item.url : `${AWS_BASE_URL}${item.url}`}
                                                    controls
                                                    className="max-w-full max-h-60 object-contain rounded"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* New Media */}
                        <div className="mb-6">
                            <label htmlFor="media" className="block text-sm font-medium text-gray-700 mb-1">
                                Add New Media (optional)
                            </label>
                            <input
                                type="file"
                                id="media"
                                onChange={handleMediaChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                accept="image/*,video/*"
                                multiple
                            />
                            {newMedia.length > 0 && (
                                <p className="mt-1 text-sm text-gray-500">
                                    {newMedia.length} file(s) selected
                                </p>
                            )}
                        </div>

                        {/* Submit and Cancel buttons */}
                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg shadow-sm transition duration-200 flex items-center"
                            >
                                {submitting ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Updating...
                                    </>
                                ) : (
                                    'Save Changes'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default withAuth(EditPost); 