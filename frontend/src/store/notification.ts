import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface Notification {
    id: string;
    type: string;
    content: string;
    timestamp: string;
    read: boolean;
}

interface UnreadMessages {
    chatId: number;
    count: number;
}

interface ContactRequest {
    senderId: number;
    senderName: string;
    message?: string;
    timestamp: string;
}

interface NotificationState {
    notifications: Notification[];
    unreadMessages: { [chatId: number]: number };
    contactRequests: ContactRequest[];
}

const initialState: NotificationState = {
    notifications: [],
    unreadMessages: {},
    contactRequests: [],
};

const notificationSlice = createSlice({
    name: "notifications",
    initialState,
    reducers: {
        addNotification: (state, action: PayloadAction<Notification>) => {
            state.notifications.push(action.payload);
        },
        markNotificationAsRead: (state, action: PayloadAction<string>) => {
            const notification = state.notifications.find((n) => n.id === action.payload);
            if (notification) notification.read = true;
        },
        setUnreadMessages: (state, action: PayloadAction<UnreadMessages>) => {
            const { chatId, count } = action.payload;

            if (count === 0) {
                // Reset unread count when messages are read
                delete state.unreadMessages[chatId];
            } else {
                // Ensure the count does not decrease incorrectly
                state.unreadMessages[chatId] = (state.unreadMessages[chatId] || 0) + count;
            }
        },
        addContactRequest: (state, action: PayloadAction<ContactRequest>) => {
            state.contactRequests.push(action.payload);
        },
        removeContactRequest: (state, action: PayloadAction<number>) => {
            state.contactRequests = state.contactRequests.filter((req) => req.senderId !== action.payload);
        },
        setContactRequests: (state, action: PayloadAction<ContactRequest[]>) => {
            state.contactRequests = action.payload;
        },
        setNotifications: (state, action: PayloadAction<Notification[]>) => {
            state.notifications = action.payload;
        },
    },
});

export const {
    addNotification,
    markNotificationAsRead,
    setUnreadMessages,
    addContactRequest,
    removeContactRequest,
    setContactRequests,
    setNotifications
} = notificationSlice.actions;
export default notificationSlice.reducer;
