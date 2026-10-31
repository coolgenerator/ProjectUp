import fetchWithAuth from '../hooks/fetchWithAuth';
import config from '../config';

const AI_AGENT_URL = config.AI_AGENT_URL || 'http://localhost:8000';

export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: string;
}

export interface ChatRequest {
    message: string;
    context?: string;
    paper_id?: number;
    paper_title?: string;
    paper_content?: string;
}

export interface ChatResponse {
    response: string;
    workflow_id?: string;
    state?: any;
}

export interface WorkflowRequest {
    workflow_type: 'chat' | 'project_planning' | 'research' | 'custom';
    initial_state: any;
    config?: any;
}

export interface WorkflowResponse {
    workflow_id: string;
    state: any;
    status: string;
}

export interface PaperAnalysisRequest {
    paper_id: number;
    paper_title: string;
    paper_abstract?: string;
    paper_content?: string;
    analysis_type: 'summary' | 'key_points' | 'methodology' | 'critique' | 'questions';
}

export interface PaperAnalysisResponse {
    analysis: string;
    key_insights?: string[];
    suggestions?: string[];
}

// Chat with AI about a paper
export const chatWithPaper = async (request: ChatRequest): Promise<ChatResponse> => {
    const response = await fetch(`${AI_AGENT_URL}/ai-api/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to chat with AI');
    }

    return response.json();
};

// Analyze paper with AI
export const analyzePaper = async (request: PaperAnalysisRequest): Promise<PaperAnalysisResponse> => {
    const response = await fetch(`${AI_AGENT_URL}/ai-api/papers/analyze`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to analyze paper');
    }

    return response.json();
};

// Create a workflow for complex tasks
export const createWorkflow = async (request: WorkflowRequest): Promise<WorkflowResponse> => {
    const response = await fetch(`${AI_AGENT_URL}/ai-api/workflows`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create workflow');
    }

    return response.json();
};

// Get workflow status
export const getWorkflowStatus = async (workflowId: string): Promise<WorkflowResponse> => {
    const response = await fetch(`${AI_AGENT_URL}/ai-api/workflows/${workflowId}`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to get workflow status');
    }

    return response.json();
};

// Continue a workflow with new input
export const continueWorkflow = async (workflowId: string, input: any): Promise<WorkflowResponse> => {
    const response = await fetch(`${AI_AGENT_URL}/ai-api/workflows/${workflowId}/continue`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to continue workflow');
    }

    return response.json();
};

// Generate research questions for a paper
export const generateResearchQuestions = async (
    paperTitle: string,
    paperAbstract: string
): Promise<string[]> => {
    const response = await chatWithPaper({
        message: `Based on this paper titled "${paperTitle}" with abstract: "${paperAbstract}", generate 5 thought-provoking research questions that could extend this work.`,
    });

    // Parse the response to extract questions
    const questions = response.response
        .split('\n')
        .filter((line) => line.trim().match(/^\d+[\.\)]/))
        .map((line) => line.replace(/^\d+[\.\)]\s*/, '').trim());

    return questions;
};

// Summarize paper
export const summarizePaper = async (
    paperTitle: string,
    paperContent: string
): Promise<string> => {
    const response = await chatWithPaper({
        message: `Provide a concise summary of this paper titled "${paperTitle}". Focus on: 1) Main contribution, 2) Methodology, 3) Key findings, 4) Limitations.`,
        paper_content: paperContent,
    });

    return response.response;
};

// Extract key insights
export const extractKeyInsights = async (
    paperTitle: string,
    paperContent: string
): Promise<string[]> => {
    const response = await chatWithPaper({
        message: `Extract 5-7 key insights from this paper titled "${paperTitle}". Each insight should be a single sentence.`,
        paper_content: paperContent,
    });

    const insights = response.response
        .split('\n')
        .filter((line) => line.trim().match(/^[\d\-\•]/))
        .map((line) => line.replace(/^[\d\-\•\.\)]\s*/, '').trim());

    return insights;
};

// Compare papers
export const comparePapers = async (
    paper1Title: string,
    paper1Abstract: string,
    paper2Title: string,
    paper2Abstract: string
): Promise<string> => {
    const response = await chatWithPaper({
        message: `Compare these two papers and highlight: 1) Similarities in approach, 2) Key differences, 3) How they complement each other.\n\nPaper 1: "${paper1Title}"\nAbstract: ${paper1Abstract}\n\nPaper 2: "${paper2Title}"\nAbstract: ${paper2Abstract}`,
    });

    return response.response;
};
