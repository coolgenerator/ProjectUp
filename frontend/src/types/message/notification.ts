export interface Notification {
    notification_id: number;
    title: string;
    description: string;
    url: string;
    is_read: boolean;
    created_at: string;
    type?: "application" | "invitation" | "project" | "system";
}