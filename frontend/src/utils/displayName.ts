/**
 * Get display name based on user's preference
 * - For preferredName (0) or firstName (1): always includes last name
 * - For username (2): shows username only
 * Priority fallback: preference-based name → preferred name + last → first name + last → username → "User"
 */

// Display name preference constants (matching backend)
export const DISPLAY_NAME_PREFERRED = 0; // Use preferred_name (with last_name)
export const DISPLAY_NAME_FIRST = 1;     // Use first_name (with last_name)
export const DISPLAY_NAME_USERNAME = 2;  // Use username only

interface DisplayNameUser {
    username?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    preferred_name?: string | null;
    display_name_preference?: number | null;
}

export const getDisplayName = (user: DisplayNameUser | null | undefined): string => {
    if (!user) return "User";

    const preference = user.display_name_preference ?? DISPLAY_NAME_PREFERRED; // Default to 0 (preferredName)

    // Handle username preference (2) - show username only (no last name)
    if (preference === DISPLAY_NAME_USERNAME) {
        return user.username || user.preferred_name || user.first_name || "User";
    }

    // Handle firstName preference (1) - show first name + last name
    if (preference === DISPLAY_NAME_FIRST) {
        if (user.first_name) {
            return user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name;
        }
    }

    // Default: DISPLAY_NAME_PREFERRED (0) - show preferred name (or first name) + last name
    const displayName = user.preferred_name || user.first_name;
    if (displayName) {
        return user.last_name ? `${displayName} ${user.last_name}` : displayName;
    }

    // Final fallback chain
    return user.username || "User";
};

/**
 * Get display name with last name appended
 */
export const getDisplayNameWithLast = (user: DisplayNameUser | null | undefined): string => {
    if (!user) return "User";

    const displayName = getDisplayName(user);

    // If already includes last name or last name is not available, return as is
    if (!user.last_name || displayName.includes(user.last_name)) {
        return displayName;
    }

    return `${displayName} ${user.last_name}`;
};

/**
 * Get preferred name or first name without last name (for hover tooltips)
 * Priority: preferred_name → first_name → username → "User"
 */
export const getPreferredOrFirstName = (user: DisplayNameUser | null | undefined): string => {
    if (!user) return "User";

    return user.preferred_name || user.first_name || user.username || "User";
};
