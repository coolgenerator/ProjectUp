import { useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/store";
import { addMessage } from "../store/chat";
import config from "../config";
import { addNotification, setUnreadMessages, addContactRequest } from "../store/notification";

const { API_BASE_URL } = config;

const useSSE = () => {
    const dispatch = useDispatch();
    const token = useSelector((state: RootState) => state.auth?.token);
    const eventSource = useRef<EventSource | null>(null);
    const reconnectTimeout = useRef<number | null>(null);
    const reconnectAttempt = useRef<number>(0);

    // Handle different types of incoming events
    const handleSSEMessage = useCallback((event: MessageEvent) => {
        try {
            // Validate that we have data to parse
            if (!event.data || typeof event.data !== 'string') {
                console.warn("SSE: Received empty or invalid event data");
                return;
            }

            // Skip heartbeat/keepalive messages (common SSE pattern)
            if (event.data.trim() === '' || event.data === ':') {
                return;
            }

            const data = JSON.parse(event.data);

            // Validate parsed data has required type field
            // Skip null/undefined messages silently (these are often keepalive/heartbeat messages)
            if (!data || typeof data !== 'object' || !data.type) {
                // Only log warnings for non-null objects without type (potential issues)
                if (data !== null && typeof data === 'object') {
                    console.warn("SSE: Received message without type field:", data);
                }
                return;
            }

            switch (data.type) {
                case "connected":
                    // SSE connection established
                    break;

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

                case "node_chat_message":
                    // Dispatch custom event for node chat components to listen to
                    window.dispatchEvent(new CustomEvent('node_chat_message', {
                        detail: {
                            sessionId: data.session_id,
                            messageId: data.message_id,
                            senderId: data.sender_id,
                            content: data.content,
                            role: data.role,
                            nodeId: data.node_id,
                            projectId: data.project_id,
                            timestamp: data.timestamp
                        }
                    }));
                    break;

                case "node_chat_participant_change":
                    // Dispatch custom event for participant list updates
                    window.dispatchEvent(new CustomEvent('node_chat_participant_change', {
                        detail: {
                            sessionId: data.session_id,
                            action: data.action, // 'added' or 'removed'
                            userId: data.user_id,
                            nodeId: data.node_id,
                            projectId: data.project_id,
                            timestamp: data.timestamp
                        }
                    }));
                    break;

                case "node_chat_typing":
                    // Dispatch custom event for typing indicators
                    window.dispatchEvent(new CustomEvent('node_chat_typing', {
                        detail: {
                            sessionId: data.session_id,
                            userId: data.user_id,
                            username: data.username,
                            isTyping: data.is_typing,
                            timestamp: data.timestamp
                        }
                    }));
                    break;

                default:
                    // Unknown message type
                    break;
            }
        } catch (error) {
            console.error("Error processing SSE message:", error);
        }
    }, [dispatch]);

    // Setup and manage the SSE connection
    useEffect(() => {
        if (!token) {
            // No token, close connection if exists
            if (eventSource.current) {
                eventSource.current.close();
                eventSource.current = null;
            }
            return;
        }

        // Clear any existing reconnect attempt
        if (reconnectTimeout.current) {
            clearTimeout(reconnectTimeout.current);
            reconnectTimeout.current = null;
        }

        // Only create a new connection if we don't have one already
        if (!eventSource.current) {
            // Create a new EventSource connection
            const url = `${API_BASE_URL}/api/sse/events?token=${token}`;
            const newEventSource = new EventSource(url);
            eventSource.current = newEventSource;

            // Connection opened successfully
            newEventSource.onopen = () => {
                reconnectAttempt.current = 0; // Reset reconnect attempts on successful connection

                // Request notification permission if not already granted
                if ('Notification' in window && Notification.permission === 'default') {
                    Notification.requestPermission();
                }
            };

            // Handle incoming messages (default event)
            newEventSource.onmessage = handleSSEMessage;

            // Handle named events (e.g., event: chat_message)
            newEventSource.addEventListener('chat_message', handleSSEMessage);
            newEventSource.addEventListener('notification', handleSSEMessage);
            newEventSource.addEventListener('contact_request', handleSSEMessage);
            newEventSource.addEventListener('node_chat_message', handleSSEMessage);
            newEventSource.addEventListener('node_chat_participant_change', handleSSEMessage);
            newEventSource.addEventListener('node_chat_typing', handleSSEMessage);

            // Handle errors and reconnection
            newEventSource.onerror = (error) => {
                console.error("SSE connection error:", error);

                // Close the connection
                if (eventSource.current) {
                    eventSource.current.close();
                    eventSource.current = null;
                }

                // Schedule reconnect if we still have a token
                if (token) {
                    scheduleReconnect();
                }
            };
        }

        // Cleanup on unmount or token change
        return () => {
            if (reconnectTimeout.current) {
                clearTimeout(reconnectTimeout.current);
                reconnectTimeout.current = null;
            }

            // CRITICAL FIX: Close the connection and remove event listeners to prevent memory leaks
            if (eventSource.current) {
                const es = eventSource.current;

                // Remove event listeners before closing
                es.removeEventListener('chat_message', handleSSEMessage);
                es.removeEventListener('notification', handleSSEMessage);
                es.removeEventListener('contact_request', handleSSEMessage);
                es.removeEventListener('node_chat_message', handleSSEMessage);
                es.removeEventListener('node_chat_participant_change', handleSSEMessage);
                es.removeEventListener('node_chat_typing', handleSSEMessage);

                // Close the connection
                es.close();
                eventSource.current = null;
            }
        };
    }, [token, handleSSEMessage]);

    /** Reconnect SSE with exponential backoff */
    const scheduleReconnect = () => {
        reconnectAttempt.current += 1;

        // Exponential backoff with a max delay of 30 seconds
        const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempt.current), 30000);

        console.log(`Scheduling SSE reconnect in ${delay}ms (attempt ${reconnectAttempt.current})`);

        reconnectTimeout.current = window.setTimeout(() => {
            // Force the effect to run again by closing the current connection
            if (eventSource.current) {
                eventSource.current.close();
                eventSource.current = null;
            }

            // The main effect will handle reconnection
        }, delay);
    };

    // Return the EventSource for inspection
    return {
        current: eventSource.current,
        connected: eventSource.current?.readyState === EventSource.OPEN
    };
};

export default useSSE;
