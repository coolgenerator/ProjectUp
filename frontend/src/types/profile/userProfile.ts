export type userProfile = {
    biography: string;
    avatar_url: string;
    preferred_name: string;
    first_name?: string;
    last_name: string;
    username: string;
    display_name_preference?: number;  // Display name preference (0=preferred, 1=first, 2=username)
    school?: string;
    school_email_verified?: boolean;
    sid?: string;  // Short ID for the user
    short_id?: string; // Alternative field name for short ID
    id?: string; // User ID as string to match UserData interface
}