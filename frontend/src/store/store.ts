import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import authReducer from "./auth";
import chatReducer from "./chat"
import notificationReducer from "./notification";
import settingsReducer from "./settings";
import tutorialReducer from "./tutorial";
import ideaForestReducer from "./slices/ideaForestSlice";
import versionsReducer from "./slices/versionsSlice";

// Config persist
const persistConfig = {
    key: 'root',
    storage,
    whitelist: ["auth", "chat", "settings", "tutorial"],
};

const rootReducer = combineReducers({
    auth: authReducer,
    chat: chatReducer,
    notification: notificationReducer,
    settings: settingsReducer,
    tutorial: tutorialReducer,
    ideaForest: ideaForestReducer,
    versions: versionsReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure the store with the persisted reducer
const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false, // Disable warnings for non-serializable values
        }),
});

export const persistor = persistStore(store);

// Export RootState type directly from rootReducer instead of store.getState
// This avoids PersistPartial type pollution from redux-persist
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;

export default store;