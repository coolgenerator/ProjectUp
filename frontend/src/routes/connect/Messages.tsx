import React, { useState, useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { setCurrentChat, addMessage, setChatHistory } from "../../store/chat";
import { setUnreadMessages } from "../../store/notification";
import useSSE from "../../hooks/sseService";
import { RootState } from "../../store/store";
import useInfiniteScroll from "../../hooks/useInfiniteScroll";
import { Conversation } from "../../types/message/conversation";
import LoadingPage from "../../components/app/Loading";
import { getUserConversations, getChatMessages, getOrCreatePrivateChat, getOrCreatePrivateChatBySID, sendChatMessage } from "../../services/chatServices";
import fetchWithAuth from "../../hooks/fetchWithAuth";
import config from "../../config";

const { API_BASE_URL } = config;

const Message: React.FC = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { chatId: urlChatId } = useParams<{ chatId?: string }>();
    const currentUser = useSelector((state: RootState) => state.auth.user);
    const userId = useSelector((state: RootState) => state.auth.user?.id) as number | undefined;
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loadingConversations, setLoadingConversations] = useState(false);
    const [conversationError, setConversationError] = useState<string | null>(null);
    const [showNewMessagePrompt, setShowNewMessagePrompt] = useState(false);
    const [isChatListOpen, setIsChatListOpen] = useState(true);
    const chatEndRef = useRef<HTMLDivElement | null>(null);
    const [pendingChatUserId, setPendingChatUserId] = useState<number | null>(null);
    const [pendingChatUserSID, setPendingChatUserSID] = useState<string | null>(null);

    const unreadCount = useSelector((state: RootState) => state.notification.unreadMessages || {});
    const currentChat = useSelector((state: RootState) => state.chat.currentChat);
    const chatHistory = useSelector((state: RootState) =>
        currentChat !== null ? state.chat.history[currentChat] || [] : []
    );

    const [newMessage, setNewMessage] = useState("");
    const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [offset, setOffset] = useState(0);
    const { chatContainerRef, setIsFetching } = useInfiniteScroll(loadMoreMessages);

    const sse = useSSE();

    /** Fetch user conversations once when the component mounts */
    useEffect(() => {
        const fetchConversations = async () => {
            setLoadingConversations(true);
            setConversationError(null);
            try {
                if (!userId) throw new Error("User ID not found");
                const chats = await getUserConversations(userId);

                // Add safety check to ensure chats.private_chats exists and is an array
                if (chats && chats.private_chats && Array.isArray(chats.private_chats)) {
                    // Filter conversations: show non-empty chats to everyone,
                    // but show empty chats only to the initiator (user1)
                    const filteredConversations = chats.private_chats.filter((chat: Conversation) => {
                        const hasMessages = chat.lastMessage && chat.lastMessage.trim() !== "" && chat.lastMessage !== "No messages yet";
                        const isInitiator = chat.user1_id === userId;
                        // Show if: has messages OR (empty AND current user is initiator)
                        return hasMessages || isInitiator;
                    });
                    setConversations(filteredConversations);
                } else {
                    setConversations([]);
                    setConversationError(t('messages.failedToLoad'));
                }
            } catch (error) {
                setConversationError(t('messages.failedToLoad'));
                console.error("Error fetching conversations:", error);
                setConversations([]); // Set to empty array on error
            } finally {
                setLoadingConversations(false);
            }
        };

        fetchConversations();

        // A prefilled first message from where the chat was opened, for the sender to edit
        const pendingDraft = sessionStorage.getItem('pendingChatDraft');
        if (pendingDraft) {
            sessionStorage.removeItem('pendingChatDraft');
            setNewMessage(pendingDraft);
        }

        // Check for pending chat user SID (preferred) or ID (fallback)
        const pendingUserSID = sessionStorage.getItem('pendingChatUserSID');
        const pendingUserId = sessionStorage.getItem('pendingChatUserId');

        if (pendingUserSID) {
            sessionStorage.removeItem('pendingChatUserSID');
            console.log("Starting new conversation with user SID:", pendingUserSID);

            // Create chat immediately when SID is detected
            const createChatFromSID = async () => {
                try {
                    if (!userId) {
                        console.error("User ID not found");
                        return;
                    }

                    // Get current user's SID
                    const currentUserSID = currentUser?.sid || currentUser?.short_id;
                    if (!currentUserSID) {
                        console.error("Current user SID not found");
                        setPendingChatUserSID(pendingUserSID); // Fallback to old behavior
                        return;
                    }

                    setLoadingConversations(true);
                    const result = await getOrCreatePrivateChatBySID(currentUserSID, pendingUserSID);

                    if (result && result.chatId) {
                        const { chatId, shortId } = result;
                        // Set as current chat
                        dispatch(setCurrentChat(chatId));

                        // Refresh conversations to get the new chat details
                        const updatedChats = await getUserConversations(userId);
                        if (updatedChats && updatedChats.private_chats && Array.isArray(updatedChats.private_chats)) {
                            // Filter conversations: show non-empty chats to everyone,
                            // but show empty chats only to the initiator (user1)
                            const filteredConversations = updatedChats.private_chats.filter((chat: Conversation) => {
                                const hasMessages = chat.lastMessage && chat.lastMessage.trim() !== "" && chat.lastMessage !== "No messages yet";
                                const isInitiator = chat.user1_id === userId;
                                return hasMessages || isInitiator;
                            });
                            setConversations(filteredConversations);

                            // Select the newly created chat
                            const newChat = updatedChats.private_chats.find((c: Conversation) => c && c.id === chatId);
                            if (newChat) {
                                setSelectedChat(newChat);
                                // Update URL to reflect the selected chat using ShortID
                                navigate(`/messages/${newChat.short_id}`, { replace: true });
                            } else if (shortId) {
                                // If chat not found in list (shouldn't happen), navigate with the shortId we got from creation
                                navigate(`/messages/${shortId}`, { replace: true });
                            }

                            // Reset unread count for the newly created chat after fetching conversations
                            // This ensures system messages don't show as unread
                            dispatch(setUnreadMessages({ chatId: chatId, count: 0 }));
                        }
                    }
                } catch (error) {
                    console.error("Failed to create chat from SID:", error);
                    setPendingChatUserSID(pendingUserSID); // Fallback to old behavior
                } finally {
                    setLoadingConversations(false);
                }
            };

            createChatFromSID();
        } else if (pendingUserId) {
            const parsedPendingUserId = parseInt(pendingUserId);
            sessionStorage.removeItem('pendingChatUserId');

            // Check if conversation already exists with this user
            const existingChat = conversations.find((chat: any) => {
                return chat.id === parsedPendingUserId || chat.user_id === parsedPendingUserId;
            });

            if (existingChat) {
                handleSelectChat(existingChat.id);
            } else {
                console.log("Starting new conversation with user ID:", parsedPendingUserId);
                setPendingChatUserId(parsedPendingUserId); // Keep for when user sends first message
            }
        }
    }, [userId]);

    /** Set the selected chat if it's stored in Redux */
    useEffect(() => {
        if (currentChat && conversations && Array.isArray(conversations) && conversations.length > 0) {
            const chat = conversations.find(c => c && c.id === currentChat);
            if (chat) {
                setSelectedChat(chat);
            }
        }
    }, [currentChat, conversations]);

    /** Handle URL-based chat selection */
    useEffect(() => {
        if (urlChatId && conversations && Array.isArray(conversations) && conversations.length > 0) {
            // Find chat by ShortID
            const chat = conversations.find(c => c && c.short_id === urlChatId);
            if (chat && currentChat !== chat.id) {
                // Select the chat from URL
                dispatch(setCurrentChat(chat.id));
                dispatch(setUnreadMessages({ chatId: chat.id, count: 0 }));
                setSelectedChat(chat);
            }
        }
    }, [urlChatId, conversations, currentChat, dispatch]);

    /** Fetch chat messages when selecting a chat */
    useEffect(() => {
        if (selectedChat) {
            const fetchMessages = async () => {
                try {
                    setLoading(true);
                    setError(null);

                    // Fetch messages with error handling
                    let formattedMessages: {
                        chatId: number;
                        senderId: number;
                        content: string;
                        timestamp: string;
                        isRead: boolean;
                    }[] = [];
                    let unreadCount = 0;

                    try {
                        const messages = await getChatMessages(selectedChat.id, 20, offset);

                        if (Array.isArray(messages)) {
                            // Normalize message format to match Redux store structure
                            formattedMessages = messages.map((msg: any) => ({
                                chatId: msg.ChatID,
                                senderId: msg.SenderID,
                                content: msg.Content,
                                timestamp: msg.Timestamp,
                                isRead: msg.IsRead || false
                            }));
                        }
                    } catch (messageError) {
                        console.error("Error fetching chat messages:", messageError);
                        setError(t('messages.failedToLoadMessages'));
                    }

                    try {
                        unreadCount = await fetchUnreadCount(selectedChat.id);
                    } catch (countError) {
                        console.error("Error fetching unread count:", countError);
                    }

                    dispatch(setChatHistory({
                        chatId: selectedChat.id,
                        messages: formattedMessages,
                        unreadCount: unreadCount
                    }));
                    dispatch(setUnreadMessages({
                        chatId: selectedChat.id,
                        count: unreadCount
                    }));

                    // **Scroll to Bottom When First Entering Chat**
                    setTimeout(() => {
                        if (chatEndRef.current) {
                            chatEndRef.current.scrollIntoView({ behavior: "instant" });
                        }
                    }, 200);
                } catch (error) {
                    setError(t('messages.failedToLoadMessages'));
                    console.error("Error fetching messages:", error);
                } finally {
                    setLoading(false);
                }
            };

            fetchMessages();
        }
    }, [selectedChat, offset, dispatch]);

    const isAtBottom = useCallback(() => {
        if (!chatContainerRef.current) return false;

        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        return Math.abs(scrollHeight - scrollTop - clientHeight) <= 500;
    }, [chatContainerRef]);

    useEffect(() => {
        if (selectedChat?.id && unreadCount[selectedChat.id] > 0) {
            if (isAtBottom()) {
                setShowNewMessagePrompt(false);
            } else {
                setShowNewMessagePrompt(true);
            }
        }
    }, [chatHistory, unreadCount, selectedChat, isAtBottom]);

    useEffect(() => {
        if (chatContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;

            // Show the icon if user is NOT at the bottom
            if (scrollHeight - (scrollTop + clientHeight) > 500) {
                setShowNewMessagePrompt(true);
            }
        }
    }, [chatHistory]);

    /** Update filtered conversations when searchTerm changes */
    useEffect(() => {
        if (!conversations) {
            setFilteredConversations([]);
            return;
        }

        const conversationsArray = Array.isArray(conversations) ? conversations : [];

        if (conversationsArray.length === 0) {
            setFilteredConversations([]);
            return;
        }

        if (searchTerm.trim() === "") {
            setFilteredConversations(conversationsArray); // Show all if no search
        } else {
            const filtered = conversationsArray.filter(chat =>
                chat.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredConversations(filtered);
        }
    }, [searchTerm, conversations]);

    useEffect(() => {
        if (error) {
            console.error("Chat error:", error);
        }
    }, [error]);

    const fetchUnreadCount = async (chatId: number) => {
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/api/unread-count?chat_id=${chatId}&user_id=${userId}`);
            const data = await res.json();
            return data.unread_count;
        } catch (err) {
            console.error("Failed to fetch unread count:", err);
            return 0;
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            if (chatEndRef.current) {
                chatEndRef.current.scrollIntoView({ behavior: "smooth" });
                setShowNewMessagePrompt(false); // Hide new message icon after scrolling
            }
        }, 100);
    };

    /** Handle chat selection */
    const handleSelectChat = (chatId: number) => {
        if (currentChat !== chatId) {
            dispatch(setCurrentChat(chatId));

            // Reset unread count in Redux
            dispatch(setUnreadMessages({ chatId: chatId, count: 0 }));

            const chat = conversations.find((c) => c.id === chatId);
            if (chat) {
                setSelectedChat(chat);
                // Update URL to reflect selected chat using ShortID
                navigate(`/messages/${chat.short_id}`, { replace: true });
            }
        }
    };

    /** Handle sending a message */
    const handleSendMessage = async () => {
        if (newMessage.trim()) {
            try {
                let chatId = selectedChat?.id;

                // If we have a pending chat user and no selected chat, create the chat first
                if ((pendingChatUserSID || pendingChatUserId) && !selectedChat) {
                    if (!userId) {
                        setError(t('messages.errors.notLoggedIn') || "You must be logged in to send messages");
                        return;
                    }

                    try {
                        // Show loading state
                        setLoading(true);

                        // Create the chat now that we have a message to send
                        // Prefer SID-based creation if available
                        let chatShortId = "";
                        if (pendingChatUserSID) {
                            // Get current user's SID from their profile
                            const currentUserSID = currentUser?.sid || currentUser?.short_id;

                            if (!currentUserSID) {
                                throw new Error("Current user SID not found");
                            }

                            const result = await getOrCreatePrivateChatBySID(currentUserSID, pendingChatUserSID);
                            chatId = result.chatId;
                            chatShortId = result.shortId;
                            setPendingChatUserSID(null);
                        } else if (pendingChatUserId) {
                            const result = await getOrCreatePrivateChat(userId, pendingChatUserId);
                            chatId = result.chatId;
                            chatShortId = result.shortId;
                            setPendingChatUserId(null);
                        }

                        if (!chatId) {
                            throw new Error("Failed to create chat: No chat ID returned");
                        }

                        // Set the chat as current immediately (don't wait for refresh)
                        dispatch(setCurrentChat(chatId));

                        // Create a temporary conversation object for the UI
                        // We'll refresh the full details after the message is sent
                        const tempConversation: Conversation = {
                            id: chatId,
                            short_id: chatShortId,
                            name: "New Chat",
                            lastMessage: "",
                            timestamp: new Date().toISOString(),
                            avatar_url: null,
                            user1_id: userId,
                            user2_id: pendingChatUserId || 0
                        };
                        setSelectedChat(tempConversation);

                        // Navigate to the chat with ShortID immediately
                        if (chatShortId) {
                            navigate(`/messages/${chatShortId}`, { replace: true });
                        }

                        setLoading(false);
                    } catch (error) {
                        setLoading(false);
                        const errorMessage = error instanceof Error ? error.message : "Unknown error";
                        setError(t('messages.failedToCreate') || `Failed to create conversation: ${errorMessage}`);
                        console.error("Chat creation error:", error);
                        return;
                    }
                }

                if (!chatId) {
                    setError(t('messages.noChat') || "No active conversation");
                    return;
                }

                // Send message via REST API
                await sendChatMessage(chatId, userId || 0, newMessage);

                // Add message to local state for immediate UI update
                dispatch(addMessage({
                    chatId: chatId,
                    message: {
                        chatId: chatId,
                        senderId: userId || 0,
                        content: newMessage,
                        timestamp: new Date().toISOString(),
                        isRead: false
                    }
                }));
                setNewMessage("");
                setError(null); // Clear any previous errors
                scrollToBottom();

                // Refresh conversation list after a short delay to get updated details
                // This is especially important for new conversations
                setTimeout(async () => {
                    try {
                        if (!userId) return;
                        const updatedChats = await getUserConversations(userId);
                        if (updatedChats && updatedChats.private_chats && Array.isArray(updatedChats.private_chats)) {
                            // Filter conversations: show non-empty chats to everyone,
                            // but show empty chats only to the initiator (user1)
                            const filteredConversations = updatedChats.private_chats.filter((chat: Conversation) => {
                                const hasMessages = chat.lastMessage && chat.lastMessage.trim() !== "" && chat.lastMessage !== "No messages yet";
                                const isInitiator = chat.user1_id === userId;
                                return hasMessages || isInitiator;
                            });
                            setConversations(filteredConversations);

                            // Update selected chat with full details if available
                            const updatedChat = filteredConversations.find((c: Conversation) => c && c.id === chatId);
                            if (updatedChat) {
                                setSelectedChat(updatedChat);
                            }

                            // Reset unread count for current chat after refresh
                            // This ensures system messages don't show as unread
                            if (chatId) {
                                dispatch(setUnreadMessages({ chatId: chatId, count: 0 }));
                            }
                        }
                    } catch (error) {
                        console.error("Failed to refresh conversations:", error);
                    }
                }, 500);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "Unknown error";
                setError(t('messages.failedToSend') || `Failed to send message: ${errorMessage}`);
                console.error("WebSocket send error:", err);
            }
        }
    };

    /** Load more messages on scroll */
    async function loadMoreMessages() {
        if (loading || !selectedChat || offset === 0) return;

        setLoading(true);

        // Preserve current scroll height
        const scrollHeightBefore = chatContainerRef.current?.scrollHeight || 0;

        try {
            const messages = await getChatMessages(selectedChat.id, 20, offset);
            if (messages.length > 0) {
                dispatch(addMessage({ chatId: selectedChat.id, message: messages }));
                setOffset(offset + 20);
            }
        } catch (error) {
            setError(t('messages.failedToLoadMessages'));
            console.error("Message load error:", error);
        } finally {
            setLoading(false);
            setIsFetching(false);

            // Preserve scroll position
            setTimeout(() => {
                if (chatContainerRef.current) {
                    chatContainerRef.current.scrollTop += chatContainerRef.current.scrollHeight - scrollHeightBefore;
                }
            }, 100);
        }
    }

    // Update the message display component
    const MessageBubble: React.FC<{
        message: any;
        isCurrentUser: boolean;
        sender: any;
        isSystemMessage: boolean;
    }> = ({ message, isCurrentUser, sender, isSystemMessage }) => {
        // Ensure we have valid data
        const content = message?.content || "";
        const timestamp = message?.timestamp ? new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }) : '';
        const senderName = sender?.username || "User";
        const senderAvatar = sender?.avatar || "/assets/default-avatar.png";

        if (isSystemMessage) {
            return (
                <div className="flex justify-center my-3 w-full">
                    <div className="bg-gray-100 text-gray-600 text-sm px-4 py-2 rounded-lg shadow-sm italic max-w-[85%]">
                        {content}
                    </div>
                </div>
            );
        }

        return (
            <div className={`flex ${isCurrentUser ? "justify-end" : "justify-start"} w-full my-4 items-end`}>
                {/* Avatar on the Side - Only show on larger screens for non-current user */}
                {!isCurrentUser && (
                    <div className="self-end mb-1">
                        <img
                            src={senderAvatar}
                            alt={senderName}
                            className="w-8 h-8 rounded-full mr-2"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null;
                                target.src = "/assets/default-avatar.png";
                            }}
                        />
                    </div>
                )}

                {/* Message Content Wrapper */}
                <div className={`flex flex-col ${isCurrentUser ? "items-end" : "items-start"} max-w-[75%] sm:max-w-[70%]`}>
                    {/* Message Bubble & Timestamp */}
                    <div className="relative">
                        <div
                            className={`px-4 py-2.5 rounded-2xl break-words shadow-sm
                                ${isCurrentUser
                                    ? "bg-blue-500 text-white rounded-br-sm"
                                    : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"
                                }`}
                        >
                            {/* Username only for non-current user */}
                            {!isCurrentUser && (
                                <p className="text-xs font-semibold text-gray-600 mb-1">
                                    {senderName}
                                </p>
                            )}

                            {/* Message content */}
                            <p className="whitespace-pre-wrap text-sm sm:text-base">{content}</p>
                        </div>

                        {/* Timestamp - Positioned below */}
                        <div className={`flex items-center gap-1.5 mt-1 text-[11px] text-gray-500`}>
                            <span>{timestamp}</span>
                            {isCurrentUser && (
                                <span className="flex items-center gap-0.5">
                                    <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
                                    </svg>
                                    <span>{t('messages.sent')}</span>
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Avatar for Current User - Only show on larger screens */}
                {isCurrentUser && (
                    <div className="self-end mb-1">
                        <img
                            src={senderAvatar}
                            alt={senderName}
                            className="w-8 h-8 rounded-full ml-2"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null;
                                target.src = "/assets/default-avatar.png";
                            }}
                        />
                    </div>
                )}
            </div>
        );
    };

    // Update the chat list item component
    const ChatListItem: React.FC<{
        conversation: Conversation;
        isSelected: boolean;
        unreadCount: number;
        onSelect: (id: number) => void;
    }> = ({ conversation, isSelected, unreadCount, onSelect }) => {
        // Ensure we have valid data with fallbacks
        const name = conversation?.name || "Unknown User";
        const lastMessage = conversation?.lastMessage || "No messages yet";
        const timestamp = conversation?.timestamp ? new Date(conversation.timestamp).toLocaleDateString([], {
            month: 'short',
            day: 'numeric'
        }) : '';
        const avatarUrl = conversation?.avatar_url || "/assets/default-avatar.png";

        return (
            <li
                onClick={() => onSelect(conversation.id)}
                className={`p-3 border-b cursor-pointer flex items-center gap-3 hover:bg-gray-50 transition-colors duration-200 ${isSelected ? "bg-blue-50" : ""
                    }`}
            >
                <div className="relative">
                    <img
                        src={avatarUrl}
                        alt={name}
                        className="w-12 h-12 rounded-full border border-gray-200"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = "/assets/default-avatar.png";
                        }}
                    />
                    {unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="font-medium truncate">{name}</div>
                    <div className="text-xs text-gray-500 truncate mt-0.5">
                        {lastMessage}
                    </div>
                </div>
                <div className="text-xs text-gray-400">
                    {timestamp}
                </div>
            </li>
        );
    };

    // Helper function to fetch conversations (used in multiple places)
    const fetchConversations = async () => {
        try {
            if (!userId) throw new Error("User ID not found");
            const chats = await getUserConversations(userId);

            if (chats && chats.private_chats && Array.isArray(chats.private_chats)) {
                setConversations(chats.private_chats);
            }
            return chats;
        } catch (error) {
            console.error("Error fetching conversations:", error);
            return null;
        }
    };

    return (
        <div className="flex bg-gray-50 relative h-[calc(100vh-4rem)]">
            {/* Conversations List - Responsive for mobile */}
            <div
                className={`bg-white border-r border-gray-200 transition-all duration-300
                h-full shadow-sm flex flex-col fixed md:relative z-30
                ${isChatListOpen
                        ? "w-full md:w-[400px]"
                        : "w-0 -left-full md:left-auto md:w-0 hidden"}`}
            >
                {/* Conversations Header with Close Button */}
                <div className="p-4 border-b">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold">{t('messages.conversations')}</h2>
                        <button
                            onClick={() => setIsChatListOpen(false)}
                            className="md:hidden text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
                            aria-label="Close conversation list"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                    <input
                        type="text"
                        placeholder={t('messages.searchPlaceholder')}
                        className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto">
                    {loadingConversations ? (
                        <LoadingPage />
                    ) : conversationError ? (
                        <div className="text-red-500 text-center mt-10">{conversationError}</div>
                    ) : filteredConversations && filteredConversations.length > 0 ? (
                        <ul>
                            {filteredConversations.map((conversation) => (
                                <ChatListItem
                                    key={conversation.id}
                                    conversation={conversation}
                                    isSelected={selectedChat?.id === conversation.id}
                                    unreadCount={unreadCount?.[conversation.id] ?? 0}
                                    onSelect={(id) => {
                                        handleSelectChat(id);
                                        // On mobile, close the chat list when selecting a chat
                                        if (window.innerWidth < 768) {
                                            setIsChatListOpen(false);
                                        }
                                    }}
                                />
                            ))}
                        </ul>
                    ) : (
                        <div className="text-gray-500 text-center mt-10">{t('messages.noConversations')}</div>
                    )}
                </div>
            </div>

            {/* Chat Area - Full width on mobile */}
            <div className="flex flex-col transition-all duration-300 w-full relative">
                <div className="absolute top-0 left-0 right-0 h-14 bg-white border-b flex items-center z-20">
                    {/* Toggle Button in the header - Always visible */}
                    <button
                        onClick={() => setIsChatListOpen(!isChatListOpen)}
                        className="bg-white text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 shadow-sm transition-all duration-300 ml-3"
                        aria-label={isChatListOpen ? "Close chat list" : "Open chat list"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                    </button>

                    {/* Content with proper spacing */}
                    <div className="flex-1 px-4 ml-3">
                        {selectedChat !== null ? (
                            <div className="flex justify-between items-center w-full">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={selectedChat.avatar_url || "/assets/default-avatar.png"}
                                        alt={selectedChat.name}
                                        className="w-10 h-10 rounded-full"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.onerror = null;
                                            target.src = "/assets/default-avatar.png";
                                        }}
                                    />
                                    <h2 className="text-lg font-bold truncate">{selectedChat.name}</h2>
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedChat(null);
                                        dispatch(setCurrentChat(null));
                                        navigate('/messages', { replace: true });
                                    }}
                                    className="text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-full hover:bg-gray-100"
                                    aria-label="Close chat"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        ) : (
                            <h2 className="text-lg font-bold truncate">{t('messages.selectConversation')}</h2>
                        )}
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mx-3 mt-16 rounded">
                        <div className="flex items-center">
                            <svg className="h-5 w-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-red-700">{error}</p>
                            <button
                                onClick={() => setError(null)}
                                className="ml-auto text-red-500 hover:text-red-700"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                {/* Messages Area - Add top padding to account for fixed header */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 mt-14 bg-gray-50" ref={chatContainerRef}>
                    {loading ? (
                        <LoadingPage />
                    ) : selectedChat !== null ? (
                        chatHistory && chatHistory.length > 0 ? (
                            <div className="space-y-1 pb-4">
                                {chatHistory.map((message, index) => {
                                    const isCurrentUser = message.senderId === userId;
                                    const isSystemMessage = message.senderId === 0;
                                    const messageSender = isCurrentUser
                                        ? currentUser
                                        : { username: selectedChat?.name, avatar: selectedChat?.avatar_url };

                                    return (
                                        <MessageBubble
                                            key={index}
                                            message={message}
                                            isCurrentUser={isCurrentUser}
                                            sender={messageSender}
                                            isSystemMessage={isSystemMessage}
                                        />
                                    );
                                })}
                                <div ref={chatEndRef}></div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                                <p className="text-center">{t('messages.noConversationsDesc')}</p>
                            </div>
                        )
                    ) : (pendingChatUserId !== null || pendingChatUserSID !== null) ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <svg className="w-16 h-16 text-blue-400 mb-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            <p className="text-lg font-semibold text-gray-700 mb-2">{t('messages.newConversation') || 'Start a new conversation'}</p>
                            <p className="text-sm text-gray-500">{t('messages.typeMessageToStart') || 'Type a message below to start chatting'}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                            </svg>
                            <p className="text-lg">{t('messages.selectConversation')}</p>
                        </div>
                    )}
                </div>

                {/* "New Message" Button */}
                {showNewMessagePrompt && (
                    <button
                        onClick={scrollToBottom}
                        className="fixed bottom-20 right-4 flex items-center gap-2 bg-white text-blue-500 px-4 py-2 rounded-full shadow-lg transition-all duration-300 hover:bg-blue-50 hover:shadow-xl animate-pulse border border-blue-100 z-10"
                        aria-label="Scroll to new messages"
                    >
                        <span className="text-sm font-medium">{t('messages.newMessages')}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                )}

                {/* Message Input */}
                {(selectedChat !== null || pendingChatUserId !== null) && (
                    <div className="p-3 sm:p-4 border-t bg-white shadow-sm">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                placeholder={t('messages.typeMessage')}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                className="flex-1 p-3 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!newMessage.trim()}
                                className="bg-blue-500 text-white p-3 rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                                aria-label="Send message"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Message;
