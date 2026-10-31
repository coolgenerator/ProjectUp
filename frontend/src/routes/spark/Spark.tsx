import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ExploreIcon from '@mui/icons-material/Explore';
import BookmarksIcon from '@mui/icons-material/Bookmarks';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import Explore from '../../components/spark/Explore';
import BookmarkManager from '../../components/spark/BookmarkManager';

const Spark: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    {
      id: 0,
      label: 'Bookmark Manager',
      icon: <BookmarksIcon className="w-5 h-5" />,
      description: 'Organize your inspirations',
      gradient: 'from-blue-500 to-cyan-500',
      bgPattern: 'bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-50'
    },
    {
      id: 1,
      label: 'Explore',
      icon: <ExploreIcon className="w-5 h-5" />,
      description: 'Discover trending content',
      gradient: 'from-purple-500 to-pink-500',
      bgPattern: 'bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-4">
            <AutoAwesomeIcon className="w-8 h-8 text-white" />
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Spark
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Ignite your creativity and discover innovative ideas
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-4xl mx-auto mb-8"
        >
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-2">
            <div className="grid grid-cols-2 gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    relative group px-6 py-4 rounded-xl transition-all duration-300
                    ${activeTab === tab.id 
                      ? 'bg-gradient-to-r ' + tab.gradient + ' text-white shadow-lg transform scale-[1.02]'
                      : 'bg-transparent hover:bg-gray-50 text-gray-700'
                    }
                  `}
                >
                  <div className="flex items-center justify-center space-x-3">
                    <span className={`
                      transition-transform duration-300 
                      ${activeTab === tab.id ? 'transform rotate-12' : 'group-hover:rotate-12'}
                    `}>
                      {tab.icon}
                    </span>
                    <div className="text-left">
                      <p className="font-semibold">{tab.label}</p>
                      <p className={`text-xs ${activeTab === tab.id ? 'text-white/80' : 'text-gray-500'}`}>
                        {tab.description}
                      </p>
                    </div>
                  </div>
                  
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl -z-10"
                      initial={false}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            {activeTab === 0 ? (
              // Bookmark Manager Tab
              <div className="space-y-6">
                <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-1">
                    <div className="bg-white rounded-t-3xl p-6">
                      <BookmarkManager userId="current-user" />
                    </div>
                  </div>
                </div>
                
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-8"
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                        <BookmarksIcon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-800 mb-3">
                        Smart Bookmark Hub
                      </h3>
                      <p className="text-gray-600 mb-4 leading-relaxed">
                        Import, organize, and discover connections between your saved content. 
                        Our AI analyzes your bookmarks to reveal trends and hidden relationships.
                      </p>
                      <div className="grid md:grid-cols-2 gap-4">
                        {[
                          { icon: '🔗', text: 'Import from multiple platforms' },
                          { icon: '🎨', text: 'Pinterest-style visual browsing' },
                          { icon: '🤖', text: 'AI-powered recommendations' },
                          { icon: '🕸️', text: 'Knowledge graph connections' },
                          { icon: '🏷️', text: 'Smart auto-tagging' },
                          { icon: '📈', text: 'Trending topic analysis' }
                        ].map((feature, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + index * 0.1 }}
                            className="flex items-center space-x-3 bg-gradient-to-r from-blue-50 to-cyan-50 p-3 rounded-lg"
                          >
                            <span className="text-2xl">{feature.icon}</span>
                            <span className="text-gray-700">{feature.text}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            ) : (
              // Explore Tab
              <div className="space-y-6">
                <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-1">
                    <div className="bg-white rounded-t-3xl p-6">
                      <Explore />
                    </div>
                  </div>
                </div>
                
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-8"
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                        <ExploreIcon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-800 mb-3">
                        Explore Community Content
                      </h3>
                      <p className="text-gray-600 mb-4 leading-relaxed">
                        Discover the most popular tutorials, articles, and videos from our vibrant community. 
                        Learn from experts and fellow creators who share their knowledge and experiences.
                      </p>
                      <div className="grid md:grid-cols-2 gap-4">
                        {[
                          { icon: '📚', text: 'Trending tutorials & guides' },
                          { icon: '📰', text: 'Popular articles & blogs' },
                          { icon: '🎥', text: 'Featured video content' },
                          { icon: '⭐', text: 'Top-rated resources' },
                          { icon: '🔥', text: 'Hot topics & discussions' },
                          { icon: '🏆', text: 'Community favorites' }
                        ].map((feature, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + index * 0.1 }}
                            className="flex items-center space-x-3 bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-lg"
                          >
                            <span className="text-2xl">{feature.icon}</span>
                            <span className="text-gray-700">{feature.text}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Floating Action Button */}
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 20 }}
          className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-lg flex items-center justify-center text-white hover:shadow-xl transform hover:scale-110 transition-all duration-300"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </motion.button>
      </div>

      {/* Add custom styles for animations */}
      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default Spark;