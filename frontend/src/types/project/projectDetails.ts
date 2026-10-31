import { PostDetails } from "./postDetails";

export type ProjectDetails = {
    id?: number; // Project ID from backend
    sid?: string; // Short ID from backend
    post_id: number;
    cover: File | string | null;
    media: (File | string)[];
    type: string;
    topic: string[];
    topics?: string[];
    name: string;
    startTime: string;
    deadline: string;
    location: string;
    communicationApp: string;
    description: string;
    otherApp: string;
    school: string;
    class: string;
    otherType: string;
    visibility?: number;
    isPublished?: boolean;
    isCompleted?: boolean;
    post?: PostDetails[];
}

export interface Milestone {
    milestone_id?: number;
    project_id?: number;
    parent_id?: number | null;
    title: string;
    description?: string | null;
    due_date?: string | null;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    priority: number; // 0-4
    category?: string | null;
    completed: boolean;
    sort_order: number;
    custom_attributes?: Record<string, any>;
    created_at?: string;
    updated_at?: string;
    children?: Milestone[];
    indentLevel?: number;
}

export interface Resource {
    resource_id?: number;
    project_id?: number;
    title: string;
    resource_type: 'link' | 'file' | 'document' | 'video' | 'other';
    url?: string | null;
    file_path?: string | null;
    description?: string | null;
    category?: string | null;
    tags?: string[];
    icon?: string | null;
    sort_order: number;
    created_at?: string;
    updated_at?: string;
    isNew?: boolean;
}

export interface Workspace {
    workspace_id?: number;
    project_id?: number;
    title: string;
    description?: string | null;
    url?: string | null; // URL link for quick access
    content?: Record<string, any>; // EditorJS content or other structured data
    category?: string | null;
    icon?: string | null;
    color?: string | null;
    sort_order: number;
    created_at?: string;
    updated_at?: string;
    isNew?: boolean;
}