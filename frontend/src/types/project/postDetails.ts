import { Position } from './positions';

export type PostDetails = {
    title: string,
    cover: File | string | null;
    media: (File | string)[];
    startDate: string;
    deadline: string;
    location: string;
    topic: string[];
    description: string;
    otherType: string;
    positions: Position[];
    questions: Question[];
    visibility: number | null;
    publishProject?: boolean;
}

export type Question = {
    type: number;
    text: string;
    choices: string[];
}