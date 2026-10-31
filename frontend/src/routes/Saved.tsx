import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import fetchWithAuth from "../hooks/fetchWithAuth";
import config from "../config";
import ProjectPostCard from "../components/project/ProjectPostCard";
import HomePostCard from "../components/home/HomePostCard";
import Loading from "../components/Loading";

const { API_BASE_URL, AWS_BASE_URL } = config;

interface SavedItem {
    id: number;
    short_id: string;
    title: string;
    content: string;
    post_type: string;
    created_at: string;
    tags: string[];
    entity_type: number; // To distinguish between general post (2) and project post (1)
    cover?: string; // Optional cover image
    is_loved?: boolean;
    is_saved?: boolean;
    love_count?: number;
    media?: Array<string | { url: string }>; // Media can be an array of strings or objects with url
    user?: {
        id: number;
        username: string;
    };
    profile?: {
        avatar_url?: string;
        preferred_name?: string;
    };
}

type TabType = 'all' | 'general' | 'project';

const Saved: React.FC = () => {
    const { t } = useTranslation();
    const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('all');

    useEffect(() => {
        const fetchSavedItems = async () => {
            try {
                const response = await fetchWithAuth(`${API_BASE_URL}/api/content/interactions/saved`);
                if (!response.ok) {
                    throw new Error(t('saved.errors.fetchFailed'));
                }
                const data = await response.json();

                // Process data to ensure all items have expected fields
                const processedData = data && Array.isArray(data)
                    ? data.map((item: any) => ({
                        ...item,
                        is_loved: item.is_loved || false,
                        is_saved: true, // All items are saved since this is the saved items list
                        love_count: item.love_count || 0
                    }))
                    : [];

                setSavedItems(processedData);
            } catch (err) {
                setError(err instanceof Error ? err.message : "An error occurred");
            } finally {
                setLoading(false);
            }
        };

        fetchSavedItems();
    }, []);

    // Format media objects for proper display
    const formatMediaForDisplay = (media: any) => {
        if (!media || !Array.isArray(media) || media.length === 0) {
            return [];
        }

        const formattedMedia = media.map(item => {
            // If it's a string, convert to object with URL
            if (typeof item === 'string') {
                const url = item.startsWith('http') ? item : `${AWS_BASE_URL}${item}`;
                return { url };
            }

            // If it's an object with url property
            if (item && typeof item === 'object' && 'url' in item) {
                const url = typeof item.url === 'string'
                    ? (item.url.startsWith('http') ? item.url : `${AWS_BASE_URL}${item.url}`)
                    : '';
                return { ...item, url };
            }

            // If it's JSON that needs parsing
            if (item && typeof item === 'string' && (item.startsWith('{') || item.startsWith('['))) {
                try {
                    const parsed = JSON.parse(item);
                    if (parsed && typeof parsed === 'object' && 'url' in parsed) {
                        const url = parsed.url.startsWith('http')
                            ? parsed.url
                            : `${AWS_BASE_URL}${parsed.url}`;
                        return { ...parsed, url };
                    }
                } catch (e) {
                    // Parsing failed, return a default object
                    return { url: '' };
                }
            }

            // Default fallback
            return { url: '' };
        }).filter(item => item.url); // Only keep items with valid URLs

        return formattedMedia;
    };

    // Function to create a proper user profile for the HomePostCard
    const createUserProfile = (item: SavedItem) => {
        // Default avatar and name if none provided
        const defaultAvatar = 'https://via.placeholder.com/40';
        const defaultName = 'User';

        // Create profile object with fallbacks
        return {
            // User info
            user: {
                id: item.user?.id || 0,
                username: item.user?.username || defaultName
            },
            // Profile info
            profile: {
                preferred_name: item.profile?.preferred_name || item.user?.username || defaultName,
                avatar_url: item.profile?.avatar_url || defaultAvatar
            }
        };
    };

    // Generic function to handle post interactions
    const handleInteraction = async (itemId: number, entityType: number, type: number) => {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/content/interactions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    entity_type: entityType,
                    entity_id: itemId,
                    type: type, // 1 = Like, 2 = Save
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to update interaction`);
            }

            // Get response to know if active or not
            const result = await response.json();
            return result.is_active;
        } catch (error) {
            console.error("Error updating interaction:", error);
            return null;
        }
    };

    // Handle love interaction
    const handleLove = async (item: SavedItem) => {
        const result = await handleInteraction(item.id, item.entity_type, 1);
        if (result !== null) {
            setSavedItems(items =>
                items.map(i =>
                    i.id === item.id && i.entity_type === item.entity_type
                        ? {
                            ...i,
                            is_loved: result,
                            love_count: result ? (i.love_count || 0) + 1 : Math.max(0, (i.love_count || 0) - 1)
                        }
                        : i
                )
            );
        }
    };

    // Handle save interaction (will remove item from saved list)
    const handleSave = async (item: SavedItem) => {
        const result = await handleInteraction(item.id, item.entity_type, 2);
        // If user unsaved (result === false), remove the item from the list
        if (result === false) {
            setSavedItems(items =>
                items.filter(i => !(i.id === item.id && i.entity_type === item.entity_type))
            );
        }
    };

    // Format project data for ProjectPostCard
    const formatProjectData = (item: SavedItem) => {
        // Create a properly formatted project object that matches what ProjectPostCard expects
        return {
            post_id: item.id,
            id: item.id,
            short_id: item.short_id,
            sid: item.short_id,
            title: item.title,
            description: item.content,
            content: item.content,
            cover: item.cover,
            style: item.post_type || "Project",
            project_type: item.post_type || "Project",
            created_at: item.created_at,
            updated_at: item.created_at,
            topics: item.tags || [],
            topic: item.tags || [],
            isLoved: item.is_loved,
            isSaved: item.is_saved,
            loveCount: item.love_count,
            media: [],
            medias: [],
            spots: [],
            location: "",
            // Additional fields needed by Project Modal
            user_id: 0, // This may need to be fetched if the modal needs owner info
            owner_id: 0,
            project_id: item.id
        };
    };

    // Filter items based on the active tab
    const filteredItems = savedItems.filter(item => {
        if (activeTab === 'all') {
            return true;
        }

        if (activeTab === 'general' && item.entity_type === 2) {
            return true;
        }

        if (activeTab === 'project' && item.entity_type === 1) {
            return true;
        }

        return false;
    });

    // Count items by type
    const generalPostsCount = savedItems.filter(item => item.entity_type === 2).length;
    const projectPostsCount = savedItems.filter(item => item.entity_type === 1).length;
    const totalCount = savedItems.length;

    if (loading) {
        return <Loading />;
    }

    if (error) {
        return (
            <div className="bg-gray-100 min-h-screen py-10 px-4">
                <div className="max-w-5xl mx-auto">
                    <h1 className="text-3xl font-bold mb-6">{t('saved.title')}</h1>
                    <div className="text-center text-red-500">{error}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-100 min-h-screen py-10 px-4">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">{t('saved.title')}</h1>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-6">
                    <button
                        className={`px-4 py-2 font-medium text-sm rounded-t-lg ${activeTab === 'all'
                            ? 'bg-white border-l border-t border-r border-gray-200 text-blue-600'
                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                            }`}
                        onClick={() => setActiveTab('all')}
                    >
                        {t('saved.tabs.all')} <span className="ml-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs">{totalCount}</span>
                    </button>
                    <button
                        className={`px-4 py-2 font-medium text-sm rounded-t-lg ${activeTab === 'general'
                            ? 'bg-white border-l border-t border-r border-gray-200 text-blue-600'
                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                            }`}
                        onClick={() => setActiveTab('general')}
                    >
                        {t('saved.tabs.general')} <span className="ml-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs">{generalPostsCount}</span>
                    </button>
                    <button
                        className={`px-4 py-2 font-medium text-sm rounded-t-lg ${activeTab === 'project'
                            ? 'bg-white border-l border-t border-r border-gray-200 text-blue-600'
                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                            }`}
                        onClick={() => setActiveTab('project')}
                    >
                        {t('saved.tabs.project')} <span className="ml-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs">{projectPostsCount}</span>
                    </button>
                </div>

                {filteredItems.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredItems.map((item) => {
                            if (item.entity_type === 1) {
                                // Project post card for entity_type 1
                                return (
                                    <ProjectPostCard
                                        key={`${item.entity_type}-${item.id}`}
                                        project={formatProjectData(item)}
                                        onLove={() => handleLove(item)}
                                        onSave={() => handleSave(item)}
                                        isLoved={item.is_loved || false}
                                        isSaved={true}
                                        loveCount={item.love_count || 0}
                                    />
                                );
                            } else {
                                // General post card for entity_type 2 using HomePostCard
                                const formattedMedia = formatMediaForDisplay(item.media);
                                const userProfile = createUserProfile(item);

                                const postData = {
                                    ...item,
                                    ...userProfile,
                                    media: formattedMedia,
                                    likes_count: item.love_count || 0,
                                };

                                return (
                                    <HomePostCard
                                        key={`${item.entity_type}-${item.id}`}
                                        post={postData}
                                        onLove={() => handleLove(item)}
                                        onSave={() => handleSave(item)}
                                        isLoved={item.is_loved || false}
                                        isSaved={true}
                                        loveCount={item.love_count || 0}
                                    />
                                );
                            }
                        })}
                    </div>
                ) : (
                    <p className="text-gray-600 text-center">
                        {savedItems.length > 0
                            ? (activeTab === 'general' ? t('saved.empty.noGeneral') : activeTab === 'project' ? t('saved.empty.noProject') : t('saved.empty.noItems'))
                            : t('saved.empty.noItems')}
                    </p>
                )}
            </div>
        </div>
    );
};

export default Saved;
