export type SkillItem = {
    id?: number | string;  // Accept both number and string
    name: string;
    level: number;
    customName?: string;
};

export type InterestItem = {
    id?: number | string;  // Accept both number and string
    name: string;
    level: number;
    customName?: string;
};

export type FormData = {
    first_name: string;
    last_name: string;
    username: string;
    prefer_name: string;
    avatar: File | string | null;
    website: string;
    field: string;
    email: string;
    school_email: string;
    school_email_verified: boolean;
    phone: string;
    school: string;
    biography: string;
    state: string;
    city: string;
    zipcode: string;
    country: string;
    language: string[];
    skills: SkillItem[];
    interests: InterestItem[];
    resume: File | null;
}

