import fetchWithAuth from "../hooks/fetchWithAuth";
import config from "../config";

const { API_BASE_URL } = config;

// Get user conversations
export const getUserConversations = async (userId: number) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/get-user-conversations?user_id=${userId}`);
    if (!response.ok) throw new Error("Failed to fetch conversations");

    const data = await response.json();

    // Verify the response structure and adapt it to the frontend model
    if (data && data.private_chats && Array.isArray(data.private_chats)) {
        // Map backend model to frontend model
        data.private_chats = data.private_chats.map((chat: any) => ({
            id: chat.id,
            short_id: chat.short_id || "",
            name: chat.name || "Unknown User",
            lastMessage: "", // Backend doesn't provide this yet
            timestamp: chat.updated_at || new Date().toISOString(),
            avatar_url: chat.avatar_url || null,
            user1_id: chat.user1_id,
            user2_id: chat.user2_id
        }));
    } else {
        // If the backend returns an unexpected format, provide an empty array
        data.private_chats = [];
    }

    return data;
};

// Get or create a private chat (legacy - uses numeric IDs)
export const getOrCreatePrivateChat = async (user1Id: number, user2Id: number) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/get-or-create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user1_id: user1Id, user2_id: user2Id })
    });

    if (!response.ok) throw new Error("Failed to create/get chat");
    const data = await response.json();
    return { chatId: data.chat_id, shortId: data.short_id };
};

// Get or create a private chat using SIDs
export const getOrCreatePrivateChatBySID = async (user1SID: string, user2SID: string) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/get-or-create-by-sid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user1_sid: user1SID, user2_sid: user2SID })
    });

    if (!response.ok) throw new Error("Failed to create/get chat");
    const data = await response.json();
    return { chatId: data.chat_id, shortId: data.short_id };
};

// Get chat messages
export const getChatMessages = async (chatId: number, limit: number = 20, offset: number = 0) => {
    const response = await fetchWithAuth(
        `${API_BASE_URL}/api/messages?chat_id=${chatId}&limit=${limit}&offset=${offset}`
    );
    if (!response.ok) throw new Error("Failed to fetch messages");
    const data = await response.json();
    return data.messages;  // Extract 'messages' from response
};

// Get unread message count
export const getUnreadMessageCount = async (chatId: number, userId: number) => {
    const response = await fetchWithAuth(
        `${API_BASE_URL}/api/unread-count?chat_id=${chatId}&user_id=${userId}`
    );
    if (!response.ok) throw new Error("Failed to fetch unread message count");
    const data = await response.json();
    return data.unread_count;  // Extract 'unread_count' from response
};

// Mark messages as read
export const markMessagesAsRead = async (chatId: number, userId: number) => {
    const response = await fetchWithAuth(
        `${API_BASE_URL}/api/mark-read?chat_id=${chatId}&user_id=${userId}`,
        { method: "POST" }
    );
    if (!response.ok) throw new Error("Failed to mark messages as read");
    return response.json();
};

// Create a group chat
export const createGroupChat = async (name: string, userIds: number[]) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/create-group`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, user_ids: userIds }),
    });
    if (!response.ok) throw new Error("Failed to create group chat");
    const data = await response.json();
    return data.chat_id;  // Extract 'chat_id' from response
};

// Get group members
export const getGroupMembers = async (chatId: number) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/group-members?chat_id=${chatId}`);
    if (!response.ok) throw new Error("Failed to fetch group members");
    const data = await response.json();
    return data.members;  // Extract 'members' from response
};

// Send a chat message via REST API
export const sendChatMessage = async (chatId: number, senderId: number, content: string) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/send-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: chatId,
            sender_id: senderId,
            content: content,
            timestamp: new Date().toISOString()
        })
    });

    if (!response.ok) throw new Error("Failed to send message");
    const data = await response.json();
    return data;
};
