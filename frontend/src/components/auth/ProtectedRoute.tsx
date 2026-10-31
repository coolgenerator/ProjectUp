import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireAuth?: boolean;
}

/**
 * ProtectedRoute component for guarding routes that require authentication
 *
 * Features:
 * - Redirects to login with current path as redirect parameter
 * - Preserves query parameters in redirect
 * - Allows authenticated users to access protected content
 *
 * @param children - The component(s) to render if authenticated
 * @param requireAuth - Whether authentication is required (default: true)
 *
 * @example
 * ```tsx
 * <Route path="/project/:id" element={
 *   <ProtectedRoute>
 *     <ProjectPage />
 *   </ProtectedRoute>
 * } />
 * ```
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    requireAuth = true
}) => {
    const location = useLocation();
    const isAuthenticated = useSelector((state: RootState) => state.auth.authenticated);

    if (requireAuth && !isAuthenticated) {
        // Capture the current path with query parameters
        const currentPath = location.pathname + location.search;
        const redirectParam = encodeURIComponent(currentPath);

        // Redirect to login with the redirect parameter
        return <Navigate to={`/login?redirect=${redirectParam}`} replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
