import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type User = {
    id: number;
    username?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    preferred_name?: string | null;
    display_name_preference?: number | null; // 0=preferredName, 1=firstName, 2=username
    email: string;
    avatar?: string | File | null;
    sid?: string | null;
    short_id?: string | null; // Alternative field name for short ID (backend compatibility)
    isOrganization?: boolean;
    organizationId?: number;
}

interface LoginPayload {
    user: User;
    token: string;
    refreshToken: string;
}

interface AuthState {
    init: boolean;
    authenticated: boolean;
    user: User | null;
    token: string | null;
    refreshToken: string | null;
}

const initialState: AuthState = {
    init: false,
    authenticated: false,
    user: null,
    token: null,
    refreshToken: null,
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setAuthenticated: (state, action: PayloadAction<boolean>) => {
            state.authenticated = action.payload;
        },
        setInit: (state, action: PayloadAction<boolean>) => {
            state.init = action.payload;
        },
        updateData: (state, action: PayloadAction<Partial<User>>) => {
            if (state.user) {
                state.user = { ...state.user, ...action.payload };
            }
        },
        login: (state, action: PayloadAction<LoginPayload>) => {
            state.authenticated = true;
            state.user = action.payload.user;
            state.token = action.payload.token;
            state.refreshToken = action.payload.refreshToken;
        },
        logout: (state) => {
            state.authenticated = false;
            state.user = null;
            state.token = null;
            state.refreshToken = null;
        },
    },
});

export const { login, logout, setAuthenticated, setInit, updateData } = authSlice.actions;
export default authSlice.reducer;