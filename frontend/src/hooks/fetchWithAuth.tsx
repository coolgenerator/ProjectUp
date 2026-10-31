import { RootState } from "../store/store";
import { login, logout } from "../store/auth";
import store from "../store/store";
import config from "../config";
import { User } from "../store/auth";

const { API_BASE_URL } = config;

const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const state: RootState = store.getState();
    const token = state.auth.token;
    const refreshToken = state.auth.refreshToken;
    const user = state.auth.user;

    // Check if the user is authenticated
    if (!token || !refreshToken || !user) {
        console.error("Not authenticated. Missing:", { 
            hasToken: !!token, 
            hasRefreshToken: !!refreshToken, 
            hasUser: !!user,
            token: token ? token.substring(0, 20) + '...' : 'none'
        });
        store.dispatch(logout());
        throw new Error("Authentication required. Please log in.");
    }

    // Use Headers API to preserve existing headers and avoid overwriting
    const headers = new Headers(options.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }

    try {
        // Prepend API_BASE_URL if the URL is relative
        const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
        
        // Make the initial request with the current token
        let response = await fetch(fullUrl, {
            ...options,
            headers,
            credentials: 'include',
            mode: 'cors',
        });

        // Handle token expiration (401 Unauthorized)
        if (response.status === 401 && refreshToken) {
            console.warn("Token expired, attempting refresh...");

            try {
                // Try to refresh the token
                const refreshResponse = await fetch(`${API_BASE_URL}/api/refresh-token`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ refreshToken }),
                });

                if (!refreshResponse.ok) {
                    const errorText = await refreshResponse.text();
                    console.error("Failed to refresh token:", errorText);
                    // Clear authentication state
                    store.dispatch(logout());
                    throw new Error("Session expired. Please log in again.");
                }

                // Parse the response to get new tokens
                const tokenData = await refreshResponse.json();
                const newToken = tokenData.token;
                const newRefreshToken = tokenData.refreshToken;

                if (!newToken || !newRefreshToken) {
                    console.error("Invalid token response:", tokenData);
                    store.dispatch(logout());
                    throw new Error("Failed to refresh authentication. Please log in again.");
                }

                // Update Redux store with new tokens
                store.dispatch(
                    login({
                        user: user as User,
                        token: newToken,
                        refreshToken: newRefreshToken,
                    })
                );

                // Retry the original request with the new token
                headers.set("Authorization", `Bearer ${newToken}`);
                response = await fetch(fullUrl, {
                    ...options,
                    headers,
                    credentials: 'include',
                    mode: 'cors',
                });
            } catch (refreshError) {
                // Handle refresh errors
                console.error("Token refresh error:", refreshError);
                store.dispatch(logout());
                throw new Error("Session expired. Please log in again.");
            }
        }

        return response;
    } catch (fetchError) {
        console.error("Network error:", fetchError);
        // Only logout if it's an auth error, not just any network error
        if (fetchError instanceof Error &&
            (fetchError.message.includes("Session expired") ||
                fetchError.message.includes("Authentication required"))) {
            store.dispatch(logout());
        }
        throw new Error("Network request failed. Please check your internet connection.");
    }
};

export default fetchWithAuth;
