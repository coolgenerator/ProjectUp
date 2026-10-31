import fetchWithAuth from '../hooks/fetchWithAuth';
import config from '../config';

const { API_BASE_URL } = config;

export interface Workspace {
    group_id: number;
    project_id: number;
    parent_id?: number;
    name: string;
    description?: string;
    is_main: boolean;
    level: number;
    workspace_type: 'main' | 'team' | 'department';
    color?: string;
    icon?: string;
    sort_order: number;
    created_at: string;
    updated_at: string;
    parent?: Workspace;
    children?: Workspace[];
}

export interface WorkspaceMember {
    user_id: number;
    email: string;
    first_name: string;
    last_name: string;
    avatar?: string;
    role: 'admin' | 'member' | 'viewer';
    joined_at: string;
}

export interface CreateWorkspaceRequest {
    name: string;
    description?: string;
    workspace_type: 'team' | 'department';
    color?: string;
    icon?: string;
}

export interface UpdateWorkspaceRequest {
    name?: string;
    description?: string;
    color?: string;
    icon?: string;
}

export interface AddMemberRequest {
    user_id: number;
    role: 'admin' | 'member' | 'viewer';
}

// Share Link Interfaces
export interface ShareLink {
    share_id: number;
    project_id: number;
    workspace_id?: number;
    share_token: string;
    access_level: 'view' | 'edit';
    created_by: number;
    expires_at?: string;
    is_active: boolean;
    usage_count: number;
    created_at: string;
    updated_at: string;
    workspace?: Workspace;
    creator?: {
        user_id: number;
        email: string;
        first_name: string;
        last_name: string;
        avatar?: string;
    };
}

export interface CreateShareLinkRequest {
    workspace_id?: number;
    access_level: 'view' | 'edit';
    expiry_days: number;
}

export interface ShareLinkUsage {
    usage_id: number;
    share_id: number;
    user_id?: number;
    ip_address: string;
    user_agent: string;
    accessed_at: string;
    action_taken: string;
    user?: {
        email: string;
        first_name: string;
        last_name: string;
    };
}

// Get user's accessible workspaces
export const getUserWorkspaces = async (projectSid: string) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${projectSid}/workspaces`);
    if (!response.ok) {
        throw new Error('Failed to fetch workspaces');
    }
    return await response.json();
};

// Get workspace details
export const getWorkspaceDetails = async (projectSid: string, workspaceId: number) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${projectSid}/workspaces/${workspaceId}`);
    if (!response.ok) throw new Error('Failed to fetch workspace details');
    return await response.json();
};

// Create child workspace
export const createChildWorkspace = async (
    projectSid: string,
    parentId: number,
    data: CreateWorkspaceRequest
) => {
    const response = await fetchWithAuth(
        `${API_BASE_URL}/api/projects/${projectSid}/workspaces/${parentId}/children`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }
    );
    if (!response.ok) throw new Error('Failed to create workspace');
    return await response.json();
};

// Update workspace
export const updateWorkspace = async (
    projectSid: string,
    workspaceId: number,
    data: UpdateWorkspaceRequest
) => {
    const response = await fetchWithAuth(
        `${API_BASE_URL}/api/projects/${projectSid}/workspaces/${workspaceId}`,
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }
    );
    if (!response.ok) throw new Error('Failed to update workspace');
    return await response.json();
};

// Delete workspace
export const deleteWorkspace = async (projectSid: string, workspaceId: number) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${projectSid}/workspaces/${workspaceId}`, {
        method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete workspace');
    return await response.json();
};

// Get workspace members
export const getWorkspaceMembers = async (projectSid: string, workspaceId: number) => {
    const response = await fetchWithAuth(
        `${API_BASE_URL}/api/projects/${projectSid}/workspaces/${workspaceId}/members`
    );
    if (!response.ok) throw new Error('Failed to fetch workspace members');
    const data = await response.json();
    return data.members;
};

// Add member to workspace
export const addWorkspaceMember = async (
    projectSid: string,
    workspaceId: number,
    data: AddMemberRequest
) => {
    const response = await fetchWithAuth(
        `${API_BASE_URL}/api/projects/${projectSid}/workspaces/${workspaceId}/members`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }
    );
    if (!response.ok) throw new Error('Failed to add workspace member');
    return await response.json();
};

// Update member role
export const updateMemberRole = async (
    projectSid: string,
    workspaceId: number,
    userId: number,
    role: 'admin' | 'member' | 'viewer'
) => {
    const response = await fetchWithAuth(
        `${API_BASE_URL}/api/projects/${projectSid}/workspaces/${workspaceId}/members/${userId}`,
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role }),
        }
    );
    if (!response.ok) throw new Error('Failed to update member role');
    return await response.json();
};

// Remove member from workspace
export const removeMemberFromWorkspace = async (
    projectSid: string,
    workspaceId: number,
    userId: number
) => {
    const response = await fetchWithAuth(
        `${API_BASE_URL}/api/projects/${projectSid}/workspaces/${workspaceId}/members/${userId}`,
        { method: 'DELETE' }
    );
    if (!response.ok) throw new Error('Failed to remove workspace member');
    return await response.json();
};

// Get workspace content
export const getWorkspaceMilestones = async (projectSid: string, workspaceId: number) => {
    const response = await fetchWithAuth(
        `${API_BASE_URL}/api/projects/${projectSid}/workspaces/${workspaceId}/milestones`
    );
    if (!response.ok) throw new Error('Failed to fetch milestones');
    const data = await response.json();
    return data.milestones;
};

export const getWorkspaceIdeaTrees = async (projectSid: string, workspaceId: number) => {
    const response = await fetchWithAuth(
        `${API_BASE_URL}/api/projects/${projectSid}/workspaces/${workspaceId}/idea-trees`
    );
    if (!response.ok) throw new Error('Failed to fetch idea trees');
    const data = await response.json();
    return data.idea_trees;
};

export const getWorkspaceResources = async (projectSid: string, workspaceId: number) => {
    const response = await fetchWithAuth(
        `${API_BASE_URL}/api/projects/${projectSid}/workspaces/${workspaceId}/resources`
    );
    if (!response.ok) throw new Error('Failed to fetch resources');
    const data = await response.json();
    return data.resources;
};

// Get project dashboard
export const getProjectDashboard = async (projectSid: string) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${projectSid}/dashboard`);
    if (!response.ok) throw new Error('Failed to fetch dashboard');
    const data = await response.json();
    return data.workspace_summaries;
};

// ==================== Share Link Functions ====================

// Create a new share link
export const createShareLink = async (
    projectSid: string,
    data: CreateShareLinkRequest
): Promise<ShareLink> => {
    const response = await fetchWithAuth(
        `${API_BASE_URL}/api/projects/${projectSid}/share-links`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }
    );
    if (!response.ok) throw new Error('Failed to create share link');
    return await response.json();
};

// Get all share links for a project
export const getProjectShareLinks = async (projectSid: string): Promise<ShareLink[]> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${projectSid}/share-links`);
    if (!response.ok) throw new Error('Failed to fetch share links');
    const data = await response.json();
    return data.share_links;
};

// Get share link by token (public - no auth required)
export const getShareLinkByToken = async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/api/share/${token}`);
    if (!response.ok) throw new Error('Failed to fetch share link');
    return await response.json();
};

// Delete a share link
export const deleteShareLink = async (projectSid: string, shareId: number): Promise<void> => {
    const response = await fetchWithAuth(
        `${API_BASE_URL}/api/projects/${projectSid}/share-links/${shareId}`,
        { method: 'DELETE' }
    );
    if (!response.ok) throw new Error('Failed to delete share link');
};

// Deactivate a share link (without deleting)
export const deactivateShareLink = async (projectSid: string, shareId: number): Promise<void> => {
    const response = await fetchWithAuth(
        `${API_BASE_URL}/api/projects/${projectSid}/share-links/${shareId}/deactivate`,
        { method: 'POST' }
    );
    if (!response.ok) throw new Error('Failed to deactivate share link');
};

// Get usage statistics for a share link
export const getShareLinkUsage = async (
    projectSid: string,
    shareId: number
): Promise<ShareLinkUsage[]> => {
    const response = await fetchWithAuth(
        `${API_BASE_URL}/api/projects/${projectSid}/share-links/${shareId}/usage`
    );
    if (!response.ok) throw new Error('Failed to fetch usage statistics');
    const data = await response.json();
    return data.usage;
};
