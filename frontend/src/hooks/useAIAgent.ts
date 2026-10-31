/**
 * useAIAgent Hook
 *
 * Custom hook for interacting with the AI Agent service.
 * Handles authentication, error handling, and provides a clean API
 * for making requests to AI Agent endpoints.
 */

import { useState, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import {
  AI_SERVICE_BASE_URL,
  AI_REQUEST_TIMEOUT,
  getAIServiceUrl,
  getAIServiceWsUrl,
} from '../config/aiAgent';

interface RequestOptions extends RequestInit {
  timeout?: number;
}

interface AIAgentError {
  message: string;
  status?: number;
  details?: any;
}

interface UseAIAgentResult<T> {
  data: T | null;
  loading: boolean;
  error: AIAgentError | null;
  execute: (endpoint: string, options?: RequestOptions) => Promise<T | null>;
  reset: () => void;
}

/**
 * Custom hook for making requests to AI Agent
 * Automatically includes authentication token from Redux store
 */
export function useAIAgent<T = any>(): UseAIAgentResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AIAgentError | null>(null);

  // Get authentication token from Redux store
  const token = useSelector((state: RootState) => state.auth?.token);

  const execute = useCallback(
    async (endpoint: string, options: RequestOptions = {}): Promise<T | null> => {
      setLoading(true);
      setError(null);

      try {
        const url = endpoint.startsWith('http')
          ? endpoint
          : getAIServiceUrl(endpoint);

        const timeout = options.timeout || AI_REQUEST_TIMEOUT;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        // Prepare headers
        const headers = new Headers(options.headers);
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        if (!headers.has('Content-Type')) {
          headers.set('Content-Type', 'application/json');
        }

        // Make request
        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle response
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw {
            message: errorData.error || errorData.detail || 'Request failed',
            status: response.status,
            details: errorData,
          };
        }

        const result = await response.json();
        setData(result);
        return result;
      } catch (err: any) {
        const aiError: AIAgentError = {
          message: err.message || 'An error occurred',
          status: err.status,
          details: err.details,
        };

        if (err.name === 'AbortError') {
          aiError.message = 'Request timeout';
        }

        setError(aiError);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset };
}

/**
 * Hook for streaming responses from AI Agent using Server-Sent Events (SSE)
 */
export function useAIAgentStream() {
  const [chunks, setChunks] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<AIAgentError | null>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  const token = useSelector((state: RootState) => state.auth?.token);

  const startStream = useCallback(
    (endpoint: string, params?: Record<string, string>) => {
      // Clean up previous stream
      if (eventSource) {
        eventSource.close();
      }

      setChunks([]);
      setError(null);
      setIsStreaming(true);

      try {
        // Build URL with query parameters
        const url = new URL(endpoint.startsWith('http') ? endpoint : getAIServiceUrl(endpoint));

        // Add authentication token as query parameter for SSE
        if (token) {
          url.searchParams.set('token', token);
        }

        // Add custom parameters
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            url.searchParams.set(key, value);
          });
        }

        // Create EventSource
        const es = new EventSource(url.toString());

        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'token' && data.content) {
              setChunks((prev) => [...prev, data.content]);
            } else if (data.type === 'complete') {
              setIsStreaming(false);
              es.close();
            } else if (data.type === 'error') {
              setError({ message: data.content });
              setIsStreaming(false);
              es.close();
            }
          } catch (err) {
            console.error('Failed to parse SSE data:', err);
          }
        };

        es.onerror = (err) => {
          console.error('SSE error:', err);
          setError({ message: 'Stream connection error' });
          setIsStreaming(false);
          es.close();
        };

        setEventSource(es);
      } catch (err: any) {
        setError({ message: err.message || 'Failed to start stream' });
        setIsStreaming(false);
      }
    },
    [token, eventSource]
  );

  const stopStream = useCallback(() => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    setIsStreaming(false);
  }, [eventSource]);

  const reset = useCallback(() => {
    stopStream();
    setChunks([]);
    setError(null);
  }, [stopStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);

  return {
    chunks,
    fullText: chunks.join(''),
    isStreaming,
    error,
    startStream,
    stopStream,
    reset,
  };
}

/**
 * Hook for WebSocket connection to AI Agent
 */
export function useAIAgentWebSocket(endpoint: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [error, setError] = useState<AIAgentError | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const token = useSelector((state: RootState) => state.auth?.token);

  const connect = useCallback(() => {
    if (ws) {
      ws.close();
    }

    try {
      const wsUrl = getAIServiceWsUrl(endpoint, token);
      const websocket = new WebSocket(wsUrl);

      websocket.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setMessages((prev) => [...prev, data]);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      websocket.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError({ message: 'WebSocket connection error' });
      };

      websocket.onclose = () => {
        setIsConnected(false);
      };

      setWs(websocket);
    } catch (err: any) {
      setError({ message: err.message || 'Failed to connect' });
    }
  }, [endpoint, token, ws]);

  const disconnect = useCallback(() => {
    if (ws) {
      ws.close();
      setWs(null);
    }
  }, [ws]);

  const sendMessage = useCallback(
    (data: any) => {
      if (ws && isConnected) {
        ws.send(JSON.stringify(data));
      } else {
        console.warn('WebSocket not connected');
      }
    },
    [ws, isConnected]
  );

  const reset = useCallback(() => {
    disconnect();
    setMessages([]);
    setError(null);
  }, [disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [ws]);

  return {
    isConnected,
    messages,
    error,
    connect,
    disconnect,
    sendMessage,
    reset,
  };
}

/**
 * Hook for checking AI Agent availability
 */
export function useAIAgentHealth() {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const checkHealth = useCallback(async () => {
    setChecking(true);
    try {
      const response = await fetch(`${AI_SERVICE_BASE_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      setIsAvailable(response.ok);
    } catch (error) {
      console.error('AI Agent health check failed:', error);
      setIsAvailable(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();

    // Check health every 30 seconds
    const interval = setInterval(checkHealth, 30000);

    return () => clearInterval(interval);
  }, [checkHealth]);

  return { isAvailable, checking, checkHealth };
}

export default useAIAgent;
