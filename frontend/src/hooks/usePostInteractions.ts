import { useState, useEffect } from 'react';
import fetchWithAuth from './fetchWithAuth';
import config from '../config';

const { API_BASE_URL } = config;

interface PostInteraction {
    isSaved: boolean;
    isLoved: boolean;
    saveCount: number;
    loveCount: number;
}

// Global state store for post interactions
const interactionStore: Record<string, PostInteraction> = {};

// Callbacks to notify components when updates happen
const interactionListeners: Record<string, Set<() => void>> = {};

// Helper to create a unique key for each post
const getPostKey = (postId: number) => `post_${postId}`;

// Helper to notify all listeners for a specific post
const notifyListeners = (postId: number) => {
    const key = getPostKey(postId);
    if (interactionListeners[key]) {
        interactionListeners[key].forEach(callback => callback());
    }
};

// Interaction type constants to match backend
const INTERACTION_TYPE = {
    LIKE: 1,
    SAVE: 2,
    VIEW: 3,
    SHARE: 4,
};

export const usePostInteractions = (postId: number, initialInteractions: PostInteraction) => {
    const postKey = getPostKey(postId);

    // Initialize the store entry if it doesn't exist
    if (!interactionStore[postKey]) {
        interactionStore[postKey] = initialInteractions;
    }

    // Use local state to trigger re-renders
    const [, setRefreshTrigger] = useState({});

    // Create a listener set for this post if it doesn't exist
    if (!interactionListeners[postKey]) {
        interactionListeners[postKey] = new Set();
    }

    // Register this component as a listener and clean up on unmount
    useEffect(() => {
        const refreshComponent = () => {
            setRefreshTrigger({});
        };

        interactionListeners[postKey].add(refreshComponent);

        return () => {
            interactionListeners[postKey].delete(refreshComponent);
            // Clean up the listener set if empty
            if (interactionListeners[postKey].size === 0) {
                delete interactionListeners[postKey];
            }
        };
    }, [postKey]);

    const toggleSave = async () => {
        try {
            // Using the generic interactions endpoint
            const response = await fetchWithAuth(`${API_BASE_URL}/api/content/interactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    entity_type: 2, // 2 = General Post (updated from 1)
                    entity_id: postId,
                    type: INTERACTION_TYPE.SAVE,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update save status');
            }

            const result = await response.json();
            const isActive = result.is_active;

            // Update the global store
            interactionStore[postKey] = {
                ...interactionStore[postKey],
                isSaved: isActive,
                saveCount: isActive
                    ? interactionStore[postKey].saveCount + 1
                    : Math.max(0, interactionStore[postKey].saveCount - 1),
            };

            // Notify all components using this post's interactions
            notifyListeners(postId);
        } catch (error) {
            console.error('Error updating save status:', error);
        }
    };

    const toggleLove = async () => {
        try {
            // Using the generic interactions endpoint
            const response = await fetchWithAuth(`${API_BASE_URL}/api/content/interactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    entity_type: 2, // 2 = General Post (updated from 1)
                    entity_id: postId,
                    type: INTERACTION_TYPE.LIKE,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update love status');
            }

            const result = await response.json();
            const isActive = result.is_active;

            // Update the global store
            interactionStore[postKey] = {
                ...interactionStore[postKey],
                isLoved: isActive,
                loveCount: isActive
                    ? interactionStore[postKey].loveCount + 1
                    : Math.max(0, interactionStore[postKey].loveCount - 1),
            };

            // Notify all components using this post's interactions
            notifyListeners(postId);
        } catch (error) {
            console.error('Error updating love status:', error);
        }
    };

    // Function to fetch current interaction counts
    const refreshInteractions = async () => {
        try {
            const response = await fetchWithAuth(
                `${API_BASE_URL}/api/content/interactions/counts?entity_type=2&entity_id=${postId}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch interaction counts');
            }

            const data = await response.json();

            // Update the global store
            interactionStore[postKey] = {
                isLoved: data.is_liked,
                isSaved: data.is_saved,
                loveCount: data.like_count,
                saveCount: data.save_count
            };

            // Notify all components using this post's interactions
            notifyListeners(postId);
        } catch (error) {
            console.error('Error fetching interaction counts:', error);
        }
    };

    return {
        interactions: interactionStore[postKey],
        toggleSave,
        toggleLove,
        refreshInteractions,
    };
}; 