import config from '../config';

/**
 * Get real-time suggestions for skills or interests
 * @param query Search query term
 * @param type 'skill' or 'interest'
 * @param limit Optional - number of results to return (default 10)
 * @returns Array of suggestion objects
 */
export const getSuggestions = async (query: string, type: 'skill' | 'interest', limit: number = 10) => {
    try {
        const response = await fetch(`${config.API_BASE_URL}/api/suggestions?query=${encodeURIComponent(query)}&type=${type}&limit=${limit}`);

        if (!response.ok) {
            throw new Error('Failed to fetch suggestions');
        }

        const data = await response.json();
        return data.suggestions || [];
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        return [];
    }
};

/**
 * Get popular skills or interests
 * @param type 'skill' or 'interest'
 * @param limit Optional - number of results to return (default 20)
 * @returns Array of popular items
 */
export const getPopularItems = async (type: 'skill' | 'interest', limit: number = 20) => {
    try {
        const response = await fetch(`${config.API_BASE_URL}/api/popular?type=${type}&limit=${limit}`);

        if (!response.ok) {
            throw new Error('Failed to fetch popular items');
        }

        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error('Error fetching popular items:', error);
        return [];
    }
};

/**
 * Get categorized skills or interests
 * @param type 'skill' or 'interest'
 * @returns Array of category objects containing concepts
 */
export const getCategorizedItems = async (type: 'skill' | 'interest') => {
    try {
        const response = await fetch(`${config.API_BASE_URL}/api/categorized?type=${type}`);

        if (!response.ok) {
            throw new Error('Failed to fetch categorized items');
        }

        const data = await response.json();
        return data.categorized || [];
    } catch (error) {
        console.error('Error fetching categorized items:', error);
        return [];
    }
};

/**
 * Interface for concept suggestion
 */
export interface ConceptSuggestion {
    id: number;
    name: string;
    category_id: number;
    popularity: number;
}

/**
 * Interface for categorized concepts
 */
export interface CategoryWithConcepts {
    category: string;
    concepts: ConceptSuggestion[];
} 