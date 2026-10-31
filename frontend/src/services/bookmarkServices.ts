import fetchWithAuth from '../hooks/fetchWithAuth';
import config from '../config';

interface PlatformAuthConfig {
  youtube?: {
    apiKey?: string;
    oauth2Token?: string;
  };
  bilibili?: {
    sessdata?: string;
    csrf?: string;
  };
  xiaohongshu?: {
    accessToken?: string;
    userId?: string;
  };
}

interface ImportOptions {
  limit?: number;
  offset?: number;
  collections?: string[];
}

// YouTube API Integration
export const importYouTubeBookmarks = async (authConfig: PlatformAuthConfig['youtube'], options?: ImportOptions) => {
  try {
    // Option 1: Using YouTube Data API v3 with API Key
    if (authConfig?.apiKey) {
      const params = new URLSearchParams({
        part: 'snippet,contentDetails,statistics',
        myRating: 'like',
        maxResults: String(options?.limit || 50),
        key: authConfig.apiKey
      });

      const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`);
      const data = await response.json();

      // Transform YouTube data to our bookmark format
      return data.items.map((item: any) => ({
        platform: 'youtube',
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.high.url,
        url: `https://www.youtube.com/watch?v=${item.id}`,
        author: {
          name: item.snippet.channelTitle,
          avatar: item.snippet.thumbnails.default.url
        },
        stats: {
          views: parseInt(item.statistics.viewCount),
          likes: parseInt(item.statistics.likeCount),
          comments: parseInt(item.statistics.commentCount)
        },
        tags: item.snippet.tags || [],
        createdAt: new Date(item.snippet.publishedAt)
      }));
    }

    // Option 2: Using OAuth2 for user's playlists
    if (authConfig?.oauth2Token) {
      const response = await fetchWithAuth(`${config.API_BASE_URL}/api/bookmarks/youtube/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accessToken: authConfig.oauth2Token,
          ...options 
        })
      });

      return await response.json();
    }

    throw new Error('YouTube authentication required');
  } catch (error) {
    console.error('YouTube import failed:', error);
    throw error;
  }
};

// Bilibili API Integration
export const importBilibiliBookmarks = async (authConfig: PlatformAuthConfig['bilibili'], options?: ImportOptions) => {
  try {
    // Bilibili requires SESSDATA cookie for authentication
    if (authConfig?.sessdata) {
      const response = await fetchWithAuth(`${config.API_BASE_URL}/api/bookmarks/bilibili/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessdata: authConfig.sessdata,
          csrf: authConfig.csrf,
          ...options
        })
      });

      return await response.json();
    }

    throw new Error('Bilibili authentication required');
  } catch (error) {
    console.error('Bilibili import failed:', error);
    throw error;
  }
};

// Xiaohongshu (Little Red Book) API Integration
export const importXiaohongshuBookmarks = async (authConfig: PlatformAuthConfig['xiaohongshu'], options?: ImportOptions) => {
  try {
    if (authConfig?.accessToken) {
      const response = await fetchWithAuth(`${config.API_BASE_URL}/api/bookmarks/xiaohongshu/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: authConfig.accessToken,
          userId: authConfig.userId,
          ...options
        })
      });

      return await response.json();
    }

    throw new Error('Xiaohongshu authentication required');
  } catch (error) {
    console.error('Xiaohongshu import failed:', error);
    throw error;
  }
};

// Generic bookmark import function
export const importBookmarks = async (platform: string, authConfig: any, options?: ImportOptions) => {
  switch (platform) {
    case 'youtube':
      return importYouTubeBookmarks(authConfig, options);
    case 'bilibili':
      return importBilibiliBookmarks(authConfig, options);
    case 'xiaohongshu':
      return importXiaohongshuBookmarks(authConfig, options);
    default:
      throw new Error(`Platform ${platform} not supported`);
  }
};

// Get user's saved bookmarks
export const getUserBookmarks = async (filters?: {
  platform?: string;
  tags?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}) => {
  const params = new URLSearchParams();
  
  if (filters?.platform) params.append('platform', filters.platform);
  if (filters?.tags) params.append('tags', filters.tags.join(','));
  if (filters?.search) params.append('search', filters.search);
  if (filters?.limit) params.append('limit', String(filters.limit));
  if (filters?.offset) params.append('offset', String(filters.offset));

  const response = await fetchWithAuth(`${config.API_BASE_URL}/api/bookmarks?${params}`);
  return await response.json();
};

// Save a bookmark
export const saveBookmark = async (bookmarkData: any) => {
  const response = await fetchWithAuth(`${config.API_BASE_URL}/api/bookmarks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bookmarkData)
  });

  return await response.json();
};

// Delete a bookmark
export const deleteBookmark = async (bookmarkId: string) => {
  const response = await fetchWithAuth(`${config.API_BASE_URL}/api/bookmarks/${bookmarkId}`, {
    method: 'DELETE'
  });

  return await response.json();
};

// Get trending topics from bookmarks
export const getTrendingTopics = async () => {
  const response = await fetchWithAuth(`${config.API_BASE_URL}/api/bookmarks/trending`);
  return await response.json();
};

// Get bookmark recommendations
export const getBookmarkRecommendations = async (userId: string) => {
  const response = await fetchWithAuth(`${config.API_BASE_URL}/api/bookmarks/recommendations/${userId}`);
  return await response.json();
};