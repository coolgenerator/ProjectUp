import fetchWithAuth from "../hooks/fetchWithAuth";
import config from "../config";

const { API_BASE_URL } = config;

// Permission bitmask constants - Must match backend permission values
export const PERMISSIONS = {
    VIEW: 1 << 0,                // 1 - Can view resource
    EDIT: 1 << 1,                // 2 - Can edit resource
    DELETE: 1 << 2,              // 4 - Can delete resource
    SHARE: 1 << 3,               // 8 - Can share resource
    INVITE: 1 << 6,              // 64 - Can invite members
    MANAGE_TEAM: 1 << 7,         // 128 - Can manage team members
    // Deprecated/renamed for compatibility
    EDIT_PROJECT: 1 << 1,        // 2 - Alias for EDIT
    MANAGE_APPLICATIONS: 1 << 3, // 8 - Alias for SHARE (used for managing applications)
    SCHEDULE: 1 << 0,            // 1 - Alias for VIEW (deprecated)
    MANAGE_GROUP: 1 << 7,        // 128 - Alias for MANAGE_TEAM
    MANAGE_PROJECT: 1 << 2,      // 4 - Alias for DELETE
} as const;

// Predefined group types
export const GROUP_TYPES = {
    ADMIN: 'admin',
    MANAGER: 'manager',
    MEMBER: 'member',
} as const;

// Predefined group permissions
export const GROUP_PERMISSIONS = {
    [GROUP_TYPES.ADMIN]: PERMISSIONS.VIEW | PERMISSIONS.EDIT | PERMISSIONS.DELETE |
        PERMISSIONS.SHARE | PERMISSIONS.INVITE | PERMISSIONS.MANAGE_TEAM,

    [GROUP_TYPES.MANAGER]: PERMISSIONS.VIEW | PERMISSIONS.EDIT | PERMISSIONS.SHARE | PERMISSIONS.INVITE,

    [GROUP_TYPES.MEMBER]: PERMISSIONS.VIEW,
} as const;

export interface ProjectGroup {
    group_id: number;
    name: string;
    description: string;
    permissions: number;
    group_type: string;
    created_at: string;
    is_default?: boolean;
}

export interface InviteRequest {
    email: string;
    group_id: number;
    expires_at?: string;
}

export const inviteProjectMember = async (projectSid: string, inviteData: InviteRequest) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${projectSid}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteData),
    });
    return response.json();
};

export const createProjectShare = async (projectSid: string, accessLevel: 'view' | 'edit', expiryDays: number) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${projectSid}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_level: accessLevel, expiry_days: expiryDays }),
    });
    return response.json();
};

export const acceptProjectInvitation = async (token: string) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/invitations/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
    });
    return response.json();
};

// Project post sharing interface
export interface ProjectPostShare {
    share_id: number;
    post_id: number;
    shared_by: number;
    share_token: string;
    expires_at: string;
    access_level: 'view' | 'edit';
    created_at: string;
    updated_at: string;
}

// Project post sharing functions
export const createPostShare = async (postId: string, accessLevel: 'view' | 'edit', expiryDays: number): Promise<ProjectPostShare> => {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/posts/${postId}/share`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                access_level: accessLevel,
                expiry_days: expiryDays,
            }),
        });

        if (!response.ok) {
            throw new Error(`Error creating post share: ${response.statusText}`);
        }

        const jsonResponse = await response.json();
        return jsonResponse.share;
    } catch (error) {
        console.error("Failed to create post share:", error);
        throw error;
    }
};

export const getPostShareByToken = async (token: string): Promise<ProjectPostShare> => {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/posts/share/${token}`);
        if (!response.ok) {
            throw new Error(`Error getting post share: ${response.statusText}`);
        }
        return response.json();
    } catch (error) {
        console.error("Failed to get post share:", error);
        throw error;
    }
};

export const deletePostShare = async (shareId: number): Promise<void> => {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/posts/share/${shareId}`, {
            method: "DELETE",
        });
        if (!response.ok) {
            throw new Error(`Error deleting post share: ${response.statusText}`);
        }
    } catch (error) {
        console.error("Failed to delete post share:", error);
        throw error;
    }
};

// Group management functions
export const createGroup = async (projectSid: string, data: Omit<ProjectGroup, 'group_id' | 'created_at'>): Promise<ProjectGroup> => {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${projectSid}/groups`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error(`Error creating group: ${response.statusText}`);
        }

        return response.json();
    } catch (error) {
        console.error("Failed to create group:", error);
        throw error;
    }
};

export const getGroups = async (projectSid: string): Promise<ProjectGroup[]> => {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${projectSid}/groups`);
        if (!response.ok) {
            throw new Error(`Error getting groups: ${response.statusText}`);
        }
        const data = await response.json();
        return data.groups;
    } catch (error) {
        console.error("Failed to get groups:", error);
        throw error;
    }
};

export const updateGroup = async (projectSid: string, groupId: number, data: Partial<ProjectGroup>): Promise<ProjectGroup> => {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${projectSid}/groups/${groupId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error(`Error updating group: ${response.statusText}`);
        }

        return response.json();
    } catch (error) {
        console.error("Failed to update group:", error);
        throw error;
    }
};

export const deleteGroup = async (projectSid: string, groupId: number): Promise<void> => {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${projectSid}/groups/${groupId}`, {
            method: "DELETE",
        });
        if (!response.ok) {
            throw new Error(`Error deleting group: ${response.statusText}`);
        }
    } catch (error) {
        console.error("Failed to delete group:", error);
        throw error;
    }
};

// Member management functions
export interface ProjectMember {
    user_id: number;
    name: string;
    email: string;
    avatar?: string;
    group_id: number;
    permissions: number;
    joined_at: string;
}

export const updateMemberGroup = async (projectSid: string, userId: number, groupId: number): Promise<void> => {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${projectSid}/members/${userId}/group`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ group_id: groupId }),
        });

        if (!response.ok) {
            throw new Error(`Error updating member group: ${response.statusText}`);
        }
    } catch (error) {
        console.error("Failed to update member group:", error);
        throw error;
    }
};

export const inviteMember = async (projectSid: string, data: { email: string; group_id: number; expires_at?: string }): Promise<void> => {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${projectSid}/invite`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error(`Error inviting member: ${response.statusText}`);
        }
    } catch (error) {
        console.error("Failed to invite member:", error);
        throw error;
    }
};

export const acceptInvitation = async (token: string): Promise<void> => {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/invitations/accept`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ token }),
        });

        if (!response.ok) {
            throw new Error(`Error accepting invitation: ${response.statusText}`);
        }
    } catch (error) {
        console.error("Failed to accept invitation:", error);
        throw error;
    }
};

// Helper function to check if a permission is set
export const hasPermission = (permissions: number, permission: number): boolean => {
    return (permissions & permission) === permission;
};

// Helper function to combine permissions
export const combinePermissions = (...permissions: number[]): number => {
    return permissions.reduce((acc, permission) => acc | permission, 0);
};

// Share link functions
export interface ShareLink {
    share_id: number;
    project_id: number;
    workspace_id?: number;
    share_token: string;
    access_level: string;
    expires_at?: string;
    is_active: boolean;
    usage_count: number;
}

export const getShareLinkByToken = async (token: string): Promise<any> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/share/${token}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            throw new Error(`Error getting share link: ${response.statusText}`);
        }

        return response.json();
    } catch (error) {
        console.error("Failed to get share link:", error);
        throw error;
    }
};

export const acceptShareLink = async (token: string): Promise<any> => {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/share/${token}/accept`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to accept share link");
        }

        return response.json();
    } catch (error) {
        console.error("Failed to accept share link:", error);
        throw error;
    }
}; 