import React, { useState, useEffect, useRef } from "react";
import fetchWithAuth from "../hooks/fetchWithAuth";
import config from "../config";
import UserProfileBubble from "./UserProfileBubble";
import { getDisplayName } from "../utils/displayName";
import {
    PaperAirplaneIcon,
    ArrowUturnLeftIcon,
    ChevronDownIcon,
    ChevronUpIcon
} from "@heroicons/react/24/outline";

const { API_BASE_URL } = config;

// Updated to match backend models.CommentResponse
interface Comment {
    id: number;
    content: string;
    created_at: string;
    updated_at: string;
    parent_id: number | null; // Primary field name to match backend
    user_id: number;          // Primary field name to match backend
    username: string;
    first_name?: string;      // Added for display name support
    last_name?: string;       // Added for display name support
    preferred_name?: string;  // Added for display name support
    display_name_preference?: number; // Added for display name support
    avatar_url: string;       // Primary field name to match backend
    replies?: Comment[];
    replies_count: number;    // Primary field name to match backend
    level?: number;
    likes_count?: number;     // Primary field name to match backend

    // Legacy/compatibility fields
    parentID?: number | null;
    userID?: number;
    avatar?: string;
    avatarURL?: string;
    repliesCount?: number;
    likesCount?: number;

    user: {
        username: string;
        profile?: {
            avatar_url?: string;
            preferred_name?: string;
        };
    };
}

interface CommentSectionProps {
    postId?: number;
    sourceId?: string;
    sourceType?: string;
    postAuthorId?: number;
}

const CommentSection: React.FC<CommentSectionProps> = ({ postId, sourceId, sourceType, postAuthorId }) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [page, setPage] = useState(1);
    const [hasMoreComments, setHasMoreComments] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

    // Log authorId for debugging
    useEffect(() => {
        console.log("CommentSection initialized with:", {
            postId,
            sourceType,
            postAuthorId,
            authorIdType: typeof postAuthorId
        });
    }, [postId, sourceType, postAuthorId]);

    // Determine the entity type and ID based on props
    const getEntityInfo = () => {
        if (postId !== undefined) {
            // If sourceType is "post", use entity type 2 (General Post)
            if (sourceType === "post") {
                return { entityType: 2, entityId: postId };
            }
            return { entityType: 1, entityId: postId }; // Default to project posts (type 1)
        } else if (sourceId && sourceType) {
            // Map sourceType to entity_type
            const entityTypeMap: Record<string, number> = {
                "post": 2,      // General Post (updated from 0 to 2)
                "project": 1,   // Project Post
                "partner": 3,   // Partner Post (updated from 2 to 3 to avoid conflict)
            };
            return {
                entityType: entityTypeMap[sourceType] || 1,
                entityId: parseInt(sourceId)
            };
        }
        return { entityType: 1, entityId: 0 }; // Default fallback
    };

    const { entityType, entityId } = getEntityInfo();

    // Normalize comments to ensure a consistent structure
    // This helps handle different property names from the backend
    const normalizeComment = (comment: any): Comment => {
        // Log the raw comment data to help debug
        console.log("Normalizing comment:", comment);

        return {
            id: comment.id || comment.comment_id || 0,
            content: comment.content || "",
            created_at: comment.created_at || new Date().toISOString(),
            updated_at: comment.updated_at || comment.created_at || new Date().toISOString(),
            user_id: comment.user_id || comment.userID || comment.author_id || 0,
            username: comment.username || comment.author_name || "Anonymous",
            avatar_url: comment.avatar_url || comment.avatarURL || comment.avatar || "",
            parent_id: comment.parent_id || comment.parentID || null,
            replies_count: comment.replies_count || comment.repliesCount || 0,
            level: comment.level || 0,
            likes_count: comment.likes_count || comment.likesCount || 0,
            replies: Array.isArray(comment.replies)
                ? comment.replies.map(normalizeComment)
                : [],
            user: {
                username: comment.username || comment.author_name || "Anonymous",
                profile: {
                    avatar_url: comment.avatar_url || comment.avatarURL || comment.avatar || "",
                    preferred_name: comment.username || comment.author_name || "Anonymous"
                }
            }
        };
    };

    const commentInputRef = useRef<HTMLTextAreaElement>(null);

    // Focus the comment input when replying
    useEffect(() => {
        if (replyingTo && commentInputRef.current) {
            commentInputRef.current.focus();
        }
    }, [replyingTo]);

    const fetchComments = async (pageNumber: number) => {
        if (entityId === 0) return; // Don't fetch if no valid entity ID is provided

        try {
            setIsLoading(true);
            setErrorMessage(null); // Clear previous errors

            // Update page state
            setPage(pageNumber);

            console.log(`Fetching comments for entity_type=${entityType}, entity_id=${entityId}, page=${pageNumber}`);
            const response = await fetchWithAuth(
                `${API_BASE_URL}/api/content/comments?entity_type=${entityType}&entity_id=${entityId}&page=${pageNumber}&limit=10`
            );

            if (!response.ok) {
                console.error("Error fetching comments:", response.status, response.statusText);
                const errorText = await response.text();
                console.error("Error response:", errorText);
                setErrorMessage("Failed to load comments. Please try again later.");
                return;
            }

            // Parse response data
            let data;
            try {
                data = await response.json();
                console.log("Comments API raw response:", data);
            } catch (parseError) {
                console.error("Failed to parse JSON response:", parseError);
                setErrorMessage("Invalid response format. Please try refreshing.");
                setIsLoading(false);
                return;
            }

            // Check for various possible response formats and extract comments
            let commentsArray = [];
            let hasMore = false;

            if (Array.isArray(data)) {
                // Direct array of comments
                commentsArray = data;
                hasMore = false; // No pagination info in this format
            } else if (data && typeof data === 'object') {
                if (Array.isArray(data.comments)) {
                    // Format: { comments: [...], has_more: bool, ... }
                    commentsArray = data.comments;
                    hasMore = Boolean(data.has_more);
                } else if (data.data && Array.isArray(data.data.comments)) {
                    // Format: { data: { comments: [...], has_more: bool, ... } }
                    commentsArray = data.data.comments;
                    hasMore = Boolean(data.data.has_more);
                } else if (Object.keys(data).some(key => Array.isArray(data[key]))) {
                    // Try to find any array property in the response
                    const arrayKey = Object.keys(data).find(key => Array.isArray(data[key]));
                    if (arrayKey) {
                        commentsArray = data[arrayKey];
                        console.log(`Found comments in property '${arrayKey}'`);
                    }
                }
            }

            // If we couldn't find comments in any expected format, show error
            if (!commentsArray || commentsArray.length === 0) {
                if (pageNumber === 1) {
                    // No comments yet is a valid state for first page
                    console.log("No comments found in the response");
                    setComments([]);
                    setHasMoreComments(false);
                } else {
                    console.error("No comments found in the response for page > 1");
                    setErrorMessage("Failed to load more comments. Try refreshing.");
                }
                setIsLoading(false);
                return;
            }

            // Log what we found
            console.log(`Found ${commentsArray.length} comments in the response`);

            // Normalize the comments to ensure consistent structure
            const normalizedComments = commentsArray.map(normalizeComment);
            console.log("Normalized comments:", normalizedComments);
            console.log("Raw normalized comment data dump:");
            normalizedComments.forEach((comment: Comment, index: number) => {
                console.log(`Comment #${index + 1}:`, comment);

                // Log each reply if any
                if (comment.replies && comment.replies.length > 0) {
                    console.log(`Comment #${index + 1} has ${comment.replies.length} nested replies:`);
                    comment.replies.forEach((reply: Comment, replyIndex: number) => {
                        console.log(`  - Nested reply #${replyIndex + 1}:`, reply);
                    });
                }
            });

            // Ensure all comments and replies are in the flat array
            let allComments: Comment[] = [];

            // Recursive function to extract all replies at any depth
            const extractAllReplies = (comment: Comment): Comment[] => {
                let result: Comment[] = [comment];

                console.log(`Extracting replies for comment ID ${comment.id}`);

                if (comment.replies && comment.replies.length > 0) {
                    console.log(`Comment ID ${comment.id} has ${comment.replies.length} nested replies`);

                    comment.replies.forEach(reply => {
                        // Make sure each reply knows its parent
                        reply.parent_id = reply.parent_id || comment.id;
                        console.log(`Processing reply ID ${reply.id} to comment ID ${comment.id}`);

                        // Add all nested replies
                        const extractedReplies = extractAllReplies(reply);
                        console.log(`Extracted ${extractedReplies.length} total replies from reply ID ${reply.id}`);

                        result = [...result, ...extractedReplies];
                    });
                } else {
                    console.log(`Comment ID ${comment.id} has no nested replies`);
                }

                return result;
            };

            // First gather all comments and their nested replies
            let extractedComments: Comment[] = [];
            normalizedComments.forEach((comment: Comment) => {
                // Process this comment and all its replies recursively
                const commentWithReplies = extractAllReplies(comment);
                console.log(`Comment ID ${comment.id} and its replies resulted in ${commentWithReplies.length} total comments`);

                extractedComments = [...extractedComments, ...commentWithReplies];
            });

            console.log(`Total extracted comments before deduplication: ${extractedComments.length}`);

            // Remove duplicates that might occur when replies are included in multiple places
            allComments = extractedComments.filter((comment, index, self) =>
                index === self.findIndex((c) => c.id === comment.id)
            );

            console.log(`Total comments and replies after deduplication: ${allComments.length}`);
            console.log("All comments after processing:", allComments);

            // Replace existing comments or append to them
            if (pageNumber === 1) {
                setComments(allComments);
            } else {
                setComments((prevComments) => {
                    // Filter out duplicates when appending
                    const existingIds = new Set(prevComments.map(c => c.id));
                    const newComments = allComments.filter(c => !existingIds.has(c.id));
                    console.log(`Adding ${newComments.length} new comments to existing ${prevComments.length} comments`);
                    return [...prevComments, ...newComments];
                });
            }

            // Set pagination state
            setHasMoreComments(hasMore);
        } catch (error) {
            console.error("Failed to fetch comments:", error);
            setErrorMessage("Failed to load comments. Please check your connection.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || submitting) return;

        // Clear previous errors
        setErrorMessage(null);

        try {
            setSubmitting(true);
            const commentData = {
                entity_type: entityType,
                entity_id: entityId,
                content: newComment,
                parent_id: replyingTo?.id || null,
            };

            // Log whether we're posting a new comment or a reply
            console.log(replyingTo ?
                `Posting reply to comment #${replyingTo.id} by ${replyingTo.username}` :
                "Posting new top-level comment",
                commentData);

            // Using the generic comments endpoint
            const response = await fetchWithAuth(
                `${API_BASE_URL}/api/content/comments`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(commentData),
                }
            );

            console.log("Comment post response status:", response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Failed to add comment:", response.status, errorText);
                throw new Error(`Failed to add comment: ${response.statusText}`);
            }

            const newCommentData = await response.json();
            console.log("New comment response:", newCommentData);

            // Extract the comment from the response - might be wrapped in a property
            const commentFromResponse = newCommentData.comment || newCommentData;

            // Normalize the new comment
            const normalizedComment = normalizeComment(commentFromResponse);
            console.log("Normalized new comment:", normalizedComment);

            // Add the new comment to the beginning of the comments array, whether it's a reply or top-level
            setComments(prevComments => [normalizedComment, ...prevComments]);

            // Note: We're removing the auto-expansion of parent comment on reply
            // Update UI to show the parent has replies
            console.log(`Added reply to comment #${replyingTo?.id || 'root'}`);

            // Reset the form
            setNewComment("");
            setReplyingTo(null);

            // Scroll to the new comment with a slight delay to ensure it's rendered
            setTimeout(() => {
                const newCommentElement = document.getElementById(`comment-${normalizedComment.id}`);
                if (newCommentElement) {
                    newCommentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Add a brief highlight effect
                    newCommentElement.classList.add('bg-blue-50');
                    setTimeout(() => {
                        newCommentElement.classList.remove('bg-blue-50');
                    }, 2000);
                }
            }, 300);

        } catch (error) {
            console.error("Error adding comment:", error);
            setErrorMessage("Failed to post your comment. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const toggleCommentExpansion = (commentId: number) => {
        console.log("Toggling expansion for comment ID:", commentId);
        console.log("Current expanded comments:", [...expandedComments]);

        // Check if this comment is a reply
        const comment = comments.find(c => c.id === commentId);
        console.log("Comment being toggled:", comment);

        setExpandedComments(prev => {
            const newExpanded = new Set(prev);
            if (newExpanded.has(commentId)) {
                console.log("Collapsing comment");
                newExpanded.delete(commentId);

                // Unlike before, we don't auto-collapse all descendants
                // This allows fine-grained control over which comment threads are expanded/collapsed
            } else {
                console.log("Expanding comment");
                newExpanded.add(commentId);

                // We're not auto-expanding all descendants anymore
                // Users will need to click "View replies" on each level 1 comment

                // If this is a reply, still make sure its parent is expanded
                // This ensures the UI state is consistent
                if (comment && (comment.parent_id || comment.parentID)) {
                    const parentId = comment.parent_id || comment.parentID;
                    if (parentId && !newExpanded.has(parentId)) {
                        console.log("Also expanding parent comment:", parentId);
                        newExpanded.add(parentId);
                    }
                }
            }
            console.log("New expanded comments:", [...newExpanded]);
            return newExpanded;
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            handleAddComment();
        }
    };

    // Clear error message when user starts typing
    const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNewComment(e.target.value);
        if (errorMessage) {
            setErrorMessage(null);
        }
    };

    // Replace the handleUserHover with handleUserClick
    const handleUserClick = (comment: Comment) => {
        const userId = Number(comment.user_id || comment.userID || 0);
        console.log("User clicked:", {
            commentId: comment.id,
            userId,
            username: comment.username
        });

        if (userId > 0) {
            setSelectedUserId(userId);
        }
    };

    // Add a function to close the profile bubble
    const closeProfileBubble = () => {
        setSelectedUserId(null);
    };

    useEffect(() => {
        // Reset state when entity changes
        setComments([]);
        setPage(1);
        setHasMoreComments(true);
        setErrorMessage(null);

        // Only fetch comments if we have a valid entity ID
        if (entityId !== 0) {
            fetchComments(1);
        }
    }, [entityId, entityType]);

    // Close profile bubble when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const bubble = document.getElementById('profile-bubble-container');
            if (bubble && !bubble.contains(e.target as Node)) {
                closeProfileBubble();
            }
        };

        if (selectedUserId) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [selectedUserId]);

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleAddComment();
    };

    // Format timestamp to a human-readable form
    const formatTimestamp = (timestamp?: string) => {
        if (!timestamp) return '';

        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString();
    };

    // Modify renderComment to handle nested replies properly
    const renderComment = (comment: Comment, isReply = false) => {
        // Skip rendering this comment if it's a reply and we're in the top-level comment loop
        // This prevents duplicating replies when they are shown in the nested view
        if (!isReply && (comment.parent_id || comment.parentID)) {
            return null;
        }

        // Get ALL replies related to this comment
        // 1. Direct replies to this comment
        // 2. Replies to replies (these should be displayed under the original comment)
        const getAllRelatedReplies = () => {
            // First get direct replies
            const directReplies = comments.filter(c =>
                c.parent_id === comment.id || c.parentID === comment.id
            );

            // Implementation of find all descendants function
            const findAllDescendants = (parentId: number): Comment[] => {
                const children = comments.filter(c =>
                    c.parent_id === parentId || c.parentID === parentId
                );

                let allDescendants: Comment[] = [...children];

                // For each child, recursively find its descendants
                children.forEach(child => {
                    const childDescendants = findAllDescendants(child.id);
                    allDescendants = [...allDescendants, ...childDescendants];
                });

                return allDescendants;
            };

            // Get all descendants of this comment
            const allDescendants = findAllDescendants(comment.id);

            // Log comprehensive information about this comment's reply hierarchy
            console.log(`Comment ${comment.id} by ${comment.username}:`);
            console.log(`- Has ${directReplies.length} direct replies`);
            console.log(`- Has ${allDescendants.length} total descendants (including nested replies)`);

            // Log information about each direct reply and its descendants
            directReplies.forEach(reply => {
                // Count how many replies this reply has
                const replyChildren = allDescendants.filter(c =>
                    c.parent_id === reply.id || c.parentID === reply.id
                );
                console.log(`  - Reply ${reply.id} by ${reply.username} has ${replyChildren.length} replies itself`);
            });

            return {
                directReplies,
                allDescendants,
                totalDescendantCount: allDescendants.length
            };
        };

        const relatedRepliesData = getAllRelatedReplies();
        const directReplies = relatedRepliesData.directReplies;
        const allDescendants = relatedRepliesData.allDescendants;
        const totalDescendantCount = relatedRepliesData.totalDescendantCount;

        // Determine if this comment has any replies
        const hasReplies = directReplies.length > 0 ||
            (comment.replies_count || comment.repliesCount || 0) > 0;

        // Use the total count of all descendants for display
        const replyCount = totalDescendantCount ||
            comment.replies_count ||
            comment.repliesCount ||
            0;

        console.log(`Comment ${comment.id} has total reply count: ${replyCount}`);

        const isExpanded = expandedComments.has(comment.id);
        const isReplying = replyingTo?.id === comment.id;

        // Find the parent comment if this is a reply
        let parentUsername = null;
        let commentLevel = 0;
        if (comment.parent_id || comment.parentID) {
            const parentId = comment.parent_id || comment.parentID;
            const parentComment = comments.find(c => c.id === parentId);

            if (parentComment) {
                console.log(`Comment ${comment.id} is replying to comment ${parentId} by ${parentComment.username}`);
                parentUsername = parentComment.username || "User";
                commentLevel = (parentComment.level || 0) + 1;
            } else {
                console.log(`Comment ${comment.id} has parent_id ${parentId} but parent not found`);
            }
        }

        // Check if this comment is from the post author - convert IDs to numbers for comparison
        const commentUserId = Number(comment.user_id || comment.userID || 0);
        const authorId = Number(postAuthorId || 0);
        const isPostAuthor = authorId > 0 && commentUserId === authorId;

        // Log for debugging
        if (commentUserId > 0 && authorId > 0) {
            console.log("Comment author check:", {
                commentId: comment.id,
                commentUserId,
                authorId,
                isMatch: commentUserId === authorId,
                isPostAuthor
            });
        }

        // Helper function to render a reply with consistent styling
        const renderReply = (reply: Comment) => {
            // Find the parent of this reply to show who they're replying to
            const parentId = reply.parent_id || reply.parentID;
            const parentComment = comments.find(c => c.id === parentId);
            const parentName = parentComment?.username || "Anonymous";
            const isReplyingToThisReply = replyingTo?.id === reply.id;

            // Calculate the reply's level in the comment hierarchy
            // Level 0 = Root comment
            // Level 1 = Direct reply to root (first level)
            // Level 2+ = Nested replies (second level or deeper)
            let replyLevel = 0;
            if (parentComment) {
                replyLevel = (parentComment.level || 0) + 1;
            }

            // Count all nested replies for this reply (including deeper levels)
            const countAllDescendants = (commentId: number): number => {
                // Get direct children
                const directChildren = comments.filter(c =>
                    c.parent_id === commentId || c.parentID === commentId
                );

                // Base count is the number of direct children
                let count = directChildren.length;

                // Add counts from each child's descendants
                directChildren.forEach(child => {
                    count += countAllDescendants(child.id);
                });

                return count;
            };

            // Get ALL replies to this reply, not just direct ones
            const totalReplyCount = countAllDescendants(reply.id);
            const hasNestedReplies = totalReplyCount > 0;
            const isReplyExpanded = expandedComments.has(reply.id);

            // Determine if this reply should be visible based on parent expansion state
            const shouldRenderNestedReplies = () => {
                // If this is a level 2+ reply, its visibility depends on its parent's expansion
                if (replyLevel >= 2) {
                    // Find immediate parent
                    const immediateParentId = reply.parent_id || reply.parentID;
                    // Find the level 1 ancestor (direct child of root) that controls visibility
                    let currentParentId = immediateParentId;
                    let level1AncestorFound = false;
                    let level1AncestorId = null;

                    // Traverse up the parent chain to find level 1 ancestor
                    while (currentParentId && !level1AncestorFound) {
                        const currentParent = comments.find(c => c.id === currentParentId);
                        if (!currentParent) break;

                        const currentParentLevel = calculateCommentLevel(currentParent);

                        if (currentParentLevel === 1) {
                            // Found level 1 ancestor
                            level1AncestorFound = true;
                            level1AncestorId = currentParent.id;
                            break;
                        }

                        // Move up to next parent
                        currentParentId = currentParent.parent_id || currentParent.parentID;
                    }

                    // If we found a level 1 ancestor, check if it's expanded
                    return level1AncestorId ? expandedComments.has(level1AncestorId) : true;
                }

                // Level 1 replies are always rendered if the root comment is expanded
                return true;
            };

            // Helper function to calculate a comment's level
            const calculateCommentLevel = (c: Comment): number => {
                if (!c.parent_id && !c.parentID) return 0; // Root comment

                const parent = comments.find(p => p.id === (c.parent_id || c.parentID));
                if (!parent) return 1; // Default to level 1 if parent not found

                return calculateCommentLevel(parent) + 1;
            };

            // Only render nested replies that should be visible 
            if (replyLevel >= 2 && !shouldRenderNestedReplies()) {
                return null; // Skip rendering this reply if its ancestor is not expanded
            }

            // Check if this reply is from the post author - convert IDs to numbers for comparison
            const replyUserId = Number(reply.user_id || reply.userID || 0);
            const authorId = Number(postAuthorId || 0);
            const isReplyFromAuthor = authorId > 0 && replyUserId === authorId;

            return (
                <div
                    key={reply.id}
                    id={`comment-${reply.id}`}
                    className="mb-3 relative ml-4 transition-colors duration-500"
                >
                    {/* Connecting line */}
                    <div
                        className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-200"
                        style={{
                            left: `-4px`,
                            height: '100%'
                        }}
                    />

                    <div className="flex items-start group">
                        <div className="relative flex-shrink-0">
                            <img
                                src={reply.avatar_url || reply.avatarURL || "/default-avatar.png"}
                                alt={getDisplayName(reply)}
                                className="w-7 h-7 rounded-full mr-3 object-cover border border-gray-200 cursor-pointer hover:border-blue-400"
                                onClick={() => handleUserClick(reply)}
                                onError={(e) => {
                                    e.currentTarget.src = "/default-avatar.png";
                                }}
                            />
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center mb-1">
                                <p className="text-sm font-medium text-gray-800">
                                    {getDisplayName(reply)}
                                </p>
                                {isReplyFromAuthor && (
                                    <span className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-md font-medium">
                                        Author
                                    </span>
                                )}
                                <span className="mx-2 text-xs text-gray-400">•</span>
                                <p className="text-xs text-gray-400">
                                    {formatTimestamp(reply.created_at)}
                                </p>
                            </div>

                            <div className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">
                                {/* Only show "Replying to" for level 2 or deeper replies */}
                                {replyLevel >= 2 && (
                                    <span className="text-xs text-blue-600 font-medium mb-1 inline-block">
                                        Replying to @{parentName}
                                    </span>
                                )}
                                <div className="mt-1">{reply.content}</div>
                            </div>

                            <div className="flex items-center space-x-4 opacity-70 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => setReplyingTo(reply)}
                                    className={`flex items-center text-gray-500 hover:text-blue-500 text-xs font-medium transition-colors ${isReplyingToThisReply ? 'text-blue-500' : ''}`}
                                >
                                    <ArrowUturnLeftIcon className="h-3 w-3 mr-1" />
                                    Reply
                                </button>

                                {/* Only show View Replies button for level 1 replies */}
                                {replyLevel === 1 && hasNestedReplies && (
                                    <button
                                        onClick={() => toggleCommentExpansion(reply.id)}
                                        className="flex items-center text-gray-500 hover:text-blue-500 text-xs font-medium transition-colors"
                                    >
                                        {isReplyExpanded ? (
                                            <>
                                                <ChevronUpIcon className="h-3 w-3 mr-1" />
                                                Hide replies
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDownIcon className="h-3 w-3 mr-1" />
                                                View {totalReplyCount} {totalReplyCount === 1 ? 'reply' : 'replies'}
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>

                            {/* Inline reply form */}
                            {isReplyingToThisReply && (
                                <div className="mt-3 mb-2 bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                                    <textarea
                                        value={newComment}
                                        onChange={handleCommentChange}
                                        onKeyDown={handleKeyDown}
                                        placeholder={`Reply to ${getDisplayName(reply)}...`}
                                        className="w-full p-3 bg-transparent border-none outline-none resize-none text-sm"
                                        rows={2}
                                        autoFocus
                                    />
                                    <div className="flex justify-between items-center px-3 py-2 bg-gray-100">
                                        <button
                                            onClick={() => setReplyingTo(null)}
                                            className="text-xs text-gray-500 hover:text-gray-700"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleFormSubmit}
                                            disabled={!newComment.trim() || submitting}
                                            className={`flex items-center px-3 py-1 rounded-full transition-colors text-xs ${!newComment.trim() || submitting
                                                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                                : "bg-blue-500 text-white hover:bg-blue-600"
                                                }`}
                                        >
                                            <PaperAirplaneIcon className="h-3 w-3 mr-1" />
                                            {submitting ? "Posting..." : "Reply"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        };

        return (
            <div
                key={comment.id}
                id={`comment-${comment.id}`}
                className={`mb-3 relative ${isReply ? 'ml-4' : ''} ${isReply ? '' : 'pb-3'} transition-colors duration-500`}
            >
                {/* Connecting lines for replies */}
                {isReply && (
                    <div
                        className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-200"
                        style={{
                            left: `-4px`,
                            height: '100%'
                        }}
                    />
                )}

                <div className="flex items-start group">
                    <div className="relative flex-shrink-0">
                        <img
                            src={comment.avatar_url || comment.avatarURL || "/default-avatar.png"}
                            alt={getDisplayName(comment)}
                            className={`${isReply ? 'w-7 h-7' : 'w-8 h-8'} rounded-full mr-3 object-cover border border-gray-200 cursor-pointer hover:border-blue-400`}
                            onClick={() => handleUserClick(comment)}
                            onError={(e) => {
                                e.currentTarget.src = "/default-avatar.png";
                            }}
                        />
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center mb-1">
                            <p className={`${isReply ? 'text-sm' : 'text-base'} font-medium text-gray-800`}>
                                {getDisplayName(comment)}
                            </p>
                            {isPostAuthor && (
                                <span className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-md font-medium">
                                    Author
                                </span>
                            )}
                            <span className="mx-2 text-xs text-gray-400">•</span>
                            <p className="text-xs text-gray-400">
                                {formatTimestamp(comment.created_at)}
                            </p>
                        </div>

                        <div className={`${isReply ? 'text-sm' : 'text-base'} text-gray-700 mb-2 whitespace-pre-wrap`}>
                            {/* Only show who this comment is replying to if it's level 2+ */}
                            {parentUsername && commentLevel >= 2 && (
                                <span className="text-xs text-blue-600 font-medium mb-1 inline-block">
                                    Replying to @{parentUsername}
                                </span>
                            )}
                            <div className="mt-1">{comment.content}</div>
                        </div>

                        <div className="flex items-center space-x-4 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => setReplyingTo(comment)}
                                className={`flex items-center text-gray-500 hover:text-blue-500 text-xs font-medium transition-colors ${isReplying ? 'text-blue-500' : ''}`}
                            >
                                <ArrowUturnLeftIcon className="h-3 w-3 mr-1" />
                                Reply
                            </button>

                            {/* Only show View Replies for root comments and level 1 replies */}
                            {hasReplies && (commentLevel === 0 || commentLevel === 1) && (
                                <button
                                    onClick={() => toggleCommentExpansion(comment.id)}
                                    className="flex items-center text-gray-500 hover:text-blue-500 text-xs font-medium transition-colors"
                                    data-comment-id={comment.id}
                                    data-reply-count={replyCount}
                                >
                                    {isExpanded ? (
                                        <>
                                            <ChevronUpIcon className="h-3 w-3 mr-1" />
                                            Hide replies
                                        </>
                                    ) : (
                                        <>
                                            <ChevronDownIcon className="h-3 w-3 mr-1" />
                                            View {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                                        </>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Inline reply form */}
                        {isReplying && (
                            <div className="mt-3 mb-2 bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                                <textarea
                                    value={newComment}
                                    onChange={handleCommentChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder={`Reply to ${getDisplayName(comment)}...`}
                                    className="w-full p-3 bg-transparent border-none outline-none resize-none text-sm"
                                    rows={2}
                                    autoFocus
                                />
                                <div className="flex justify-between items-center px-3 py-2 bg-gray-100">
                                    <button
                                        onClick={() => setReplyingTo(null)}
                                        className="text-xs text-gray-500 hover:text-gray-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleFormSubmit}
                                        disabled={!newComment.trim() || submitting}
                                        className={`flex items-center px-3 py-1 rounded-full transition-colors text-xs ${!newComment.trim() || submitting
                                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                            : "bg-blue-500 text-white hover:bg-blue-600"
                                            }`}
                                    >
                                        <PaperAirplaneIcon className="h-3 w-3 mr-1" />
                                        {submitting ? "Posting..." : "Reply"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Display ALL replies at the SAME level */}
                        {hasReplies && isExpanded && (
                            <div className="mt-3 space-y-3 border-l-2 border-gray-100 pl-1">
                                {/* Log what replies we're showing */}
                                {(() => {
                                    console.log(`Showing all ${allDescendants.length} descendants for comment ${comment.id}`);
                                    return null;
                                })()}

                                {/* Filter and render the appropriate descendants */}
                                {allDescendants
                                    .filter(reply => {
                                        // Root comments show all direct replies
                                        if (commentLevel === 0) {
                                            return true;
                                        }

                                        // For level 1 comments, only show direct replies if expanded
                                        if (commentLevel === 1) {
                                            const directReplyIds = directReplies.map(dr => dr.id);
                                            return directReplyIds.includes(reply.id) || expandedComments.has(reply.parent_id || reply.parentID || 0);
                                        }

                                        // For deeper levels, rely on the expansion state of the level 1 ancestor
                                        return expandedComments.has(comment.id);
                                    })
                                    .map(reply => renderReply(reply))
                                }
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="mt-4">
            {/* Comment form */}
            <form onSubmit={handleFormSubmit} className="mb-6">
                <div className="flex flex-col space-y-3">
                    <textarea
                        ref={commentInputRef}
                        value={newComment}
                        onChange={handleCommentChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Share your thoughts..."
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        rows={3}
                    />
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={isLoading || !newComment.trim()}
                            className={`px-4 py-2 rounded-lg ${isLoading || !newComment.trim()
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                : "bg-blue-600 text-white hover:bg-blue-700"
                                }`}
                        >
                            {isLoading ? "Posting..." : "Post Comment"}
                        </button>
                    </div>
                </div>
            </form>

            {/* Error message */}
            {errorMessage && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">
                    {errorMessage}
                </div>
            )}

            {/* Comments list */}
            <div className="space-y-4">
                {comments.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No comments yet. Be the first to share your thoughts!</p>
                ) : (
                    // Filter for root comments only (those without a parent_id)
                    comments
                        .filter(comment => !comment.parent_id && !comment.parentID)
                        .map((comment) => renderComment(comment, false))
                )}
            </div>

            {/* For pagination without scroll events, add a load more button if needed */}
            {hasMoreComments && !isLoading && comments.length > 0 && (
                <div className="text-center mt-6">
                    <button
                        onClick={() => fetchComments(page + 1)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                        Load more comments
                    </button>
                </div>
            )}

            {/* Profile bubble modal */}
            {selectedUserId && (
                <div
                    id="profile-bubble-container"
                    className="fixed inset-0 z-[1999] flex items-center justify-center bg-black bg-opacity-50"
                >
                    <div className="relative">
                        <UserProfileBubble userId={selectedUserId} />
                        <button
                            onClick={closeProfileBubble}
                            className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-100"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommentSection;
