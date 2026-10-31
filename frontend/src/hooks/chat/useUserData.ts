/**
 * Hook for fetching and caching user data for multi-user chat
 * Fetches avatar_url and username from backend based on user_id
 */

import { useState, useEffect } from 'react';
import config from '../../config';

const { BACKEND_URL } = config;

interface UserData {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

// Cache user data to avoid repeated API calls
const userDataCache = new Map<number, UserData>();

/**
 * Fetch user data from backend
 */
const fetchUserData = async (userId: number): Promise<UserData | null> => {
  // Check cache first
  if (userDataCache.has(userId)) {
    return userDataCache.get(userId)!;
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/users/${userId}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      // console.warn(`Failed to fetch user data for user ${userId}`);
      return null;
    }

    const data = await response.json();

    // Extract user data from response
    const userData: UserData = {
      id: data.id || userId,
      username: data.username || `User ${userId}`,
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      avatar: data.avatar || undefined,
    };

    // Cache it
    userDataCache.set(userId, userData);

    return userData;
  } catch (error) {
    // console.error(`Error fetching user data for user ${userId}:`, error);
    return null;
  }
};

/**
 * Hook to fetch user data for a specific user ID
 */
export const useUserData = (userId: number | undefined) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Check cache first
    if (userDataCache.has(userId)) {
      setUserData(userDataCache.get(userId)!);
      setLoading(false);
      return;
    }

    // Fetch from API
    setLoading(true);
    fetchUserData(userId).then((data) => {
      setUserData(data);
      setLoading(false);
    });
  }, [userId]);

  return { userData, loading };
};

/**
 * Hook to fetch user data for multiple user IDs
 * Useful for participant lists
 */
export const useMultipleUserData = (userIds: number[]) => {
  const [usersData, setUsersData] = useState<Map<number, UserData>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userIds.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Fetch all users in parallel
    Promise.all(
      userIds.map(async (userId) => {
        const data = await fetchUserData(userId);
        return { userId, data };
      })
    ).then((results) => {
      const newMap = new Map<number, UserData>();
      results.forEach(({ userId, data }) => {
        if (data) {
          newMap.set(userId, data);
        }
      });
      setUsersData(newMap);
      setLoading(false);
    });
  }, [userIds.join(',')]); // Only re-fetch if user IDs change

  return { usersData, loading };
};

/**
 * Enrich messages with user data (avatar_url and username)
 */
export const enrichMessagesWithUserData = async (
  messages: any[]
): Promise<any[]> => {
  // console.log(`[enrichMessagesWithUserData] Starting enrichment for ${messages.length} messages`);

  // Get all unique user IDs from messages
  const userIds = new Set<number>();
  messages.forEach((msg) => {
    if (msg.role === 'user' && msg.user_id) {
      userIds.add(msg.user_id);
      // console.log(`[enrichMessagesWithUserData] Found user message with user_id: ${msg.user_id}`);
    }
  });

  // console.log(`[enrichMessagesWithUserData] Unique user IDs to fetch: [${Array.from(userIds).join(', ')}]`);

  // Fetch all user data in parallel
  await Promise.all(
    Array.from(userIds).map((userId) => fetchUserData(userId))
  );

  // console.log(`[enrichMessagesWithUserData] User data cache now has ${userDataCache.size} users`);

  // Enrich messages with user data
  return messages.map((msg) => {
    if (msg.role === 'user' && msg.user_id) {
      const userData = userDataCache.get(msg.user_id);
      if (userData) {
        // console.log(`[enrichMessagesWithUserData] Enriched message from user ${msg.user_id} with username: ${userData.username}`);
        return {
          ...msg,
          username: userData.username,
          avatar_url: userData.avatar,
        };
      } else {
        // console.warn(`[enrichMessagesWithUserData] No user data found for user_id: ${msg.user_id}`);
      }
    }
    return msg;
  });
};
