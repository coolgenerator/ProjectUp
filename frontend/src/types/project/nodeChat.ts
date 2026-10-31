/**
 * TypeScript interfaces for node chat functionality
 */

import { Suggestion } from './chatSuggestions';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  attachments?: Attachment[];
  suggestions?: Suggestion[];
}

export interface Attachment {
  type: 'image' | 'file';
  url: string;
  name: string;
  size?: number;
}

export interface MentionableMaterial {
  id: string;
  title: string;
  description?: string;
  type: 'node' | 'paper' | 'resource';
  subType?: string; // e.g., 'idea', 'action', 'learn', 'milestone' for nodes
  metadata?: any;
}
