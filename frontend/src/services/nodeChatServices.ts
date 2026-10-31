import config from "../config";

const { AI_AGENT_URL } = config;

export interface ChatSession {
  id: string;
  version_number: string;
  parent_version_number: string | null;
  parent_session_id: string | null;
  branch_name: string;
  branch_display_name: string | null;
  branch_point_index: number | null;
  message_count: number;
  created_at: string;
  last_message_at: string | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface SessionWithMessages {
  session_id: string;
  messages: ChatMessage[];
  conclusion: string | null;
  summary: string | null;
  version_number: string;
  branch_name: string;
  parent_session_id: string | null;
}

/**
 * Get all chat sessions for a node
 */
export const getNodeChatSessions = async (nodeId: string): Promise<{ sessions: ChatSession[] }> => {
  const response = await fetch(`${AI_AGENT_URL}/ai-api/node-chat/node/${nodeId}/sessions`);

  if (!response.ok) {
    throw new Error('Failed to fetch chat sessions');
  }

  return response.json();
};

/**
 * Get messages for a specific chat session
 */
export const getChatSessionMessages = async (
  nodeId: string,
  sessionId?: string
): Promise<SessionWithMessages> => {
  const url = sessionId
    ? `${AI_AGENT_URL}/ai-api/node-chat/node/${nodeId}/messages?session_id=${sessionId}`
    : `${AI_AGENT_URL}/ai-api/node-chat/node/${nodeId}/messages`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch chat messages');
  }

  return response.json();
};

/**
 * Update branch display name
 */
export const updateBranchDisplayName = async (
  sessionId: string,
  displayName: string
): Promise<{ message: string; session_id: string; display_name: string }> => {
  const response = await fetch(`${AI_AGENT_URL}/ai-api/node-chat/session/${sessionId}/branch-name`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ display_name: displayName }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update branch name');
  }

  return response.json();
};

/**
 * Close a chat session
 */
export const closeChatSession = async (sessionId: string): Promise<{ message: string }> => {
  const response = await fetch(`${AI_AGENT_URL}/ai-api/node-chat/session/${sessionId}/close`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to close session');
  }

  return response.json();
};

/**
 * Create a new conversation branch
 */
export const createConversationBranch = async (params: {
  parent_session_id: string;
  branch_point_index: number;
  branch_display_name?: string;
  initial_messages: ChatMessage[];
  modified_message?: string;
  version_number: string;
  parent_version_number?: string;
}): Promise<{ session: any; branch_name: string; parent_session_id: string }> => {
  const response = await fetch(`${AI_AGENT_URL}/ai-api/node-chat/sessions/create-branch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error('Failed to create branch');
  }

  return response.json();
};
