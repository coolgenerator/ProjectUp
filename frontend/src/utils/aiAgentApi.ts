/**
 * AI Agent API Utilities
 *
 * Utility functions for making requests to the AI Agent service.
 * All AI/Agent related requests should use these functions.
 */

import { aiServiceEndpoints, AI_REQUEST_TIMEOUT } from '../config/aiAgent';

interface RequestOptions extends RequestInit {
  timeout?: number;
  token?: string;
}

/**
 * Make an authenticated request to the AI Agent
 */
async function aiAgentRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { timeout = AI_REQUEST_TIMEOUT, token, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Prepare headers
    const headers = new Headers(fetchOptions.headers);

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (!headers.has('Content-Type') && fetchOptions.method !== 'GET') {
      headers.set('Content-Type', 'application/json');
    }

    // Make request
    const response = await fetch(endpoint, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle response
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || errorData.detail || `Request failed with status ${response.status}`
      );
    }

    return await response.json();
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Agent API Functions

/**
 * Chat with an AI agent
 */
export async function chatWithAgent(
  message: string,
  sessionId?: string,
  token?: string
): Promise<any> {
  return aiAgentRequest(aiServiceEndpoints.v2.agents.chat, {
    method: 'POST',
    token,
    body: JSON.stringify({ message, session_id: sessionId }),
  });
}

/**
 * List available agents
 */
export async function listAgents(token?: string): Promise<any> {
  return aiAgentRequest(aiServiceEndpoints.v2.agents.list, {
    method: 'GET',
    token,
  });
}

/**
 * Get agent details
 */
export async function getAgent(agentId: string, token?: string): Promise<any> {
  return aiAgentRequest(`${aiServiceEndpoints.v2.agents.base}/${agentId}`, {
    method: 'GET',
    token,
  });
}

// Session API Functions

/**
 * Create a new session
 */
export async function createSession(
  userId?: number,
  metadata?: Record<string, any>,
  token?: string
): Promise<any> {
  return aiAgentRequest(aiServiceEndpoints.v2.sessions.base, {
    method: 'POST',
    token,
    body: JSON.stringify({ user_id: userId, metadata }),
  });
}

/**
 * Get session details
 */
export async function getSession(sessionId: string, token?: string): Promise<any> {
  return aiAgentRequest(aiServiceEndpoints.v2.sessions.detail(sessionId), {
    method: 'GET',
    token,
  });
}

/**
 * Update session
 */
export async function updateSession(
  sessionId: string,
  metadata: Record<string, any>,
  token?: string
): Promise<any> {
  return aiAgentRequest(aiServiceEndpoints.v2.sessions.detail(sessionId), {
    method: 'PUT',
    token,
    body: JSON.stringify({ metadata }),
  });
}

/**
 * Delete session
 */
export async function deleteSession(sessionId: string, token?: string): Promise<any> {
  return aiAgentRequest(aiServiceEndpoints.v2.sessions.detail(sessionId), {
    method: 'DELETE',
    token,
  });
}

/**
 * List sessions
 */
export async function listSessions(
  userId?: number,
  limit: number = 50,
  offset: number = 0,
  token?: string
): Promise<any> {
  const params = new URLSearchParams();
  if (userId) params.set('user_id', userId.toString());
  params.set('limit', limit.toString());
  params.set('offset', offset.toString());

  return aiAgentRequest(`${aiServiceEndpoints.v2.sessions.base}?${params}`, {
    method: 'GET',
    token,
  });
}

// Memory API Functions

/**
 * Get session memory
 */
export async function getSessionMemory(
  sessionId: string,
  limit: number = 50,
  token?: string
): Promise<any> {
  const params = new URLSearchParams({ limit: limit.toString() });
  return aiAgentRequest(`${aiServiceEndpoints.v2.memory.session(sessionId)}?${params}`, {
    method: 'GET',
    token,
  });
}

/**
 * Add to session memory
 */
export async function addToMemory(
  sessionId: string,
  message: Record<string, any>,
  token?: string
): Promise<any> {
  return aiAgentRequest(aiServiceEndpoints.v2.memory.session(sessionId), {
    method: 'POST',
    token,
    body: JSON.stringify(message),
  });
}

/**
 * Clear session memory
 */
export async function clearMemory(sessionId: string, token?: string): Promise<any> {
  return aiAgentRequest(aiServiceEndpoints.v2.memory.session(sessionId), {
    method: 'DELETE',
    token,
  });
}

/**
 * Search memory
 */
export async function searchMemory(
  query: string,
  sessionId?: string,
  limit: number = 10,
  token?: string
): Promise<any> {
  const params = new URLSearchParams({ query, limit: limit.toString() });
  if (sessionId) params.set('session_id', sessionId);

  return aiAgentRequest(`${aiServiceEndpoints.v2.memory.search}?${params}`, {
    method: 'GET',
    token,
  });
}

// Legacy V1 API Functions (for backward compatibility)

/**
 * Generate project ideas (V1)
 */
export async function generateProjectIdeas(data: any, token?: string): Promise<any> {
  return aiAgentRequest(`${aiServiceEndpoints.v1.projects}/ideas`, {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  });
}

/**
 * Generate project roadmap (V1)
 */
export async function generateProjectRoadmap(data: any, token?: string): Promise<any> {
  return aiAgentRequest(`${aiServiceEndpoints.v1.projects}/roadmap`, {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  });
}

/**
 * Generate learning path (V1)
 */
export async function generateLearningPath(data: any, token?: string): Promise<any> {
  return aiAgentRequest(`${aiServiceEndpoints.v1.learning}/path`, {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  });
}

/**
 * Ask a question (V1)
 */
export async function askQuestion(question: string, token?: string): Promise<any> {
  return aiAgentRequest(`${aiServiceEndpoints.v1.qa}/ask`, {
    method: 'POST',
    token,
    body: JSON.stringify({ question }),
  });
}

// Health Check

/**
 * Check AI Agent health
 */
export async function checkAIAgentHealth(): Promise<boolean> {
  try {
    const response = await fetch(aiServiceEndpoints.health, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch (error) {
    console.error('AI Agent health check failed:', error);
    return false;
  }
}

// Export all functions
export default {
  // Agent
  chatWithAgent,
  listAgents,
  getAgent,

  // Sessions
  createSession,
  getSession,
  updateSession,
  deleteSession,
  listSessions,

  // Memory
  getSessionMemory,
  addToMemory,
  clearMemory,
  searchMemory,

  // Legacy V1
  generateProjectIdeas,
  generateProjectRoadmap,
  generateLearningPath,
  askQuestion,

  // Health
  checkAIAgentHealth,
};
