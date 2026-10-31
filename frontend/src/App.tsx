import React, { useEffect, useRef } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import Login from './routes/login/Login';
import Register from './routes/login/Register';
import OAuthCallback from './components/auth/OAuthCallback';
import AuthInitializer from './components/auth/AuthInitializer';
import NavBar from './components/app/NavBar';
import { AppRouter } from './router';
import Footer from "./components/app/Footer";
import ScrollToTop from './components/app/ScrollToTop';
import LanguageSync from './components/LanguageSync';
import { ThemeProvider } from './contexts/ThemeContext';
import { clearOldChats } from './store/chat';
import { clearIdeaForest } from './store/slices/ideaForestSlice';
import { cleanupExpiredData } from './utils/onboardingStorage';
import './i18n/i18n'; // Initialize i18n

const AppContent: React.FC = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const previousPathRef = useRef<string>(location.pathname);

  // Cleanup expired onboarding data on mount
  useEffect(() => {
    console.log('🧹 Cleaning up expired onboarding data');
    cleanupExpiredData();
  }, []);

  const hideNavbarRoutes = ["/edit-profile"];
  const hideFooterRoutes = ["/edit-profile", "/messages"];
  const shouldHideNavbar = hideNavbarRoutes.includes(location.pathname);
  // Hide footer if path includes /dashboard (for project dashboards) or /paper (for paper reader)
  const shouldHideFooter = hideFooterRoutes.includes(location.pathname) || location.pathname.includes('/dashboard') || location.pathname.includes('/paper');

  // MEMORY FIX: Clear old data when navigating away from pages
  useEffect(() => {
    const previousPath = previousPathRef.current;
    const currentPath = location.pathname;

    // If navigating away from /messages route, clear old chats to free memory
    if (previousPath.includes('/messages') && !currentPath.includes('/messages')) {
      console.log('🧹 Clearing old chat history to free memory');
      dispatch(clearOldChats());
    }

    // Extract project IDs from paths (format: /project/{projectId}/...)
    const previousProjectMatch = previousPath.match(/\/project\/([^/]+)/);
    const currentProjectMatch = currentPath.match(/\/project\/([^/]+)/);
    const previousProjectId = previousProjectMatch ? previousProjectMatch[1] : null;
    const currentProjectId = currentProjectMatch ? currentProjectMatch[1] : null;

    // If switching to a different project or leaving project pages, clear ideaForest state
    if (previousProjectId && previousProjectId !== currentProjectId) {
      console.log('🧹 Clearing idea forest state for previous project:', previousProjectId);
      dispatch(clearIdeaForest());
    }

    // Update the previous path
    previousPathRef.current = currentPath;
  }, [location.pathname, dispatch]);

  return (
    <ThemeProvider>
      <AuthInitializer>
        <LanguageSync />
        <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#333',
            color: '#fff',
          },
          success: {
            style: {
              background: '#10b981',
            },
          },
          error: {
            style: {
              background: '#ef4444',
            },
          },
        }}
      />
      <ScrollToTop />
      {!shouldHideNavbar && <NavBar />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/:provider/callback" element={<OAuthCallback />} />
        <Route path="/*" element={<AppRouter />} />
      </Routes>
      {!shouldHideFooter && <Footer />}
      </AuthInitializer>
    </ThemeProvider>
  );
};

export default AppContent;
