import { useState, useEffect } from 'react';
import fetchWithAuth from './fetchWithAuth';
import config from '../config';

const { API_BASE_URL } = config;

interface ProjectInteraction {
    isSaved: boolean;
    isLoved: boolean;
    saveCount: number;
    loveCount: number;
}

// Global state store for project interactions
const interactionStore: Record<string, ProjectInteraction> = {};

// Callbacks to notify components when updates happen
const interactionListeners: Record<string, Set<() => void>> = {};

// Helper to create a unique key for each project
const getProjectKey = (projectId: number) => `project_${projectId}`;

// Helper to notify all listeners for a specific project
const notifyListeners = (projectId: number) => {
    const key = getProjectKey(projectId);
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

export const useProjectInteractions = (projectId: number, initialInteractions: ProjectInteraction) => {
    const projectKey = getProjectKey(projectId);

    // Initialize the store entry if it doesn't exist
    if (!interactionStore[projectKey]) {
        interactionStore[projectKey] = initialInteractions;
    }

    // Use local state to trigger re-renders
    const [, setRefreshTrigger] = useState({});

    // Create a listener set for this project if it doesn't exist
    if (!interactionListeners[projectKey]) {
        interactionListeners[projectKey] = new Set();
    }

    // Register this component as a listener and clean up on unmount
    useEffect(() => {
        const refreshComponent = () => {
            setRefreshTrigger({});
        };

        interactionListeners[projectKey].add(refreshComponent);

        return () => {
            interactionListeners[projectKey].delete(refreshComponent);
            // Clean up the listener set if empty
            if (interactionListeners[projectKey].size === 0) {
                delete interactionListeners[projectKey];
            }
        };
    }, [projectKey]);

    const toggleSave = async () => {
        try {
            // Using the generic interactions endpoint
            const response = await fetchWithAuth(`${API_BASE_URL}/api/content/interactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    entity_type: 1, // 1 = Project Post
                    entity_id: projectId,
                    type: INTERACTION_TYPE.SAVE,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update save status');
            }

            const result = await response.json();
            const isActive = result.is_active;

            // Update the global store
            interactionStore[projectKey] = {
                ...interactionStore[projectKey],
                isSaved: isActive,
                saveCount: isActive
                    ? interactionStore[projectKey].saveCount + 1
                    : Math.max(0, interactionStore[projectKey].saveCount - 1),
            };

            // Notify all components using this project's interactions
            notifyListeners(projectId);
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
                    entity_type: 1, // 1 = Project Post
                    entity_id: projectId,
                    type: INTERACTION_TYPE.LIKE,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update love status');
            }

            const result = await response.json();
            const isActive = result.is_active;

            // Update the global store
            interactionStore[projectKey] = {
                ...interactionStore[projectKey],
                isLoved: isActive,
                loveCount: isActive
                    ? interactionStore[projectKey].loveCount + 1
                    : Math.max(0, interactionStore[projectKey].loveCount - 1),
            };

            // Notify all components using this project's interactions
            notifyListeners(projectId);
        } catch (error) {
            console.error('Error updating love status:', error);
        }
    };

    // Function to fetch current interaction counts
    const refreshInteractions = async () => {
        try {
            const response = await fetchWithAuth(
                `${API_BASE_URL}/api/content/interactions/counts?entity_type=1&entity_id=${projectId}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch interaction counts');
            }

            const data = await response.json();

            // Update the global store
            interactionStore[projectKey] = {
                isLoved: data.is_liked,
                isSaved: data.is_saved,
                loveCount: data.like_count,
                saveCount: data.save_count
            };

            // Notify all components using this project's interactions
            notifyListeners(projectId);
        } catch (error) {
            console.error('Error fetching interaction counts:', error);
        }
    };

    return {
        interactions: interactionStore[projectKey],
        toggleSave,
        toggleLove,
        refreshInteractions,
    };
}; 