import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PlatformAuthModalProps {
  platform: {
    id: string;
    name: string;
    icon: string;
    color: string;
    bgColor?: string;
  };
  onClose: () => void;
  onAuthenticate: (authData: any) => void;
}

const PlatformAuthModal: React.FC<PlatformAuthModalProps> = ({ platform, onClose, onAuthenticate }) => {
  const [authData, setAuthData] = useState<any>({});
  const [step, setStep] = useState(1);

  const handleSubmit = () => {
    onAuthenticate(authData);
    onClose();
  };

  const renderAuthForm = () => {
    switch (platform.id) {
      case 'youtube':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Choose Authentication Method</h3>
              <div className="grid gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="p-4 border-2 border-gray-200 rounded-xl hover:border-red-500 transition-colors text-left"
                >
                  <h4 className="font-medium mb-1">OAuth 2.0 (Recommended)</h4>
                  <p className="text-sm text-gray-600">Sign in with your Google account to access your liked videos and playlists</p>
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="p-4 border-2 border-gray-200 rounded-xl hover:border-red-500 transition-colors text-left"
                >
                  <h4 className="font-medium mb-1">API Key</h4>
                  <p className="text-sm text-gray-600">Use your YouTube Data API key for basic access</p>
                </button>
              </div>
            </div>

            {step === 2 && (
              <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-700 mb-3">Click below to sign in with Google</p>
                <button
                  onClick={() => {
                    // In real implementation, this would initiate OAuth flow
                    window.open('https://accounts.google.com/oauth2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&scope=https://www.googleapis.com/auth/youtube.readonly&response_type=token', '_blank');
                  }}
                  className="w-full py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Sign in with Google
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  YouTube Data API Key
                </label>
                <input
                  type="text"
                  placeholder="Enter your API key"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  onChange={(e) => setAuthData({ apiKey: e.target.value })}
                />
                <p className="mt-2 text-xs text-gray-500">
                  Get your API key from <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="text-blue-500 hover:underline">Google Cloud Console</a>
                </p>
              </div>
            )}
          </div>
        );

      case 'bilibili':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Bilibili Authentication</h3>
              <p className="text-sm text-gray-600 mb-4">
                To import your Bilibili favorites, we need your session data. This is safe and will only be used to fetch your bookmarks.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SESSDATA Cookie
              </label>
              <input
                type="text"
                placeholder="Enter your SESSDATA"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onChange={(e) => setAuthData({ ...authData, sessdata: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CSRF Token (Optional)
              </label>
              <input
                type="text"
                placeholder="Enter CSRF token"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onChange={(e) => setAuthData({ ...authData, csrf: e.target.value })}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                <strong>How to get SESSDATA:</strong><br/>
                1. Log in to Bilibili<br/>
                2. Open Developer Tools (F12)<br/>
                3. Go to Application → Cookies<br/>
                4. Find and copy SESSDATA value
              </p>
            </div>
          </div>
        );

      case 'xiaohongshu':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">小红书 Authentication</h3>
              <p className="text-sm text-gray-600 mb-4">
                Connect your Xiaohongshu account to import your saved posts and collections.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Access Token
              </label>
              <input
                type="text"
                placeholder="Enter your access token"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                onChange={(e) => setAuthData({ ...authData, accessToken: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User ID
              </label>
              <input
                type="text"
                placeholder="Enter your Xiaohongshu user ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                onChange={(e) => setAuthData({ ...authData, userId: e.target.value })}
              />
            </div>

            <button
              onClick={() => {
                // In real implementation, this would open Xiaohongshu OAuth
                window.open('https://www.xiaohongshu.com/oauth/authorize', '_blank');
              }}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-lg hover:shadow-lg transition-all"
            >
              Connect with 小红书
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl max-w-md w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{platform.icon}</span>
              <h2 className="text-xl font-bold">Connect {platform.name}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {renderAuthForm()}

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all"
              disabled={!authData || Object.keys(authData).length === 0}
            >
              Connect
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PlatformAuthModal;