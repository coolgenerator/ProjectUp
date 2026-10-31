import fetchWithAuth from "../hooks/fetchWithAuth";
import config from "../config";
import { userProfile } from "../types/profile/userProfile";

const { API_BASE_URL } = config;

export const getUserProfile = async (userId: number): Promise<userProfile> => {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/get-profile?id=${userId}`);

        if (!response.ok) {
            throw new Error(`Error fetching user profile: ${response.statusText}`);
        }

        const jsonResponse: any = await response.json();
        const data: userProfile = jsonResponse.profile;
        return data;
    } catch (error) {
        console.error("Failed to fetch user profile:", error);
        throw error;
    }
};

export const fetchUserProfiles = async (userIds: number[]) => {
    try {
        const users = await Promise.all(
            userIds.map(async (userId) => {
                const userResponse = await fetchWithAuth(`${API_BASE_URL}/api/get-profile?id=${userId}`);
                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    return { id: userId, ...userData.profile };
                }
                return { id: userId, preferred_name: "Unknown User", avatar_url: "/assets/default-avatar.png" };
            })
        );

        return Object.fromEntries(users.map((user) => [user.id, user])); // Convert array to object for easy access
    } catch (error) {
        console.error("Error fetching user profiles:", error);
        return {};
    }
};

/**
 * Get a user profile by their numeric ID by first getting the user details
 * This helps work around the profile endpoint's limitations
 */
export const getUserProfileById = async (userId: number) => {
    try {
        // Use the user-specific profile endpoint
        const response = await fetchWithAuth(`${API_BASE_URL}/api/get-user-profile?user_id=${userId}`);

        if (!response.ok) {
            throw new Error(`Error fetching user profile: ${response.statusText}`);
        }

        const data = await response.json();

        // Ensure the ShortID is preserved in the returned data
        if (data && !data.sid && data.short_id) {
            data.sid = data.short_id;
        }

        // Filter out skills and interests objects as they might cause rendering issues
        // They will be properly loaded and formatted when viewing the full profile
        const processedData = { ...data };

        // Remove skills and interests from the data or transform them to ensure they're safe for rendering
        if (processedData.skills) {
            delete processedData.skills;
        }

        if (processedData.interests) {
            delete processedData.interests;
        }

        return processedData;
    } catch (error) {
        console.error(`Failed to fetch profile for user ${userId}:`, error);
        return null;
    }
};