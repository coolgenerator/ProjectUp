/**
 * AI Service Configuration
 *
 * Centralized configuration for AI Service API endpoints.
 * All AI/Service related requests should use these configurations
 * to connect directly to the AI Service.
 */

// Base URLs
export const AI_SERVICE_BASE_URL =
  import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8888';

export const AI_SERVICE_WS_URL =
  import.meta.env.VITE_AI_SERVICE_WS_URL || 'ws://localhost:8888';

// API Versions
export const AI_SERVICE_API_V1 = import.meta.env.VITE_AI_SERVICE_API_V1 || '/ai-api/v1';
export const AI_SERVICE_API_V2 = import.meta.env.VITE_AI_SERVICE_API_V2 || '/ai-api/v2';

// Feature Flags
export const ENABLE_AI_STREAMING =
  import.meta.env.VITE_ENABLE_AI_STREAMING === 'true' || true;

export const AI_REQUEST_TIMEOUT =
  parseInt(import.meta.env.VITE_AI_REQUEST_TIMEOUT) || 30000;

// AI Configuration
export const AI_CONFIG = {
  maxRefinements: parseInt(import.meta.env.VITE_MAX_REFINEMENTS) || 3,
  defaultDuration: parseInt(import.meta.env.VITE_DEFAULT_DURATION) || 20,
  defaultDifficulty: import.meta.env.VITE_DEFAULT_DIFFICULTY || 'intermediate',
  defaultBackground: import.meta.env.VITE_DEFAULT_BACKGROUND || 'beginner',
};

// API Endpoint Builders
export const aiServiceEndpoints = {
  // V1 Endpoints (Legacy)
  v1: {
    agents: `${AI_SERVICE_BASE_URL}${AI_SERVICE_API_V1}/agents`,
    projects: `${AI_SERVICE_BASE_URL}${AI_SERVICE_API_V1}/projects`,
    learning: `${AI_SERVICE_BASE_URL}${AI_SERVICE_API_V1}/learning`,
    qa: `${AI_SERVICE_BASE_URL}${AI_SERVICE_API_V1}/qa`,
  },

  // V2 Endpoints (New Streaming API)
  v2: {
    agents: {
      base: `${AI_SERVICE_BASE_URL}${AI_SERVICE_API_V2}/agents`,
      chat: `${AI_SERVICE_BASE_URL}${AI_SERVICE_API_V2}/agents/chat`,
      stream: `${AI_SERVICE_BASE_URL}${AI_SERVICE_API_V2}/agents/stream`,
      list: `${AI_SERVICE_BASE_URL}${AI_SERVICE_API_V2}/agents/agents`,
    },
    streaming: {
      sse: `${AI_SERVICE_BASE_URL}${AI_SERVICE_API_V2}/streaming/sse`,
      ws: `${AI_SERVICE_WS_URL}${AI_SERVICE_API_V2}/streaming/ws`,
      test: `${AI_SERVICE_BASE_URL}${AI_SERVICE_API_V2}/streaming/test-stream`,
    },
    memory: {
      base: `${AI_SERVICE_BASE_URL}${AI_SERVICE_API_V2}/memory`,
      session: (sessionId: string) =>
        `${AI_SERVICE_BASE_URL}${AI_SERVICE_API_V2}/memory/sessions/${sessionId}/memory`,
      search: `${AI_SERVICE_BASE_URL}${AI_SERVICE_API_V2}/memory/memory/search`,
    },
    sessions: {
      base: `${AI_SERVICE_BASE_URL}${AI_SERVICE_API_V2}/sessions/sessions`,
      detail: (sessionId: string) =>
        `${AI_SERVICE_BASE_URL}${AI_SERVICE_API_V2}/sessions/sessions/${sessionId}`,
    },
  },

  // Health check
  health: `${AI_SERVICE_BASE_URL}/health`,
};

/**
 * Get AI Service API URL
 * @param path - API path (e.g., '/api/v2/agents')
 * @returns Full URL to AI Service endpoint
 */
export const getAIServiceUrl = (path: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${AI_SERVICE_BASE_URL}${cleanPath}`;
};

/**
 * Get AI Service WebSocket URL
 * @param path - WebSocket path (e.g., '/api/v2/streaming/ws')
 * @param token - Optional authentication token
 * @returns Full WebSocket URL with optional token query parameter
 */
export const getAIServiceWsUrl = (path: string, token?: string): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = `${AI_SERVICE_WS_URL}${cleanPath}`;

  if (token) {
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}token=${token}`;
  }

  return baseUrl;
};

/**
 * Check if AI Service is available
 * @returns Promise<boolean>
 */
export const checkAIServiceHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(aiServiceEndpoints.health, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    return response.ok;
  } catch (error) {
    console.error('AI Service health check failed:', error);
    return false;
  }
};

// Export default configuration object
export default {
  baseUrl: AI_SERVICE_BASE_URL,
  wsUrl: AI_SERVICE_WS_URL,
  apiV1: AI_SERVICE_API_V1,
  apiV2: AI_SERVICE_API_V2,
  enableStreaming: ENABLE_AI_STREAMING,
  requestTimeout: AI_REQUEST_TIMEOUT,
  config: AI_CONFIG,
  endpoints: aiServiceEndpoints,
  getUrl: getAIServiceUrl,
  getWsUrl: getAIServiceWsUrl,
  checkHealth: checkAIServiceHealth,
};
