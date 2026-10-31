import { useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/store";
import { addMessage, setConnected } from "../store/chat";
import config from "../config";
import { addNotification, setUnreadMessages, addContactRequest } from "../store/notification";

const { WS_BASE_URL } = config;

const useWebSocket = () => {
    const dispatch = useDispatch();
    const token = useSelector((state: RootState) => state.auth?.token);
    const ws = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<number | null>(null);
    const reconnectAttempt = useRef<number>(0);

    // Handle different types of incoming messages
    const handleWebSocketMessage = useCallback((event: MessageEvent) => {
        try {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case "chat_message":
                    const normalizedMessage = {
                        chatId: data.chatID,
                        senderId: data.senderID,
                        content: data.content,
                        timestamp: data.timestamp,
                        isRead: data.isRead
                    };

                    // Add message to chat history
                    dispatch(addMessage({
                        chatId: normalizedMessage.chatId,
                        message: normalizedMessage
                    }));

                    // Increment unread count for the chat
                    dispatch(setUnreadMessages({
                        chatId: normalizedMessage.chatId,
                        count: 1
                    }));

                    // Show browser notification if supported and page not focused
                    if (document.visibilityState !== 'visible' && 'Notification' in window) {
                        if (Notification.permission === 'granted') {
                            new Notification('New Message', {
                                body: normalizedMessage.content.substring(0, 50) + (normalizedMessage.content.length > 50 ? '...' : ''),
                                icon: '/assets/icon.svg'
                            });
                        }
                    }
                    break;

                case "notification":
                    // Add the notification to the store
                    dispatch(addNotification({
                        id: data.notificationId,
                        type: data.notificationType,
                        content: data.content,
                        timestamp: data.timestamp,
                        read: false
                    }));

                    // Show browser notification if supported and page not focused
                    if (document.visibilityState !== 'visible' && 'Notification' in window) {
                        if (Notification.permission === 'granted') {
                            new Notification(data.title || 'New Notification', {
                                body: data.content,
                                icon: '/assets/icon.svg'
                            });
                        }
                    }
                    break;

                case "contact_request":
                    // Add the contact request to the store
                    dispatch(addContactRequest({
                        senderId: data.senderId,
                        senderName: data.senderName,
                        message: data.message,
                        timestamp: data.timestamp
                    }));

                    // Show browser notification if supported and page not focused
                    if (document.visibilityState !== 'visible' && 'Notification' in window) {
                        if (Notification.permission === 'granted') {
                            new Notification('New Connection Request', {
                                body: `${data.senderName} wants to connect with you`,
                                icon: '/assets/icon.svg'
                            });
                        }
                    }
                    break;

                case "pong":
                    // Heartbeat response, no action needed
                    break;

                default:
                    // Unknown WebSocket message type
                    break;
            }
        } catch (error) {
            // Error processing WebSocket message
        }
    }, [dispatch]);

    // Send a message through the WebSocket
    const sendWebSocketMessage = useCallback((message: any) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(message));
            return true;
        }
        return false;
    }, []);

    // Setup and manage the WebSocket connection
    useEffect(() => {
        if (!token) {
            // No token, no connection
            if (ws.current) {
                ws.current.close();
                ws.current = null;
            }
            return;
        }

        // Clear any existing reconnect attempt
        if (reconnectTimeout.current) {
            clearTimeout(reconnectTimeout.current);
            reconnectTimeout.current = null;
        }

        // Only create a new connection if we don't have one already
        if (!ws.current || ws.current.readyState === WebSocket.CLOSED) {
            // Create a new WebSocket connection
            const newWs = new WebSocket(`${WS_BASE_URL}/ws?token=${token}`);
            ws.current = newWs;

            // Connection established successfully
            newWs.onopen = () => {
                dispatch(setConnected(true));
                reconnectAttempt.current = 0; // Reset reconnect attempts on successful connection

                // Request notification permission if not already granted
                if ('Notification' in window && Notification.permission === 'default') {
                    Notification.requestPermission();
                }
            };

            // Handle incoming messages
            newWs.onmessage = handleWebSocketMessage;

            // Handle connection closed - try to reconnect unless it was intentional
            newWs.onclose = (event) => {
                dispatch(setConnected(false));

                // Don't reconnect on normal closure (code 1000) or if no token
                if (event.code !== 1000 && token) {
                    scheduleReconnect();
                }
            };

            // Handle errors
            newWs.onerror = () => {
                // The onclose handler will be called after this
            };
        }

        // Setup heartbeat interval to keep connection alive
        const heartbeatInterval = setInterval(() => {
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({ type: "ping" }));
            }
        }, 30000); // Send ping every 30 seconds

        // Cleanup on unmount or token change
        return () => {
            clearInterval(heartbeatInterval);

            if (reconnectTimeout.current) {
                clearTimeout(reconnectTimeout.current);
                reconnectTimeout.current = null;
            }

            // CRITICAL FIX: Close the WebSocket connection to prevent memory leaks
            // Previous implementation kept connections open indefinitely
            if (ws.current) {
                ws.current.close();
                ws.current = null;
            }
        };
    }, [token, dispatch, handleWebSocketMessage]);

    /** Reconnect WebSocket with exponential backoff */
    const scheduleReconnect = () => {
        reconnectAttempt.current += 1;

        // Exponential backoff with a max delay of 30 seconds
        const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempt.current), 30000);

        reconnectTimeout.current = window.setTimeout(() => {
            // Force the effect to run again by updating a ref
            if (ws.current) {
                ws.current.close();
                ws.current = null;
            }

            // The main effect will handle reconnection
        }, delay);
    };

    // Return both the WebSocket ref and the send function
    return {
        current: ws.current,
        send: sendWebSocketMessage,
        connected: ws.current?.readyState === WebSocket.OPEN
    };
};

export default useWebSocket;