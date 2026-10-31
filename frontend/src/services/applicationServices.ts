import fetchWithAuth from "../hooks/fetchWithAuth";
import config from "../config";

const { API_BASE_URL } = config;

export const updateApplicationStatus = async (
    applicationId: number,
    status: 'accept' | 'decline' | 'reconsider',
    groupId?: number,
    permissions?: number
) => {
    try {
        const statusCode = status === 'accept' ? 1 : status === 'decline' ? 2 : 0; // 0 for reconsider (pending)

        const requestBody: any = { status: statusCode };

        // Only include group and permissions if this is an accept request
        if (status === 'accept' && groupId !== undefined) {
            requestBody.group_id = groupId;

            if (permissions !== undefined) {
                requestBody.permissions = permissions;
            }
        }

        const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/applications/${applicationId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || 'Failed to update application status');
        }

        return await response.json();
    } catch (error) {
        console.error('Error updating application status:', error);
        throw error;
    }
}; 