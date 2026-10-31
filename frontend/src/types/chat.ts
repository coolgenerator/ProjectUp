/**
 * Chat-related type definitions
 */

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  attachments?: Attachment[];
  suggestions?: Suggestion[];
  isStreaming?: boolean; // Indicates if message is currently being streamed
  // MULTI-USER SUPPORT: Track who sent the message
  user_id?: number; // User ID who sent this message (for user role messages)
  username?: string; // Username for display (optional, fetched from backend)
  avatar_url?: string; // User avatar URL (optional, fetched from backend)
}

export interface Suggestion {
  id: string;
  type: 'question' | 'action' | 'create_node' | 'add_resource' | 'connect_nodes' | 'extract_tasks';
  text: string;
  description?: string;
  data?: any;
  // For action suggestions
  actionType?: 'breakdown_task' | 'generate_learning_plan' | 'extract_tasks' | 'create_milestones' | 'extract_resources' | 'brainstorm_ideas';
  actionIcon?: string;
  actionColor?: string;
  confidence?: number;
  priority?: number;
  parameters?: Record<string, any>;
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
  subType?: string; // e.g., 'idea', 'action', 'learn', 'milestone' for nodes, or 'link', 'file' for resources
  metadata?: any; // Additional info like authors, url, etc.
}

export interface IdeaTree {
  id: string;
  name: string;
  icon?: string;
}
