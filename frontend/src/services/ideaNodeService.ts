/**
 * Idea Node Service
 *
 * Centralized service for creating, updating, and managing idea tree nodes.
 * This ensures consistent behavior across manual creation and AI-suggested creation.
 */

import config from '../config';

const { AI_AGENT_URL } = config;

export interface CreateNodeParams {
  projectId: string;
  sessionId?: string;
  parentId?: string;
  title: string;
  description?: string;
  position?: { x: number; y: number };
  color?: string;
  icon?: string;
  tags?: string[];
  isRoot?: boolean;
  initialChatPrompt?: string;
}

export interface CreateNodeResponse {
  node: {
    id: string;
    title: string;
    description: string;
    parent_id?: string;
    position?: { x: number; y: number };
    created_at: string;
  };
  success: boolean;
  message?: string;
}

/**
 * Creates a new idea tree node
 *
 * This is the single source of truth for node creation.
 * Used by both manual creation (QuickNodeCreator) and AI suggestions (ActionReviewModal).
 *
 * @param params - Node creation parameters
 * @returns Created node data
 */
export async function createIdeaNode(params: CreateNodeParams): Promise<CreateNodeResponse> {
  const {
    projectId,
    sessionId,
    parentId,
    title,
    description = '',
    position,
    color = '',
    icon = '',
    tags = [],
    isRoot = false,
    initialChatPrompt
  } = params;

  console.log('[IdeaNodeService] Creating node:', {
    projectId,
    sessionId,
    parentId,
    title: title.substring(0, 50),
    isRoot,
    hasInitialPrompt: !!initialChatPrompt
  });

  const nodeData = {
    session_id: sessionId || undefined,
    parent_id: parentId || undefined,
    title,
    description,
    position,
    color,
    icon,
    tags,
    is_root: isRoot,
    initial_chat_prompt: initialChatPrompt || undefined
  };

  const response = await fetch(`${AI_AGENT_URL}/ai-api/projects/${projectId}/idea-tree/nodes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(nodeData)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Failed to create node: ${response.statusText}`);
  }

  const data = await response.json();

  console.log('[IdeaNodeService] Node created successfully:', data.node?.id);

  return data;
}

/**
 * Updates an existing idea tree node
 *
 * @param nodeId - ID of the node to update
 * @param updates - Fields to update
 */
export async function updateIdeaNode(
  nodeId: string,
  updates: Partial<Omit<CreateNodeParams, 'projectId' | 'sessionId'>>
): Promise<any> {
  console.log('[IdeaNodeService] Updating node:', nodeId);

  const response = await fetch(`${AI_AGENT_URL}/ai-api/idea-tree/nodes/${nodeId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Failed to update node: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Deletes an idea tree node
 *
 * @param nodeId - ID of the node to delete
 */
export async function deleteIdeaNode(nodeId: string): Promise<void> {
  console.log('[IdeaNodeService] Deleting node:', nodeId);

  const response = await fetch(`${AI_AGENT_URL}/ai-api/idea-tree/nodes/${nodeId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Failed to delete node: ${response.statusText}`);
  }
}
