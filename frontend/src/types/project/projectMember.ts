export interface ProjectGroup {
    group_id: number;
    name: string;
    permissions: number;
    description?: string;
    group_type?: string;
    created_at?: string;
}

export interface ProjectMember {
    user_id: number;
    avatar?: string;
    username: string;
    preferred_name?: string;
    first_name?: string;
    last_name?: string;
    display_name_preference?: number;
    email: string;
    permissions: number;
    group: ProjectGroup;
    joined_at: string;
    // Legacy fields for backward compatibility
    name: string;
    role?: string;
    permissionsBitmask?: number;
    group_id: number;
}