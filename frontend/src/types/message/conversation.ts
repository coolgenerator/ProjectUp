export interface Conversation {
    id: number;
    short_id: string;
    name: string;
    lastMessage: string;
    timestamp: string;
    avatar_url?: string;
    user1_id: number;
    user2_id: number;
}