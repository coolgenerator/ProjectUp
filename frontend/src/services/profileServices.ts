import fetchWithAuth from "../hooks/fetchWithAuth";
import config from "../config";

const { API_BASE_URL } = config;

export const addSkillToProfile = async (skillName: string, level: number) => {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/profile/skills`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: skillName,
                level: level
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to add skill: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to add skill to profile:', error);
        throw error;
    }
};

export const addInterestToProfile = async (interestName: string, level: number) => {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/profile/interests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: interestName,
                level: level
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to add interest: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to add interest to profile:', error);
        throw error;
    }
};

export const removeSkillFromProfile = async (skillId: string) => {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/profile/skills/${skillId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error(`Failed to remove skill: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to remove skill from profile:', error);
        throw error;
    }
};

export const removeInterestFromProfile = async (interestId: string) => {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/profile/interests/${interestId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error(`Failed to remove interest: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to remove interest from profile:', error);
        throw error;
    }
};