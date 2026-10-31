import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ArticleIcon from '@mui/icons-material/Article';
import CodeIcon from '@mui/icons-material/Code';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import StarIcon from '@mui/icons-material/Star';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import CommentIcon from '@mui/icons-material/Comment';
import ShareIcon from '@mui/icons-material/Share';
import PersonIcon from '@mui/icons-material/Person';
import FolderIcon from '@mui/icons-material/Folder';
import TopicIcon from '@mui/icons-material/Topic';
import { CircularProgress, Alert, Chip, Avatar } from '@mui/material';
import config from '../../config';

interface TrendingItem {
  id: string;
  item_type: string;
  item_id: number;
  title: string;
  description: string;
  image_url?: string;
  score: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  tags: string;
  category: string;
  author_id: number;
  author_name: string;
  author_avatar: string;
  created_at: string;
  updated_at: string;
}

interface TrendingResponse {
  items: TrendingItem[];
  total_count: number;
  page: number;
  page_size: number;
}

const Explore: React.FC = () => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('score');
  const [trendingItems, setTrendingItems] = useState<TrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [bookmarkedItems, setBookmarkedItems] = useState<Set<string>>(new Set());

  // Fetch trending items from backend
  const fetchTrendingItems = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: '12',
        sort: sortBy
      });
      
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      
      const response = await fetch(`${config.API_BASE_URL}/api/trending?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch trending items');
      }
      
      const data: TrendingResponse = await response.json();
      setTrendingItems(data.items || []);
      setTotalCount(data.total_count || 0);
    } catch (err) {
      console.error('Error fetching trending items:', err);
      setError(t('spark.explore.loadError'));
      // Use mock data as fallback
      setTrendingItems(getMockTrendingItems());
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/api/trending/categories`);
      if (response.ok) {
        const data = await response.json();
        setAvailableCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };
  
  // Update interaction score
  const updateInteractionScore = async (itemId: string, action: string) => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/api/trending/${itemId}/interact?action=${action}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        // Update local state to reflect the interaction
        setTrendingItems(prev => prev.map(item => {
          if (item.id === itemId) {
            switch(action) {
              case 'view':
                return { ...item, view_count: item.view_count + 1 };
              case 'like':
                return { ...item, like_count: item.like_count + 1 };
              case 'comment':
                return { ...item, comment_count: item.comment_count + 1 };
              case 'share':
                return { ...item, share_count: item.share_count + 1 };
            }
          }
          return item;
        }));
      }
    } catch (err) {
      console.error('Error updating interaction score:', err);
    }
  };
  
  // Mock data as fallback
  const getMockTrendingItems = (): TrendingItem[] => [
    {
      id: '1',
      item_type: 'post',
      item_id: 1,
      title: 'Building Your First AI Assistant with LangChain',
      description: 'Learn how to create an intelligent AI assistant using LangChain and OpenAI APIs.',
      image_url: 'https://picsum.photos/400/225?random=1',
      score: 98.5,
      view_count: 15420,
      like_count: 892,
      comment_count: 156,
      share_count: 45,
      tags: 'AI,LangChain,Python,OpenAI',
      category: 'Technology',
      author_id: 1,
      author_name: 'Sarah Chen',
      author_avatar: 'https://ui-avatars.com/api/?name=Sarah+Chen',
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    },
    {
      id: '2',
      item_type: 'project',
      item_id: 2,
      title: 'Modern Web Development with React 19',
      description: 'Explore the latest features in React 19 and build performant web applications.',
      image_url: 'https://picsum.photos/400/225?random=2',
      score: 95.2,
      view_count: 28350,
      like_count: 1520,
      comment_count: 234,
      share_count: 89,
      tags: 'React,JavaScript,WebDev',
      category: 'Web Development',
      author_id: 2,
      author_name: 'Alex Kumar',
      author_avatar: 'https://ui-avatars.com/api/?name=Alex+Kumar',
      created_at: '2024-01-18',
      updated_at: '2024-01-18'
    },
    {
      id: '3',
      item_type: 'post',
      item_id: 3,
      title: 'The Complete Guide to System Design',
      description: 'Master system design concepts with real-world examples.',
      image_url: 'https://picsum.photos/400/225?random=3',
      score: 92.7,
      view_count: 42100,
      like_count: 2340,
      comment_count: 412,
      share_count: 156,
      tags: 'System Design,Architecture,Scalability',
      category: 'Engineering',
      author_id: 3,
      author_name: 'Michael Park',
      author_avatar: 'https://ui-avatars.com/api/?name=Michael+Park',
      created_at: '2024-01-10',
      updated_at: '2024-01-10'
    }
  ];
  
  // Load data on component mount and when filters change
  useEffect(() => {
    fetchTrendingItems();
  }, [page, sortBy, selectedCategory]);
  
  useEffect(() => {
    fetchCategories();
  }, []);

  const categories = [
    { id: 'all', label: t('spark.explore.allContent'), icon: '🌟' },
    { id: 'Technology', label: t('spark.explore.technology'), icon: '💻' },
    { id: 'Web Development', label: t('spark.explore.webDev'), icon: '🌐' },
    { id: 'Engineering', label: t('spark.explore.engineering'), icon: '⚙️' },
    { id: 'Design', label: t('spark.explore.design'), icon: '🎨' },
    { id: 'Business', label: t('spark.explore.business'), icon: '💼' },
    ...availableCategories.filter(cat => !['Technology', 'Web Development', 'Engineering', 'Design', 'Business'].includes(cat))
      .map(cat => ({ id: cat, label: cat, icon: '📁' }))
  ];

  const sortOptions = [
    { id: 'score', label: t('spark.explore.trending'), icon: <TrendingUpIcon className="w-4 h-4" /> },
    { id: 'views', label: t('spark.explore.mostViewed'), icon: <VisibilityIcon className="w-4 h-4" /> },
    { id: 'likes', label: t('spark.explore.mostLiked'), icon: <ThumbUpIcon className="w-4 h-4" /> },
    { id: 'recent', label: t('spark.explore.recent'), icon: '🕐' }
  ];

  const getItemTypeIcon = (type: string) => {
    switch(type) {
      case 'post':
        return <ArticleIcon className="w-4 h-4" />;
      case 'project':
        return <FolderIcon className="w-4 h-4" />;
      case 'user':
        return <PersonIcon className="w-4 h-4" />;
      case 'topic':
        return <TopicIcon className="w-4 h-4" />;
      default:
        return <CodeIcon className="w-4 h-4" />;
    }
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const toggleBookmark = (itemId: string) => {
    setBookmarkedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleItemClick = (item: TrendingItem) => {
    // Track view interaction
    updateInteractionScore(item.id, 'view');
    
    // Navigate to the actual item based on type
    // This would be implemented based on your routing structure
    console.log('Navigate to item:', item);
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Categories */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('spark.explore.categories')}</h3>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <motion.button
              key={category.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategory(category.id)}
              className={`
                px-4 py-2 rounded-full flex items-center gap-2 transition-all
                ${selectedCategory === category.id
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }
              `}
            >
              <span>{category.icon}</span>
              <span className="font-medium">{category.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Sort Options */}
      <div className="mb-6 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">{t('spark.explore.sortBy')}</h3>
        <div className="flex gap-2">
          {sortOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setSortBy(option.id)}
              className={`
                px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-sm transition-all
                ${sortBy === option.id
                  ? 'bg-purple-100 text-purple-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              {option.icon}
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <CircularProgress />
        </div>
      ) : error ? (
        <Alert severity="error" className="mb-4">
          {error}
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trendingItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer group"
              onClick={() => handleItemClick(item)}
            >
              {/* Thumbnail */}
              {item.image_url && (
                <div className="relative h-48 overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100">
                  <img 
                    src={item.image_url} 
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.src = `https://picsum.photos/400/225?random=${item.id}`;
                    }}
                  />
                  <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
                    {getItemTypeIcon(item.item_type)}
                    <span className="text-xs font-medium capitalize">{item.item_type}</span>
                  </div>
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(item.id);
                      }}
                      className="p-2 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-white transition-colors"
                    >
                      {bookmarkedItems.has(item.id) ? (
                        <BookmarkIcon className="w-5 h-5 text-purple-600" />
                      ) : (
                        <BookmarkBorderIcon className="w-5 h-5 text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="p-5">
                <h3 className="font-bold text-lg text-gray-800 mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
                  {item.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {item.description}
                </p>

                {/* Tags */}
                {item.tags && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {item.tags.split(',').slice(0, 3).map((tag, idx) => (
                      <Chip
                        key={idx}
                        label={tag.trim()}
                        size="small"
                        className="text-xs"
                        variant="outlined"
                      />
                    ))}
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <VisibilityIcon className="w-4 h-4" />
                      {formatCount(item.view_count)}
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbUpIcon className="w-4 h-4" />
                      {formatCount(item.like_count)}
                    </span>
                    <span className="flex items-center gap-1">
                      <CommentIcon className="w-4 h-4" />
                      {formatCount(item.comment_count)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500">
                    <StarIcon className="w-4 h-4" />
                    <span className="font-medium">{item.score.toFixed(1)}</span>
                  </div>
                </div>

                {/* Author */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <Avatar 
                    src={item.author_avatar} 
                    alt={item.author_name}
                    sx={{ width: 28, height: 28 }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{item.author_name}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateInteractionScore(item.id, 'share');
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ShareIcon className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Load More */}
      {!loading && trendingItems.length > 0 && trendingItems.length < totalCount && (
        <div className="mt-8 text-center">
          <button
            onClick={() => setPage(prev => prev + 1)}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all"
          >
            {t('spark.explore.loadMore')}
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && trendingItems.length === 0 && (
        <div className="text-center py-12">
          <TrendingUpIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            {t('spark.explore.noContent')}
          </h3>
          <p className="text-gray-500">
            {t('spark.explore.checkBackLater')}
          </p>
        </div>
      )}
    </div>
  );
};

export default Explore;