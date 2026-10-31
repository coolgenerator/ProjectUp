import fetchWithAuth from "../hooks/fetchWithAuth";
import config from "../config";

const { API_BASE_URL } = config;

// Resource types
export interface Resource {
    resource_id: string;
    project_id: string;
    name: string;
    resource_type: "link" | "file";
    url?: string;
    file_path?: string;
    category?: string;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}

export interface ResourceRequest {
    name: string;
    resource_type: "link" | "file";
    url: string | null;
    file_path?: string | null;
    category?: string | null;
}

// Workspace types
export interface Workspace {
    workspace_id: string;
    project_id: string;
    title: string;
    content?: string;
    category?: string;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}

export interface WorkspaceRequest {
    title: string;
    content?: string | null;
    category?: string | null;
}

// Project sharing and invitation types
export interface ProjectShare {
    share_id: string;
    project_id: string;
    shared_by: string;
    share_token: string;
    expires_at: string;
    access_level: 'view' | 'edit';
    created_at: string;
    updated_at: string;
}

export interface ProjectInvitation {
    invitation_id: string;
    project_id: string;
    email: string;
    invited_by: string;
    status: 'pending' | 'accepted' | 'rejected';
    role: string;
    permissions: number;
    token: string;
    expires_at: string;
    created_at: string;
    updated_at: string;
}

// Resource service functions
export const getProjectResources = async (projectSid: string): Promise<Resource[]> => {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${projectSid}/resources`);

        if (!response.ok) {
            throw new Error(`Error fetching project resources: ${response.statusText}`);
        }

        const jsonResponse = await response.json();
        return jsonResponse.resources || [];
    } catch (error) {
        console.error("Failed to fetch project resources:", error);
        throw error;
    }
};

export const createResource = async (projectSid: string, resource: ResourceRequest): Promise<Resource> => {
    try {
        // Validate URL is required for links but don't enforce format
        if (resource.resource_type === 'link' && (!resource.url || resource.url === null)) {
            throw new Error("URL is required for link resources");
        }

        console.log("Creating resource with data:", JSON.stringify(resource));
        const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${projectSid}/resources`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(resource),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("Server error response:", errorData);
            throw new Error(`Error creating resource: ${response.statusText} - ${errorData}`);
        }

        const jsonResponse = await response.json();
        return jsonResponse.resource;
    } catch (error) {
        console.error("Failed to create resource:", error);
        throw error;
    }
};

export const updateResource = async (projectSid: string, resourceId: string, resource: ResourceRequest): Promise<Resource> => {
    try {
        // Validate URL is required for links but don't enforce format
        if (resource.resource_type === 'link' && (!resource.url || resource.url === null)) {
            throw new Error("URL is required for link resources");
        }

        const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${projectSid}/resources/${resourceId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(resource),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("Server error response:", errorData);
            throw new Error(`Error updating resource: ${response.statusText} - ${errorData}`);
        }

        const jsonResponse = await response.json();
        return jsonResponse.resource;
    } catch (error) {
        console.error("Failed to update resource:", error);
        throw error;
    }
};

export const deleteResource = async (projectSid: string, resourceId: string): Promise<void> => {
    try {
        // Just marking as deleted rather than actual deletion
        const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${projectSid}/resources/${resourceId}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            throw new Error(`Error deleting resource: ${response.statusText}`);
        }
    } catch (error) {
        console.error("Failed to delete resource:", error);
        throw error;
    }
};

// Workspace service functions
export const getProjectWorkspaces = async (projectSid: string): Promise<Workspace[]> => {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${projectSid}/workspaces`);

        if (!response.ok) {
            throw new Error(`Error fetching project workspaces: ${response.statusText}`);
        }

        const jsonResponse = await response.json();
        return jsonResponse.workspaces || [];
    } catch (error) {
        console.error("Failed to fetch project workspaces:", error);
        throw error;
    }
};

export const createWorkspace = async (projectSid: string, workspace: WorkspaceRequest): Promise<Workspace> => {
    try {
        console.log("Creating workspace with data:", JSON.stringify(workspace));
        const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${projectSid}/workspaces`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(workspace),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("Server error response:", errorData);
            throw new Error(`Error creating workspace: ${response.statusText} - ${errorData}`);
        }

        const jsonResponse = await response.json();
        return jsonResponse.workspace;
    } catch (error) {
        console.error("Failed to create workspace:", error);
        throw error;
    }
};

export const updateWorkspace = async (projectSid: string, workspaceId: string, workspace: WorkspaceRequest): Promise<Workspace> => {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${projectSid}/workspaces/${workspaceId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(workspace),
        });

        if (!response.ok) {
            throw new Error(`Error updating workspace: ${response.statusText}`);
        }

        const jsonResponse = await response.json();
        return jsonResponse.workspace;
    } catch (error) {
        console.error("Failed to update workspace:", error);
        throw error;
    }
};

export const deleteWorkspace = async (projectSid: string, workspaceId: string): Promise<void> => {
    try {
        // Just marking as deleted rather than actual deletion
        const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${projectSid}/workspaces/${workspaceId}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            throw new Error(`Error deleting workspace: ${response.statusText}`);
        }
    } catch (error) {
        console.error("Failed to delete workspace:", error);
        throw error;
    }
};

// Project sharing and invitation service functions
export const inviteProjectMember = async (projectSid: string, email: string, role: string, permissions: number): Promise<ProjectInvitation> => {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${projectSid}/invite`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email,
                role,
                permissions,
            }),
        });

        if (!response.ok) {
            throw new Error(`Error inviting project member: ${response.statusText}`);
        }

        const jsonResponse = await response.json();
        return jsonResponse.invitation;
    } catch (error) {
        console.error("Failed to invite project member:", error);
        throw error;
    }
};

export const createProjectShare = async (projectSid: string, accessLevel: 'view' | 'edit', expiryDays: number): Promise<ProjectShare> => {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${projectSid}/share`, {
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
            throw new Error(`Error creating project share: ${response.statusText}`);
        }

        const jsonResponse = await response.json();
        return jsonResponse.share;
    } catch (error) {
        console.error("Failed to create project share:", error);
        throw error;
    }
};

export const acceptProjectInvitation = async (token: string): Promise<void> => {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/invitations/accept`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ token }),
        });

        if (!response.ok) {
            throw new Error(`Error accepting project invitation: ${response.statusText}`);
        }
    } catch (error) {
        console.error("Failed to accept project invitation:", error);
        throw error;
    }
}; 