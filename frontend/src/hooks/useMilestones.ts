import { useState, useEffect, useCallback } from 'react';
import fetchWithAuth from './fetchWithAuth.tsx';
import config from '../config';

const { API_BASE_URL } = config;

export interface MilestoneData {
    id: string;
    title: string;
    description: string;
    due_date: string;
    status?: string;
    completed: boolean;
    children?: MilestoneData[];
    indentLevel?: number;
    parentId?: string;
    sortOrder?: number;
}

interface UseMilestonesProps {
    projectSid: string;
    useEnhanced?: boolean;
}

interface UseMilestonesReturn {
    milestones: MilestoneData[];
    loading: boolean;
    error: string | null;
    fetchMilestones: () => Promise<void>;
    createMilestone: (milestone: Partial<MilestoneData>) => Promise<MilestoneData | null>;
    updateMilestone: (id: string, data: Partial<MilestoneData>) => Promise<boolean>;
    deleteMilestone: (id: string) => Promise<boolean>;
    saveMilestones: (milestones: MilestoneData[]) => Promise<boolean>;
}

export const useMilestones = ({ projectSid, useEnhanced = true }: UseMilestonesProps): UseMilestonesReturn => {
    const [milestones, setMilestones] = useState<MilestoneData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch all milestones for a project
    const fetchMilestones = useCallback(async () => {
        if (!projectSid) {
            setError('Project ID is required');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Use the enhanced endpoint with hierarchical structure if useEnhanced is true
            const endpoint = useEnhanced
                ? `${API_BASE_URL}/api/project/${projectSid}/milestones/enhanced`
                : `${API_BASE_URL}/api/project/${projectSid}/milestones`;

            console.log(`Fetching milestones from endpoint: ${endpoint}`);
            const response = await fetchWithAuth(endpoint);

            if (!response.ok) {
                throw new Error(`Failed to fetch milestones: ${response.statusText}`);
            }

            const data = await response.json();
            console.log("Fetched milestones data:", data);

            // Inspect the ID format of milestones
            if (data.milestones && data.milestones.length > 0) {
                console.log("First milestone ID format:", data.milestones[0].id);
                console.log("First milestone structure:", JSON.stringify(data.milestones[0], null, 2));
            }

            // Format data based on the response structure
            if (useEnhanced) {
                // The enhanced endpoint returns a hierarchy
                setMilestones(data.milestones || []);
                console.log("Set milestones with hierarchy:", data.milestones);
            } else {
                // The standard endpoint returns a flat list
                // We'll need to convert it to a hierarchy ourselves
                const flatMilestones = data.milestones || [];
                setMilestones(flatMilestones);
            }

        } catch (err) {
            console.error("Error fetching milestones:", err);
            setError("Failed to load milestones");
        } finally {
            setLoading(false);
        }
    }, [projectSid, useEnhanced]);

    // Create a new milestone
    const createMilestone = async (milestone: Partial<MilestoneData>): Promise<MilestoneData | null> => {
        if (!projectSid) {
            setError("Project ID is required");
            return null;
        }

        try {
            setLoading(true);

            // Create a copy of the milestone data to modify
            const milestoneData = { ...milestone };

            // If parentId exists and has the milestone- prefix, extract the numeric part
            if (milestoneData.parentId && milestoneData.parentId.startsWith('milestone-')) {
                milestoneData.parentId = milestoneData.parentId.substring(10);
            }

            const response = await fetchWithAuth(`${API_BASE_URL}/api/project/${projectSid}/milestones`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(milestoneData),
            });

            if (!response.ok) {
                throw new Error(`Failed to create milestone: ${response.statusText}`);
            }

            const newMilestone = await response.json();

            // Update the local state with the new milestone
            if (useEnhanced) {
                // For enhanced mode, we need to maintain the hierarchy
                if (milestoneData.parentId) {
                    // We need the original parent ID (with prefix) for local state comparison
                    const originalParentId = milestone.parentId;

                    // Add as a child of the parent
                    setMilestones(prevMilestones => {
                        const updateChildrenRecursively = (items: MilestoneData[]): MilestoneData[] => {
                            return items.map(item => {
                                // Compare using the original parent ID format
                                if (item.id === originalParentId) {
                                    // Found the parent, add the new milestone as a child
                                    return {
                                        ...item,
                                        children: [...(item.children || []), newMilestone]
                                    };
                                }

                                if (item.children && item.children.length > 0) {
                                    return {
                                        ...item,
                                        children: updateChildrenRecursively(item.children)
                                    };
                                }

                                return item;
                            });
                        };

                        return updateChildrenRecursively(prevMilestones);
                    });
                } else {
                    // Add to the root level
                    setMilestones(prevMilestones => [...prevMilestones, newMilestone]);
                }
            } else {
                // For non-enhanced mode, simply add to the list
                setMilestones(prevMilestones => [...prevMilestones, newMilestone]);
            }

            return newMilestone;
        } catch (err) {
            console.error("Error creating milestone:", err);
            setError("Failed to create milestone");
            return null;
        } finally {
            setLoading(false);
        }
    };

    // Helper function to extract numeric ID from string ID
    const extractNumericId = (id: string): string => {
        console.log(`Extracting numeric ID from original ID: "${id}"`);

        // If ID is null or undefined, return empty string
        if (!id) {
            console.warn("ID is null or undefined");
            return "";
        }

        // If ID is in format "milestone-123", extract the numeric part
        if (id.startsWith('milestone-')) {
            // Get everything after "milestone-"
            const numericPart = id.substring(10);

            // Check if the numeric part is just a single character
            if (numericPart.length === 1) {
                // It might be a character code, so convert to numeric code
                const charCode = numericPart.charCodeAt(0);
                console.log(`Converting character "${numericPart}" to code: ${charCode}`);
                return charCode.toString();
            }

            // It's a normal string, return as is
            console.log(`Extracted numeric part: "${numericPart}"`);
            return numericPart;
        }

        // If the ID is a single character (might be a character code)
        if (id.length === 1) {
            const charCode = id.charCodeAt(0);
            console.log(`Converting single character "${id}" to code: ${charCode}`);
            return charCode.toString();
        }

        // For any other format, return the original ID
        console.log(`Using original ID: "${id}"`);
        return id;
    };

    // Update an existing milestone
    const updateMilestone = async (id: string, data: Partial<MilestoneData>): Promise<boolean> => {
        if (!projectSid || !id) {
            setError("Project ID and milestone ID are required");
            return false;
        }

        try {
            setLoading(true);

            // Extract numeric ID from string ID for API call
            const numericId = extractNumericId(id);
            console.log(`Updating milestone: Original ID=${id}, Extracted ID=${numericId}`, data);

            // Make sure numericId is not empty
            if (!numericId) {
                console.error("Failed to extract numeric ID from:", id);
                throw new Error("Invalid milestone ID format");
            }

            // Ensure the URL ends with the milestone ID
            const url = `${API_BASE_URL}/api/project/${projectSid}/milestones/${numericId}`;
            console.log(`Making PATCH request to: ${url}`);

            const response = await fetchWithAuth(url, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            console.log(`Update milestone response status: ${response.status}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Failed to update milestone: ${response.statusText}`, errorText);
                throw new Error(`Failed to update milestone: ${response.statusText}`);
            }

            // Update the local state with the changes
            setMilestones(prevMilestones => {
                const updateMilestoneRecursively = (items: MilestoneData[]): MilestoneData[] => {
                    return items.map(item => {
                        if (item.id === id) {
                            // Update this milestone
                            return { ...item, ...data };
                        }

                        if (item.children && item.children.length > 0) {
                            return {
                                ...item,
                                children: updateMilestoneRecursively(item.children)
                            };
                        }

                        return item;
                    });
                };

                // If we're changing completion status, we need to re-sort the milestones
                if ('completed' in data) {
                    const updatedMilestones = updateMilestoneRecursively(prevMilestones);

                    // Sort top-level milestones with completed at the bottom
                    return [...updatedMilestones].sort((a, b) => {
                        if (a.completed === b.completed) return 0;
                        return a.completed ? 1 : -1;
                    });
                }

                return updateMilestoneRecursively(prevMilestones);
            });

            return true;
        } catch (err) {
            console.error("Error updating milestone:", err);
            setError("Failed to update milestone");
            return false;
        } finally {
            setLoading(false);
        }
    };

    // Delete a milestone
    const deleteMilestone = async (id: string): Promise<boolean> => {
        if (!projectSid || !id) {
            setError("Project ID and milestone ID are required");
            return false;
        }

        try {
            setLoading(true);

            // Extract numeric ID from string ID for API call
            const numericId = extractNumericId(id);
            console.log(`Deleting milestone: Original ID=${id}, Extracted ID=${numericId}`);

            // Make sure numericId is not empty
            if (!numericId) {
                console.error("Failed to extract numeric ID from:", id);
                throw new Error("Invalid milestone ID format");
            }

            // Ensure the URL ends with the milestone ID
            const url = `${API_BASE_URL}/api/project/${projectSid}/milestones/${numericId}`;
            console.log(`Making DELETE request to: ${url}`);

            const response = await fetchWithAuth(url, {
                method: 'DELETE',
            });

            console.log(`Delete milestone response status: ${response.status}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Failed to delete milestone: ${response.statusText}`, errorText);
                throw new Error(`Failed to delete milestone: ${response.statusText}`);
            }

            // Update the local state by removing the milestone
            setMilestones(prevMilestones => {
                const deleteMilestoneRecursively = (items: MilestoneData[]): MilestoneData[] => {
                    return items.filter(item => {
                        if (item.id === id) {
                            return false; // Remove this item
                        }

                        if (item.children && item.children.length > 0) {
                            item.children = deleteMilestoneRecursively(item.children);
                        }

                        return true;
                    });
                };

                return deleteMilestoneRecursively(prevMilestones);
            });

            return true;
        } catch (err) {
            console.error("Error deleting milestone:", err);
            setError("Failed to delete milestone");
            return false;
        } finally {
            setLoading(false);
        }
    };

    // Save all milestones at once (typically after drag and drop reordering)
    const saveMilestones = async (updatedMilestones: MilestoneData[]): Promise<boolean> => {
        if (!projectSid) {
            setError("Project ID is required");
            return false;
        }

        try {
            setLoading(true);

            // Prepare the data for the backend
            // The backend expects milestone IDs in numeric form
            const preparedMilestones = updatedMilestones.map(milestone => {
                // Create a copy to avoid modifying the original milestone
                const prepared = { ...milestone };

                // Convert string ID to numeric ID if it has the milestone- prefix
                if (prepared.id && prepared.id.startsWith('milestone-')) {
                    prepared.id = prepared.id.substring(10);
                }

                // Also handle parentId if present
                if (prepared.parentId && prepared.parentId.startsWith('milestone-')) {
                    prepared.parentId = prepared.parentId.substring(10);
                }

                return prepared;
            });

            // Check if we should use the batch endpoint or the regular endpoint
            const endpoint = `${API_BASE_URL}/api/project/${projectSid}/milestones`;

            const response = await fetchWithAuth(endpoint, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(preparedMilestones),
            });

            if (!response.ok) {
                throw new Error(`Failed to save milestones: ${response.statusText}`);
            }

            // Update the local state with the new milestones array
            setMilestones(updatedMilestones);

            return true;
        } catch (err) {
            console.error("Error saving milestones:", err);
            setError("Failed to save milestones");
            return false;
        } finally {
            setLoading(false);
        }
    };

    // Fetch milestones on initial load
    useEffect(() => {
        fetchMilestones();
    }, [fetchMilestones]);

    return {
        milestones,
        loading,
        error,
        fetchMilestones,
        createMilestone,
        updateMilestone,
        deleteMilestone,
        saveMilestones,
    };
}; 