import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store/store";
import { login, logout } from "../store/auth";
import store from "../store/store";
import config from "../config";
import { User } from "../store/auth";
import { useLocation } from "react-router-dom";

const { API_BASE_URL } = config;

const withAuth = (WrappedComponent: React.ComponentType) => {
    return (props: any) => {
        const dispatch = useDispatch();
        const location = useLocation();
        const isAuthenticated = useSelector((state: RootState) => state.auth.authenticated);
        const user = useSelector((state: RootState) => state.auth.user);
        const token = useSelector((state: RootState) => state.auth.token);
        const refreshToken = useSelector((state: RootState) => state.auth.refreshToken);

        useEffect(() => {
            let isMounted = true;
            const checkAndRefreshToken = async () => {
                if (!token && refreshToken) {
                    try {
                        const refreshResponse = await fetch(`${API_BASE_URL}/api/refresh-token`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ refreshToken }),
                        });

                        if (refreshResponse.ok) {
                            const { token: newToken, refreshToken: newRefreshToken } = await refreshResponse.json();

                            // Update Redux store with new tokens
                            store.dispatch(
                                login({
                                    user: store.getState().auth.user as User,
                                    token: newToken,
                                    refreshToken: newRefreshToken,
                                })
                            );
                        } else {
                            console.error("Failed to refresh token:", await refreshResponse.json());
                            dispatch(logout());
                            const currentPath = location.pathname + location.search;
                            const redirectParam = encodeURIComponent(currentPath);
                            alert("Session expired. Please log in again.");
                            window.location.href = `/login?logout=true&redirect=${redirectParam}`;
                        }
                    } catch (error) {
                        console.error("Token refresh error:", error);
                        dispatch(logout());
                        const currentPath = location.pathname + location.search;
                        const redirectParam = encodeURIComponent(currentPath);
                        alert("Session expired. Please log in again.");
                        window.location.href = `/login?logout=true&redirect=${redirectParam}`;
                    }
                }
            };

            if (!isAuthenticated) {
                // Only show alert if we're not already on the login page
                if (isMounted && location.pathname !== "/login") {
                    // Check if user came from logout
                    const urlParams = new URLSearchParams(window.location.search);
                    const fromLogout = urlParams.get('logout') === 'true';

                    // Capture the current URL for post-login redirect
                    const currentPath = location.pathname + location.search;
                    const redirectParam = encodeURIComponent(currentPath);

                    // Only show the alert if not coming from logout
                    if (!fromLogout) {
                        setTimeout(() => {
                            alert("Please log in first!");
                            window.location.href = `/login?redirect=${redirectParam}`;
                        }, 500);
                    } else {
                        // If from logout, just redirect without alert
                        window.location.href = `/login?logout=true&redirect=${redirectParam}`;
                    }
                }
            } else {
                // Check if this is a session immediately after login
                const fromLogin = sessionStorage.getItem('fromLogin') === 'true';

                // Only proceed with token check if it's not a login session
                if (!fromLogin) {
                    checkAndRefreshToken().then(() => {
                        if (user && !user.avatar) {
                            setTimeout(() => {
                                window.location.href = "/edit-profile";
                            }, 500);
                        }
                    });
                }
            }

            return () => {
                isMounted = false; // Cleanup function to prevent state update on unmounted component
            };
        }, [isAuthenticated, user, token, refreshToken, dispatch, location.pathname]);

        return isAuthenticated ? <WrappedComponent {...props} /> : null;
    };
};

export default withAuth;
