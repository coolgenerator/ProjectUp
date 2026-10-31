# Settings Page to User Preferences Mapping

## Complete Settings Inventory

This document maps all settings from the frontend Settings page to the backend UserPreferences table.

## ✅ Settings Coverage Summary

| Category | Settings in UI | In Preferences Table | Coverage |
|----------|---------------|---------------------|----------|
| **General** | 4 | 4 | 100% ✅ |
| **Account** | 2 | N/A (User data) | N/A |
| **Security** | 1 | N/A (Auth data) | N/A |
| **AI Settings** | 3 | 3 | 100% ✅ |
| **Social Media** | 0 | 0 | N/A (Removed) |
| **Appearance** | 1 | 1 | 100% ✅ |
| **Preferences** | 6 | 6 | 100% ✅ |
| **TOTAL** | **17** | **14** | **100%** |

---

## 1️⃣ General Settings Section

### ✅ Language Preference
- **Frontend State**: `reduxLanguage` (from Redux `state.settings.language`)
- **Backend Field**: `Language` (string, default: "English")
- **Values**: "en", "zh"
- **Storage**: Comma-separated (e.g., "English,中文")
- **API Endpoint**: `PUT /profile/language`

### ✅ Display Name Preference
- **Frontend State**: `displayName`
- **Backend Field**: `DisplayNamePreference` (string, default: "preferredName")
- **Values**: "preferredName", "firstName", "username"
- **API Endpoint**: `PUT /profile/display-name-preference`

### ✅ In-App Notifications
- **Frontend State**: `notificationsEnabled`
- **Backend Field**: `InAppNotifications` (bool, default: true)
- **Description**: Enable/disable in-app notifications

### ✅ Account Privacy
- **Frontend State**: `accountPrivacy`
- **Backend Field**: `ProfileVisibility` (string, default: "public")
- **Values**: "public", "private", "friendsOnly"

---

## 2️⃣ Account Settings Section

### ⚠️ Username
- **Frontend State**: `username`
- **Storage**: `User.Username` (NOT in preferences - this is user identity data)
- **API Endpoint**: `POST /update-username`

### ⚠️ Email
- **Frontend State**: `email`
- **Storage**: `User.Email` (NOT in preferences - this is user identity data)
- **API Endpoint**: `POST /update-email`

---

## 3️⃣ Security Settings Section

### ⚠️ Password
- **Frontend State**: `currentPassword`, `newPassword`, `confirmPassword`
- **Storage**: `User.Password` (NOT in preferences - this is authentication data)
- **API Endpoint**: `POST /update-password-logged-in`

---

## 4️⃣ AI Settings Section

### ✅ OpenAI API Key
- **Frontend State**: `apiKeys.openai`
- **Backend Field**: `OpenAIAPIKey` (*string, nullable)
- **Security**: Should be encrypted in production
- **Notes**: Uses password input type with show/hide toggle

### ✅ Anthropic API Key
- **Frontend State**: `apiKeys.anthropic`
- **Backend Field**: `AnthropicAPIKey` (*string, nullable)
- **Security**: Should be encrypted in production

### ✅ Google AI API Key
- **Frontend State**: `apiKeys.google`
- **Backend Field**: `GoogleAIAPIKey` (*string, nullable)
- **Security**: Should be encrypted in production

---

## 5️⃣ Appearance Settings Section

### ✅ Theme
- **Frontend State**: `theme` (from ThemeContext)
- **Backend Field**: `Theme` (string, default: "light")
- **Values**: "light", "dark", "auto" (auto coming soon)
- **Storage**: Also stored in localStorage for instant load

---

## 6️⃣ Preferences Settings Section

### Modal Preferences

#### ✅ Auto Close Modals
- **Frontend State**: `autoCloseModals`
- **Backend Field**: `AutoCloseModals` (bool, default: true)
- **Description**: Automatically close modal windows after actions

#### ✅ Modal Animations
- **Frontend State**: `modalAnimations`
- **Backend Field**: `ModalAnimations` (bool, default: true)
- **Description**: Enable smooth animations for modals

### Application Behavior

#### ✅ Auto Refresh
- **Frontend State**: `autoRefresh`
- **Backend Field**: `AutoRefresh` (bool, default: true)
- **Description**: Automatically refresh content

#### ✅ Confirm Before Action
- **Frontend State**: `confirmBeforeAction`
- **Backend Field**: `ConfirmBeforeAction` (bool, default: true)
- **Description**: Show confirmation dialogs before important actions

### Performance Settings

#### ✅ Load Animations
- **Frontend State**: `loadAnimations`
- **Backend Field**: `LoadAnimations` (bool, default: true)
- **Description**: Enable UI animations

#### ✅ Prefetch Data
- **Frontend State**: `prefetchData`
- **Backend Field**: `PrefetchData` (bool, default: true)
- **Description**: Prefetch data for better performance

---

## 🔧 Implementation Status

### Backend Status: ✅ Complete
- [x] UserPreferences model created with all 18 preference fields
- [x] Repository methods for CRUD operations
- [x] Migration script ready
- [x] All settings from UI are represented

### Frontend Status: ⚠️ Partial
- [x] Language preference saves to backend
- [x] Display name preference saves to backend
- [ ] Other preferences currently save to localStorage only
- [ ] Need to implement API calls for all other preferences

---

## 📊 Database Schema

```sql
CREATE TABLE user_preferences (
    user_id BIGINT PRIMARY KEY,

    -- Display & Language
    display_name_preference VARCHAR(50) DEFAULT 'preferredName',
    language VARCHAR(255) DEFAULT 'English',

    -- Notifications (6 fields)
    in_app_notifications BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    project_updates BOOLEAN DEFAULT TRUE,
    comment_notifications BOOLEAN DEFAULT TRUE,
    message_notifications BOOLEAN DEFAULT TRUE,

    -- Privacy (4 fields)
    profile_visibility VARCHAR(20) DEFAULT 'public',
    show_email BOOLEAN DEFAULT FALSE,
    show_phone BOOLEAN DEFAULT FALSE,
    allow_contact_requests BOOLEAN DEFAULT TRUE,

    -- UI/Appearance
    theme VARCHAR(20) DEFAULT 'light',

    -- Modal Preferences (2 fields)
    auto_close_modals BOOLEAN DEFAULT TRUE,
    modal_animations BOOLEAN DEFAULT TRUE,

    -- Application Behavior (2 fields)
    auto_refresh BOOLEAN DEFAULT TRUE,
    confirm_before_action BOOLEAN DEFAULT TRUE,

    -- Performance (2 fields)
    load_animations BOOLEAN DEFAULT TRUE,
    prefetch_data BOOLEAN DEFAULT TRUE,

    -- AI Settings (3 fields)
    openai_api_key TEXT,
    anthropic_api_key TEXT,
    google_ai_api_key TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 🚀 Next Steps

### 1. Backend Implementation
- [ ] Create comprehensive preferences service
- [ ] Add endpoint: `GET /api/preferences` - Get all user preferences
- [ ] Add endpoint: `PUT /api/preferences` - Update multiple preferences
- [ ] Add endpoint: `PUT /api/preferences/ai-keys` - Update AI API keys (with encryption)
- [ ] Add endpoint: `PUT /api/preferences/social-media` - Update social media connections

### 2. Frontend Implementation
- [ ] Create preferences API service
- [ ] Update Settings page to load preferences from backend on mount
- [ ] Implement save handlers for all preference sections
- [ ] Remove localStorage fallbacks (keep for theme only)
- [ ] Add loading states for preference updates

### 3. Security
- [ ] Implement encryption for AI API keys
- [ ] Add rate limiting for preference updates
- [ ] Validate social media usernames before saving

### 4. User Experience
- [ ] Show "Saved" indicator when preferences update
- [ ] Add "Reset to Defaults" button
- [ ] Implement preference export/import functionality

---

## 💡 Design Decisions

1. **Why separate preferences table?**
   - Clean separation between identity (User) and settings (UserPreferences)
   - Easy to add new preferences without modifying User table
   - Can implement features like preference versioning, import/export

2. **Why store API keys in preferences?**
   - User-specific configuration
   - Should be encrypted at rest in production
   - Consider using environment variables or secrets manager for production

3. **Why store social media connections?**
   - Future feature: Share content to connected platforms
   - Profile enrichment
   - Social proof and credibility

4. **Boolean defaults to `true`?**
   - Most features should be enabled by default for best UX
   - Users opt-out of features they don't want
   - Privacy settings default to safe (show_email=false, show_phone=false)
