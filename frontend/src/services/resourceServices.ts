import fetchWithAuth from '../hooks/fetchWithAuth';
import config from '../config';

const API_BASE_URL = config.API_BASE_URL;

// Resource types
export interface Resource {
    id: number;
    user_id: number;
    type: 'link' | 'file';
    title: string;
    description?: string;
    url?: string;
    file_name?: string;
    file_size?: number;
    file_type?: string;
    s3_key?: string;
    thumbnail_url?: string;
    tags: string[];
    is_public: boolean;
    project_id?: number;
    created_at: string;
    updated_at: string;
}

export interface Paper {
    id: number;
    title: string;
    authors: string; // This is a JSON string in the response
    venue: string;
    year: number;
    abstract: string;
    doi: string;
    arxiv_id: string;
    tags: string; // This is a comma-separated string in the response
    file_url: string;
    citations?: number;
    read_status?: string;
    rating?: number;
}

export interface ResourceQuota {
    user_id: number;
    user_tier: 'free' | 'premium';
    file_count: number;
    max_file_count: number;
    max_file_size: number;
    total_storage: number;
    max_storage: number;
    updated_at: string;
}

export interface CreateLinkRequest {
    title: string;
    url: string;
    description?: string;
    tags?: string[];
    project_id?: number;
}

export interface UpdateResourceRequest {
    title: string;
    description?: string;
    tags?: string[];
    project_id?: number;
}

// Create a web link resource
export const createWebLink = async (data: CreateLinkRequest): Promise<Resource> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/resources/link`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create web link');
    }

    const result = await response.json();
    return result.data;
};

// Upload a file resource
export const uploadFile = async (
    file: File,
    title: string,
    description?: string,
    tags?: string[],
    projectId?: number
): Promise<Resource> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    if (description) formData.append('description', description);
    if (tags && tags.length > 0) formData.append('tags', tags.join(','));
    if (projectId) formData.append('project_id', projectId.toString());

    const response = await fetchWithAuth(`${API_BASE_URL}/api/resources/upload`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload file');
    }

    const result = await response.json();
    return result.data;
};

// Get user resources with pagination
export const getUserResources = async (
    page: number = 1,
    limit: number = 20,
    type?: 'link' | 'file'
): Promise<{ data: Resource[]; total: number; page: number; limit: number }> => {
    let url = `${API_BASE_URL}/api/resources?page=${page}&limit=${limit}`;
    if (type) url += `&type=${type}`;

    const response = await fetchWithAuth(url);

    if (!response.ok) {
        throw new Error('Failed to fetch resources');
    }

    return response.json();
};

// Get a specific resource
export const getResource = async (resourceId: number): Promise<Resource> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/resources/${resourceId}`);

    if (!response.ok) {
        throw new Error('Failed to fetch resource');
    }

    const result = await response.json();
    return result.data;
};

// Update a resource
export const updateResource = async (
    resourceId: number,
    data: UpdateResourceRequest
): Promise<Resource> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/resources/${resourceId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        throw new Error('Failed to update resource');
    }

    const result = await response.json();
    return result.data;
};

// Delete a resource
export const deleteResource = async (resourceId: number): Promise<void> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/resources/${resourceId}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        throw new Error('Failed to delete resource');
    }
};

// Search resources
export const searchResources = async (query: string): Promise<Resource[]> => {
    const response = await fetchWithAuth(
        `${API_BASE_URL}/api/resources/search?q=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
        throw new Error('Failed to search resources');
    }

    const result = await response.json();
    return result.data;
};

// Get resource quota
export const getResourceQuota = async (): Promise<ResourceQuota> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/resources/quota`);

    if (!response.ok) {
        throw new Error('Failed to fetch resource quota');
    }

    const result = await response.json();
    return result.data;
};

// Recalculate resource quota
export const recalculateResourceQuota = async (): Promise<ResourceQuota> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/resources/quota/recalculate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error('Failed to recalculate resource quota');
    }

    const result = await response.json();
    return result.data;
};

// Get project resources
export const getProjectResources = async (projectId: number): Promise<Resource[]> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${projectId}/resources`);

    if (!response.ok) {
        throw new Error('Failed to fetch project resources');
    }

    const result = await response.json();
    return result.data;
};

export const loadPapers = async (page: number = 1, limit: number = 20): Promise<{ papers: Paper[]; total: number; page: number; limit: number }> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/papers?page=${page}&page_size=${limit}`);
    if (!response.ok) {
        throw new Error('Failed to load papers');
    }
    const data = await response.json();
    return { papers: data.papers || [], total: data.total || 0, page: data.page || 1, limit: data.limit || 20 };
};

// Helper function to format file size
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

// Helper function to get file icon based on type
export const getFileIcon = (fileType?: string): string => {
    if (!fileType) return '📄';
    
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('video')) return '🎥';
    if (fileType.includes('audio')) return '🎵';
    if (fileType.includes('pdf')) return '📑';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('sheet') || fileType.includes('excel')) return '📊';
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '📈';
    if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('tar')) return '📦';
    if (fileType.includes('text')) return '📄';
    
    return '📎';
};