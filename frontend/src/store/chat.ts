import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface Message {
    chatId: number;
    senderId: number;
    content: string;
    timestamp: string;
    isRead: boolean;
}

interface ChatState {
    history: Record<number, Message[]>;
    currentChat: number | null;
    connected: boolean;
}

const initialState: ChatState = {
    history: {},
    currentChat: null,
    connected: false,
};

const chatSlice = createSlice({
    name: "chat",
    initialState,
    reducers: {
        setCurrentChat: (state, action: PayloadAction<number | null>) => {
            state.currentChat = action.payload;
        },
        addMessage: (state, action: PayloadAction<{ chatId: number; message: Message }>) => {
            if (!state.history[action.payload.chatId]) {
                state.history[action.payload.chatId] = [];
            }
            state.history[action.payload.chatId].push(action.payload.message);

            // MEMORY FIX: Keep only the last 100 messages per chat to prevent unbounded memory growth
            if (state.history[action.payload.chatId].length > 100) {
                state.history[action.payload.chatId] = state.history[action.payload.chatId].slice(-100);
            }
        },
        setChatHistory: (state, action: PayloadAction<{ chatId: number; messages: Message[]; unreadCount: number }>) => {
            state.history[action.payload.chatId] = action.payload.messages;
        },
        setConnected: (state, action: PayloadAction<boolean>) => {
            state.connected = action.payload;
        },
        markMessagesAsRead: (state, action: PayloadAction<number>) => {
            const chatId = action.payload;
            if (state.history[chatId]) {
                state.history[chatId] = state.history[chatId].map(msg => ({
                    ...msg,
                    isRead: true,
                }));
            }
        },
        clearOldChats: (state) => {
            // MEMORY FIX: Clear chat history for non-current chats to free memory
            if (state.currentChat !== null) {
                const currentChatId = state.currentChat;
                state.history = { [currentChatId]: state.history[currentChatId] || [] };
            } else {
                // If no current chat, clear all
                state.history = {};
            }
        }
    },
});

export const { setCurrentChat, addMessage, setChatHistory, setConnected, markMessagesAsRead, clearOldChats } = chatSlice.actions;
export default chatSlice.reducer;
