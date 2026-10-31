import { useEffect, useRef, useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import config from '../config';

const { WS_BASE_URL } = config;

export interface BlockUpdateMessage {
  type: 'create' | 'update' | 'delete' | 'reorder' | 'transform' | 'cursor' | 'selection' | 'typing';
  block_id?: number;
  project_id: number;
  user_id?: number;
  data: any;
  timestamp: string;
}

interface UseBlockWebSocketOptions {
  projectId: string;
  onBlockUpdate?: (message: BlockUpdateMessage) => void;
  onCursorUpdate?: (userId: number, blockId: number, position: any) => void;
  onSelectionUpdate?: (userId: number, blockId: number, selection: any) => void;
  onTypingUpdate?: (userId: number, blockId: number, isTyping: boolean) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export const useBlockWebSocket = ({
  projectId,
  onBlockUpdate,
  onCursorUpdate,
  onSelectionUpdate,
  onTypingUpdate,
  onConnected,
  onDisconnected,
}: UseBlockWebSocketOptions) => {
  const auth = useSelector((state: RootState) => state.auth);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState<number[]>([]);

  const connect = useCallback(() => {
    if (!auth.token || !projectId) return;

    try {
      // Clean up existing connection
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.close();
      }

      // Create WebSocket URL with authentication
      const wsUrl = `${WS_BASE_URL}/ws/projects/${projectId}/blocks?token=${auth.token}`;
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('Connected to block WebSocket');
        setIsConnected(true);
        onConnected?.();
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'connected':
              console.log('Block WebSocket connected:', message);
              break;
              
            case 'create':
            case 'update':
            case 'delete':
            case 'reorder':
            case 'transform':
              onBlockUpdate?.(message);
              break;
              
            case 'cursor':
              if (message.user_id && message.block_id) {
                onCursorUpdate?.(message.user_id, message.block_id, message.data);
              }
              break;
              
            case 'selection':
              if (message.user_id && message.block_id) {
                onSelectionUpdate?.(message.user_id, message.block_id, message.data);
              }
              break;
              
            case 'typing':
              if (message.user_id && message.block_id) {
                onTypingUpdate?.(message.user_id, message.block_id, message.data?.isTyping || false);
              }
              break;
              
            case 'users_online':
              setConnectedUsers(message.data || []);
              break;
              
            default:
              console.log('Unknown WebSocket message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.current.onclose = () => {
        console.log('Disconnected from block WebSocket');
        setIsConnected(false);
        onDisconnected?.();
        
        // Attempt to reconnect after 5 seconds
        reconnectTimeout.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 5000);
      };
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
    }
  }, [auth.token, projectId, onBlockUpdate, onCursorUpdate, onSelectionUpdate, onTypingUpdate, onConnected, onDisconnected]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: Partial<BlockUpdateMessage>) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        ...message,
        project_id: parseInt(projectId),
        timestamp: new Date().toISOString(),
      }));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, [projectId]);

  const sendCursorPosition = useCallback((blockId: number, position: any) => {
    sendMessage({
      type: 'cursor',
      block_id: blockId,
      data: position,
    });
  }, [sendMessage]);

  const sendSelection = useCallback((blockId: number, selection: any) => {
    sendMessage({
      type: 'selection',
      block_id: blockId,
      data: selection,
    });
  }, [sendMessage]);

  const sendTypingIndicator = useCallback((blockId: number, isTyping: boolean) => {
    sendMessage({
      type: 'typing',
      block_id: blockId,
      data: { isTyping },
    });
  }, [sendMessage]);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    connectedUsers,
    sendCursorPosition,
    sendSelection,
    sendTypingIndicator,
    sendMessage,
  };
};