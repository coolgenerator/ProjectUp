/**
 * Profile visibility constants (matching backend)
 */

export const PROFILE_VISIBILITY_PUBLIC = 0;       // Profile visible to everyone
export const PROFILE_VISIBILITY_PRIVATE = 1;      // Profile visible only to user
export const PROFILE_VISIBILITY_FRIENDS_ONLY = 2; // Profile visible to friends only

/**
 * Get human-readable label for profile visibility
 */
export const getVisibilityLabel = (visibility: number): string => {
    switch (visibility) {
        case PROFILE_VISIBILITY_PUBLIC:
            return 'Public';
        case PROFILE_VISIBILITY_PRIVATE:
            return 'Private';
        case PROFILE_VISIBILITY_FRIENDS_ONLY:
            return 'Friends Only';
        default:
            return 'Public';
    }
};

/**
 * Check if a profile is visible to a viewer
 * @param profileVisibility The profile's visibility setting (0, 1, or 2)
 * @param isOwner Whether the viewer is the profile owner
 * @param isFriend Whether the viewer is a friend (if implemented)
 */
export const isProfileVisible = (
    profileVisibility: number,
    isOwner: boolean,
    isFriend: boolean = false
): boolean => {
    // Owner can always see their own profile
    if (isOwner) return true;

    // Check visibility level
    switch (profileVisibility) {
        case PROFILE_VISIBILITY_PUBLIC:
            return true;
        case PROFILE_VISIBILITY_PRIVATE:
            return false;
        case PROFILE_VISIBILITY_FRIENDS_ONLY:
            return isFriend;
        default:
            return true; // Default to public if unknown
    }
};
