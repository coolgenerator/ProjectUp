import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface SettingsState {
    language: string;
    theme: string;
    displayName: string;
    notificationsEnabled: boolean;
    accountPrivacy: string;
    autoCloseModals: boolean;
    modalAnimations: boolean;
    autoRefresh: boolean;
    confirmBeforeAction: boolean;
    loadAnimations: boolean;
    prefetchData: boolean;
}

const initialState: SettingsState = {
    language: localStorage.getItem('language') || 'en',
    theme: localStorage.getItem('theme') || 'light',
    displayName: localStorage.getItem('displayName') || 'firstName',
    notificationsEnabled: localStorage.getItem('notificationsEnabled') === 'true',
    accountPrivacy: localStorage.getItem('accountPrivacy') || 'public',
    autoCloseModals: localStorage.getItem('autoCloseModals') !== 'false',
    modalAnimations: localStorage.getItem('modalAnimations') !== 'false',
    autoRefresh: localStorage.getItem('autoRefresh') !== 'false',
    confirmBeforeAction: localStorage.getItem('confirmBeforeAction') !== 'false',
    loadAnimations: localStorage.getItem('loadAnimations') !== 'false',
    prefetchData: localStorage.getItem('prefetchData') !== 'false',
};

const settingsSlice = createSlice({
    name: "settings",
    initialState,
    reducers: {
        setLanguage: (state, action: PayloadAction<string>) => {
            state.language = action.payload;
            localStorage.setItem('language', action.payload);
        },
        setTheme: (state, action: PayloadAction<string>) => {
            state.theme = action.payload;
            localStorage.setItem('theme', action.payload);
        },
        setDisplayName: (state, action: PayloadAction<string>) => {
            state.displayName = action.payload;
            localStorage.setItem('displayName', action.payload);
        },
        setNotificationsEnabled: (state, action: PayloadAction<boolean>) => {
            state.notificationsEnabled = action.payload;
            localStorage.setItem('notificationsEnabled', action.payload.toString());
        },
        setAccountPrivacy: (state, action: PayloadAction<string>) => {
            state.accountPrivacy = action.payload;
            localStorage.setItem('accountPrivacy', action.payload);
        },
        updateSettings: (state, action: PayloadAction<Partial<SettingsState>>) => {
            Object.keys(action.payload).forEach((key) => {
                const typedKey = key as keyof SettingsState;
                const value = action.payload[typedKey];
                if (value !== undefined) {
                    (state as any)[typedKey] = value;
                    localStorage.setItem(typedKey, value.toString());
                }
            });
        },
        loadSettingsFromBackend: (state, action: PayloadAction<Partial<SettingsState>>) => {
            // Update state with settings from backend
            Object.keys(action.payload).forEach((key) => {
                const typedKey = key as keyof SettingsState;
                const value = action.payload[typedKey];
                if (value !== undefined) {
                    (state as any)[typedKey] = value;
                    localStorage.setItem(typedKey, value.toString());
                }
            });
        },
    },
});

export const { 
    setLanguage, 
    setTheme, 
    setDisplayName, 
    setNotificationsEnabled, 
    setAccountPrivacy,
    updateSettings,
    loadSettingsFromBackend 
} = settingsSlice.actions;

export default settingsSlice.reducer;