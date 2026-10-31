/**
 * Paper Persistence API
 * Functions for saving/loading chat sessions, notes, outlines, and references
 */

import config from '../config';
import fetchWithAuth from '../hooks/fetchWithAuth';

const AI_AGENT_URL = config.AI_AGENT_URL;
const API_BASE_URL = config.API_BASE_URL;

// ==================== Types ====================

export interface ChatSession {
  id: string;
  paper_id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  context?: string;
  created_at: string;
}

export interface Note {
  id: string;
  paper_id: string;
  user_id: string;
  page: number;
  content: string;
  note_type: string;
  created_at: string;
  updated_at: string;
}

export interface Outline {
  id: string;
  paper_id: string;
  sections: any[];
  generated_at: string;
  updated_at: string;
}

export interface Reference {
  id: string;
  ref_id: string;
  title: string;
  authors: string[];
  year?: number;
  venue?: string;
  doi?: string;
  url?: string;
  created_at: string;
}

// ==================== Chat Sessions ====================

export const paperPersistenceApi = {
  // Chat Sessions
  async createSession(sessionId: string, paperId: string, userId: string, title: string = 'New Chat'): Promise<ChatSession> {
    const response = await fetch(`${AI_AGENT_URL}/ai-api/papers/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        paper_id: paperId,
        user_id: userId,
        title
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create session');
    }

    return response.json();
  },

  async getSessions(paperId: string, userId: string): Promise<ChatSession[]> {
    const response = await fetch(`${AI_AGENT_URL}/ai-api/papers/chat-sessions/${paperId}/${userId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch sessions');
    }

    return response.json();
  },

  async getSession(sessionId: string): Promise<ChatSession> {
    const response = await fetch(`${AI_AGENT_URL}/ai-api/papers/sessions/${sessionId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch session');
    }

    return response.json();
  },

  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    const response = await fetch(`${AI_AGENT_URL}/ai-api/papers/sessions/${sessionId}/title`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    });

    if (!response.ok) {
      throw new Error('Failed to update session title');
    }
  },

  async deleteSession(sessionId: string): Promise<void> {
    const response = await fetch(`${AI_AGENT_URL}/ai-api/papers/sessions/${sessionId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to delete session');
    }
  },

  // Chat Messages
  async addMessage(messageId: string, sessionId: string, role: 'user' | 'assistant', content: string, context?: string): Promise<ChatMessage> {
    const requestData = {
      id: messageId,
      role,
      content,
      context,
      created_at: new Date().toISOString()
    };

    const response = await fetch(`${AI_AGENT_URL}/ai-api/papers/messages?session_id=${encodeURIComponent(sessionId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[addMessage] Failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        sessionId,
        requestData
      });
      throw new Error('Failed to add message');
    }

    return response.json();
  },

  async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    const response = await fetch(`${AI_AGENT_URL}/ai-api/papers/sessions/${sessionId}/messages`);

    if (!response.ok) {
      console.error('[getSessionMessages] Failed:', response.status, response.statusText);
      throw new Error('Failed to fetch messages');
    }

    const messages = await response.json();
    return messages;
  },

  // Notes
  async createNote(noteId: string, paperId: string, userId: string, page: number, content: string, noteType: string = 'note'): Promise<Note> {
    const response = await fetch(`${AI_AGENT_URL}/ai-api/papers/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        note_id: noteId,
        paper_id: paperId,
        user_id: userId,
        page,
        content,
        note_type: noteType
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create note');
    }

    return response.json();
  },

  async getNotes(paperId: string, userId: string): Promise<Note[]> {
    const response = await fetchWithAuth(`${config.API_BASE_URL}/api/papers/${paperId}/notes`);

    if (!response.ok) {
      throw new Error('Failed to fetch notes');
    }

    const data = await response.json();
    return data.notes || [];
  },

  async updateNote(noteId: string, content: string): Promise<Note> {
    const response = await fetch(`${AI_AGENT_URL}/ai-api/papers/notes/${noteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });

    if (!response.ok) {
      throw new Error('Failed to update note');
    }

    return response.json();
  },

  async deleteNote(noteId: string): Promise<void> {
    const response = await fetch(`${AI_AGENT_URL}/ai-api/papers/notes/${noteId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to delete note');
    }
  },

  // Outlines
  async saveOutline(outlineId: string, paperId: string, sections: any[]): Promise<Outline> {
    const response = await fetch(`${AI_AGENT_URL}/ai-api/papers/outlines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outline_id: outlineId,
        paper_id: paperId,
        sections
      })
    });

    if (!response.ok) {
      throw new Error('Failed to save outline');
    }

    return response.json();
  },

  async getOutline(paperId: string): Promise<Outline | null> {
    const response = await fetch(`${AI_AGENT_URL}/ai-api/papers/outlines/${paperId}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error('Failed to fetch outline');
    }

    return response.json();
  },

  // References
  async saveReferences(paperId: string, references: any[]): Promise<Reference[]> {
    console.log('[saveReferences] Saving', references.length, 'references for paper:', paperId);
    console.log('[saveReferences] URL:', `${AI_AGENT_URL}/ai-api/papers/references`);
    console.log('[saveReferences] Payload:', { paper_id: paperId, references: references.slice(0, 2) }); // Log first 2 refs

    const response = await fetch(`${AI_AGENT_URL}/ai-api/papers/references`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paper_id: paperId,
        references
      })
    });

    console.log('[saveReferences] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[saveReferences] Error response:', errorText);
      throw new Error('Failed to save references');
    }

    const result = await response.json();
    console.log('[saveReferences] Successfully saved, returned:', result.length, 'references');
    return result;
  },

  async getReferences(paperId: string): Promise<Reference[]> {
    const response = await fetch(`${AI_AGENT_URL}/ai-api/papers/references/${paperId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch references');
    }

    return response.json();
  },

  async deleteReferences(paperId: string): Promise<void> {
    const response = await fetch(`${AI_AGENT_URL}/ai-api/papers/references/${paperId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to delete references');
    }
  }
};
