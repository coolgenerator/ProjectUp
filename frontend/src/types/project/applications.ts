export interface ApplicationAnswer {
    answer_id: number;
    application_id: number;
    question_id: number;
    answer_text: string;
    created_at: string;
}

export interface ApplicationQuestion {
    question_id: number;
    post_id: number;
    text: string;
    type: number;
    choices?: string[];
    created_at: string;
    answers?: ApplicationAnswer[];
}

export interface User {
    id: number;
    name: string;
    username: string;
    avatar: string;
}

export interface ProjectApplication {
    application_id: number;
    user_id: number;
    post_id: number;
    status: number;
    applied_at: string;
    review_at?: string;
    description: string;
    created_at: string;
    answers: ApplicationAnswer[];
    // Flattened user fields
    preferred_name?: string;
    first_name?: string;
    last_name?: string;
    username?: string;
    avatar?: string;
}
