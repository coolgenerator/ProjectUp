import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BookmarkGraph from './BookmarkGraph';
import NotificationToast from './NotificationToast';
import PlatformAuthModal from './PlatformAuthModal';
import { importBookmarks } from '../../services/bookmarkServices';
import fetchWithAuth from '../../hooks/fetchWithAuth';
import config from '../../config';

interface Platform {
  id: string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  apiEndpoint?: string;
  enabled: boolean;
}

interface Bookmark {
  id: number;
  user_id: number;
  url: string;
  title: string;
  description?: string;
  thumbnail?: string;
  category: string;
  tags: string;
  platform: string;
  author?: string;
  author_avatar?: string;
  view_count?: number;
  like_count?: number;
  collections?: string;
  is_favorite?: boolean;
  is_archived?: boolean;
  imported_at: string;
  created_at: string;
  updated_at: string;
}

interface TrendingTopic {
  name: string;
  count: number;
  growth: number;
  relatedTags: string[];
}

interface BookmarkManagerProps {
  userId?: string;
}

const BookmarkManager: React.FC<BookmarkManagerProps> = ({ userId }) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [filteredBookmarks, setFilteredBookmarks] = useState<Bookmark[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'graph'>('grid');
  const [selectedBookmark, setSelectedBookmark] = useState<Bookmark | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showPlatformSelector, setShowPlatformSelector] = useState(false);
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [addingLink, setAddingLink] = useState(false);
  const [authModalPlatform, setAuthModalPlatform] = useState<Platform | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info'; isVisible: boolean }>({ 
    message: '', 
    type: 'success', 
    isVisible: false 
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [platforms, setPlatforms] = useState<Platform[]>([
    { 
      id: 'youtube', 
      name: 'YouTube', 
      icon: '▶️',
      color: '#FF0000',
      bgColor: 'from-red-500 to-red-600',
      apiEndpoint: '/api/bookmarks/youtube/import',
      enabled: true
    },
    { 
      id: 'bilibili', 
      name: 'Bilibili', 
      icon: '📺',
      color: '#00A1D6',
      bgColor: 'from-blue-400 to-blue-500',
      apiEndpoint: '/api/bookmarks/bilibili/import',
      enabled: true
    },
    { 
      id: 'xiaohongshu', 
      name: '小红书', 
      icon: '📔',
      color: '#FF2442',
      bgColor: 'from-pink-500 to-red-500',
      apiEndpoint: '/api/bookmarks/xiaohongshu/import',
      enabled: true
    },
    { 
      id: 'instagram', 
      name: 'Instagram', 
      icon: '📷',
      color: '#E4405F',
      bgColor: 'from-purple-500 to-pink-500',
      apiEndpoint: '/api/bookmarks/instagram/import',
      enabled: false
    }
  ]);

  // Fetch bookmarks from backend
  const fetchBookmarks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('page_size', pageSize.toString());
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory) params.append('category', selectedCategory);

      const response = await fetchWithAuth(`${config.API_BASE_URL}/api/bookmarks?${params}`);
      if (response.ok) {
        const data = await response.json();
        setBookmarks(data.bookmarks || []);
        setTotalCount(data.total_count || 0);
        generateTrendingTopics(data.bookmarks || []);
      }
    } catch (error) {
      console.error('Failed to fetch bookmarks:', error);
      showNotification('Failed to load bookmarks', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories from backend
  const fetchCategories = async () => {
    try {
      const response = await fetchWithAuth(`${config.API_BASE_URL}/api/bookmarks/categories`);
      if (response.ok) {
        const data = await response.json();
        const categoryNames = data.categories?.map((cat: any) => cat.name) || [
          'Technology', 'Education', 'Business', 'Design', 'Entertainment',
          'News', 'Health', 'Food', 'Travel', 'Shopping', 'Social', 'General'
        ];
        setCategories(categoryNames);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      // Use default categories as fallback
      setCategories([
        'Technology', 'Education', 'Business', 'Design', 'Entertainment',
        'News', 'Health', 'Food', 'Travel', 'Shopping', 'Social', 'General'
      ]);
    }
  };

  // Add a new bookmark
  const addBookmark = async () => {
    if (!newLinkUrl) {
      showNotification('Please enter a URL', 'error');
      return;
    }

    setAddingLink(true);
    try {
      const response = await fetchWithAuth(`${config.API_BASE_URL}/api/bookmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: newLinkUrl,
          tags: [],
          collections: []
        })
      });

      if (response.ok) {
        const newBookmark = await response.json();
        setBookmarks(prev => [newBookmark, ...prev]);
        setNewLinkUrl('');
        setShowAddLinkModal(false);
        showNotification(`Bookmark added and categorized as "${newBookmark.category}"`, 'success');
      } else {
        throw new Error('Failed to add bookmark');
      }
    } catch (error) {
      console.error('Failed to add bookmark:', error);
      showNotification('Failed to add bookmark', 'error');
    } finally {
      setAddingLink(false);
    }
  };

  // Delete a bookmark
  const deleteBookmark = async (bookmarkId: number) => {
    try {
      const response = await fetchWithAuth(`${config.API_BASE_URL}/api/bookmarks/${bookmarkId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
        showNotification('Bookmark deleted successfully', 'success');
      } else {
        throw new Error('Failed to delete bookmark');
      }
    } catch (error) {
      console.error('Failed to delete bookmark:', error);
      showNotification('Failed to delete bookmark', 'error');
    }
  };

  // Initialize data
  useEffect(() => {
    fetchBookmarks();
    fetchCategories();
  }, [currentPage, selectedCategory]);

  // Refresh bookmarks when search changes (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== undefined) {
        fetchBookmarks();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Generate trending topics
  const generateTrendingTopics = (bookmarkData: Bookmark[]) => {
    const tagCounts: { [key: string]: number } = {};
    
    bookmarkData.forEach(bookmark => {
      if (bookmark.tags) {
        const tags = bookmark.tags.split(',').map(t => t.trim()).filter(t => t);
        tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    const topics: TrendingTopic[] = Object.entries(tagCounts)
      .map(([name, count]) => ({
        name,
        count,
        growth: Math.floor(Math.random() * 50) - 10,
        relatedTags: Object.keys(tagCounts)
          .filter(tag => tag !== name)
          .slice(0, 3)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    setTrendingTopics(topics);
  };

  // Filter bookmarks
  useEffect(() => {
    let filtered = [...bookmarks];

    // Platform filter - only show enabled platforms
    const enabledPlatformIds = platforms.filter(p => p.enabled).map(p => p.id);
    filtered = filtered.filter(b => !b.platform || enabledPlatformIds.includes(b.platform));

    // Tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(b => {
        if (!b.tags) return false;
        const tags = b.tags.split(',').map(t => t.trim());
        return selectedTags.some(tag => tags.includes(tag));
      });
    }

    setFilteredBookmarks(filtered);
  }, [bookmarks, platforms, selectedTags]);

  // Show notification
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type, isVisible: true });
  };

  // Handle platform authentication
  const handlePlatformAuth = async (platform: Platform, authData: any) => {
    setImporting(true);
    
    try {
      // Call the service to import bookmarks
      const newBookmarks = await importBookmarks(platform.id, authData, {
        limit: 50,
        offset: 0
      });
      
      // For demo purposes, use mock data if the API fails
      const importedBookmarks = newBookmarks || generateMockBookmarks()
        .filter(b => b.platform === platform.id)
        .slice(0, 10);
      
      setBookmarks(prev => [...prev, ...importedBookmarks]);
      showNotification(`Successfully imported ${importedBookmarks.length} bookmarks from ${platform.name}`, 'success');
    } catch (error) {
      console.error('Import failed:', error);
      showNotification(`Failed to import from ${platform.name}. Please check your credentials.`, 'error');
    } finally {
      setImporting(false);
      setAuthModalPlatform(null);
    }
  };

  // Handle platform import with API
  const handleImport = async (platformId: string) => {
    const platform = platforms.find(p => p.id === platformId);
    if (!platform) return;

    // Show auth modal for the platform
    setAuthModalPlatform(platform);
  };

  // Format numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Toggle platform
  const togglePlatform = (platformId: string) => {
    setPlatforms(prev => prev.map(p => 
      p.id === platformId ? { ...p, enabled: !p.enabled } : p
    ));
  };

  // Handle tag selection
  const handleTagClick = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <div className="w-full">
      {/* Modern Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search bookmarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddLinkModal(true)}
              className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
            >
              <span>➕</span>
              Add Link
            </button>
            
            <button
              onClick={() => setShowPlatformSelector(!showPlatformSelector)}
              className="px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
            >
              <span>🎯</span>
              Platforms
            </button>
            
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'graph' : 'grid')}
              className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-200 flex items-center gap-2"
            >
              {viewMode === 'grid' ? '🕸️' : '📱'}
              {viewMode === 'grid' ? 'Graph' : 'Grid'}
            </button>
          </div>
        </div>

        {/* Selected Tags */}
        {selectedTags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedTags.map(tag => (
              <span
                key={tag}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-1"
              >
                {tag}
                <button
                  onClick={() => handleTagClick(tag)}
                  className="ml-1 hover:text-blue-900"
                >
                  ✕
                </button>
              </span>
            ))}
            <button
              onClick={() => setSelectedTags([])}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Platform Selector */}
      <AnimatePresence>
        {showPlatformSelector && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6"
          >
            <h3 className="text-lg font-semibold mb-4">Select Platforms to Display</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {platforms.map(platform => (
                <div key={platform.id} className="relative">
                  <button
                    onClick={() => togglePlatform(platform.id)}
                    className={`
                      w-full p-4 rounded-xl border-2 transition-all duration-200
                      ${platform.enabled 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 bg-gray-50 opacity-60'
                      }
                    `}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-3xl">{platform.icon}</span>
                      <span className="font-medium">{platform.name}</span>
                      {platform.enabled && (
                        <span className="absolute top-2 right-2 text-green-500">✓</span>
                      )}
                    </div>
                  </button>
                  
                  {platform.enabled && (
                    <button
                      onClick={() => handleImport(platform.id)}
                      className="mt-2 w-full py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm hover:shadow-md transition-all"
                      disabled={importing}
                    >
                      {importing ? 'Importing...' : 'Import'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trending Topics */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🔥</span>
          <h3 className="text-lg font-semibold">Trending Topics</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {trendingTopics.map(topic => (
            <button
              key={topic.name}
              onClick={() => handleTagClick(topic.name)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                ${selectedTags.includes(topic.name)
                  ? 'bg-orange-500 text-white'
                  : 'bg-white hover:bg-orange-100 text-gray-700'
                }
              `}
            >
              <span className="flex items-center gap-1">
                {topic.name}
                <span className="text-xs opacity-70">({topic.count})</span>
                {topic.growth > 0 && <span className="text-red-500">↑</span>}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Display */}
      {viewMode === 'grid' ? (
        // Pinterest-style Grid View
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
          {loading ? (
            // Loading skeletons
            Array(12).fill(0).map((_, index) => (
              <div key={`skeleton-${index}`} className="break-inside-avoid mb-4">
                <div className="bg-gray-200 rounded-xl animate-pulse" style={{ height: Math.random() * 200 + 200 }} />
              </div>
            ))
          ) : (
            // Bookmark cards
            filteredBookmarks.map((bookmark, index) => (
              <motion.div
                key={bookmark.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="break-inside-avoid mb-4"
              >
                <div
                  className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer group"
                  onClick={() => setSelectedBookmark(bookmark)}
                >
                  {/* Platform badge */}
                  <div className="relative">
                    {bookmark.thumbnail && (
                      <img
                        src={bookmark.thumbnail}
                        alt={bookmark.title}
                        className="w-full object-cover"
                      />
                    )}
                    <div className={`
                      absolute top-2 left-2 px-3 py-1 rounded-full text-white text-xs font-medium
                      bg-gradient-to-r ${platforms.find(p => p.id === bookmark.platform)?.bgColor}
                    `}>
                      {platforms.find(p => p.id === bookmark.platform)?.icon} {platforms.find(p => p.id === bookmark.platform)?.name}
                    </div>
                    {bookmark.trending && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs">
                        🔥 Trending
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {bookmark.title}
                    </h3>

                    {/* Author info */}
                    <div className="flex items-center gap-2 mb-3">
                      <img
                        src={bookmark.author.avatar}
                        alt={bookmark.author.name}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-sm text-gray-600">{bookmark.author.name}</span>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-4 text-sm text-gray-500 mb-3">
                      {bookmark.stats.views && (
                        <span>👁️ {formatNumber(bookmark.stats.views)}</span>
                      )}
                      {bookmark.stats.likes && (
                        <span>❤️ {formatNumber(bookmark.stats.likes)}</span>
                      )}
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {bookmark.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs hover:bg-gray-200 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTagClick(tag);
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      ) : (
        // Knowledge Graph View
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6" style={{ height: '600px' }}>
          <h3 className="text-lg font-semibold mb-4">Bookmark Connections</h3>
          <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-lg p-3 mb-4 text-sm">
            💡 Tip: Click and drag nodes to explore connections. Larger nodes indicate more important content.
          </div>
          <BookmarkGraph 
            bookmarks={filteredBookmarks}
            onNodeClick={(node) => {
              const bookmark = filteredBookmarks.find(b => b.id === node.id);
              if (bookmark) {
                setSelectedBookmark(bookmark);
              }
            }}
          />
        </div>
      )}

      {/* Bookmark Detail Modal */}
      <AnimatePresence>
        {selectedBookmark && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedBookmark(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                {selectedBookmark.thumbnail && (
                  <img
                    src={selectedBookmark.thumbnail}
                    alt={selectedBookmark.title}
                    className="w-full h-64 object-cover rounded-t-2xl"
                  />
                )}
                <button
                  onClick={() => setSelectedBookmark(null)}
                  className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <img
                    src={selectedBookmark.author.avatar}
                    alt={selectedBookmark.author.name}
                    className="w-12 h-12 rounded-full"
                  />
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-800">{selectedBookmark.title}</h2>
                    <p className="text-gray-600">{selectedBookmark.author.name} • {formatNumber(selectedBookmark.stats.views || 0)} views</p>
                  </div>
                </div>

                <p className="text-gray-700 mb-6">{selectedBookmark.description}</p>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-800">{formatNumber(selectedBookmark.stats.likes || 0)}</p>
                    <p className="text-sm text-gray-600">Likes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-800">{formatNumber(selectedBookmark.stats.comments || 0)}</p>
                    <p className="text-sm text-gray-600">Comments</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-800">{formatNumber(selectedBookmark.stats.saves || 0)}</p>
                    <p className="text-sm text-gray-600">Saves</p>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-semibold text-gray-800 mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedBookmark.tags.map((tag, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          handleTagClick(tag);
                          setSelectedBookmark(null);
                        }}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => window.open(selectedBookmark.url, '_blank')}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                >
                  Open Original Content
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Platform Auth Modal */}
      {authModalPlatform && (
        <PlatformAuthModal
          platform={authModalPlatform}
          onClose={() => setAuthModalPlatform(null)}
          onAuthenticate={(authData) => handlePlatformAuth(authModalPlatform, authData)}
        />
      )}

      {/* Notification Toast */}
      <NotificationToast
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={() => setNotification(prev => ({ ...prev, isVisible: false }))}
      />
    </div>
  );
};

export default BookmarkManager;