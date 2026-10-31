package repositories

import (
	"projectup/database"
	"projectup/models"
)

// GetUserPreferences retrieves user preferences by user ID
func GetUserPreferences(userID uint) (*models.UserPreferences, error) {
	var preferences models.UserPreferences
	err := database.DB.Where("user_id = ?", userID).First(&preferences).Error
	if err != nil {
		return nil, err
	}
	return &preferences, nil
}

// CreateUserPreferences creates default preferences for a new user
func CreateUserPreferences(userID uint) error {
	preferences := models.UserPreferences{
		UserID:                userID,
		DisplayNamePreference: models.DisplayNamePreferred, // 0 = preferred name
		Language:              "en",                        // Default to English

		// Notifications
		InAppNotifications:   true,
		EmailNotifications:   true,
		PushNotifications:    true,
		ProjectUpdates:       true,
		CommentNotifications: true,
		MessageNotifications: true,

		// Privacy
		ProfileVisibility:    models.ProfileVisibilityPublic, // 0 = public
		ShowEmail:            false,
		ShowPhone:            false,
		AllowContactRequests: true,

		// UI/Appearance
		Theme: models.ThemeLight, // "light"

		// TEMPORARILY DISABLED
		// AutoCloseModals:     true,
		// ModalAnimations:     true,
		// AutoRefresh:         true,
		// ConfirmBeforeAction: true,
		// LoadAnimations:      true,
		// PrefetchData:        true,
	}
	return database.DB.Create(&preferences).Error
}

// UpdateUserPreferences updates user preferences
func UpdateUserPreferences(userID uint, updates map[string]interface{}) error {
	return database.DB.Model(&models.UserPreferences{}).
		Where("user_id = ?", userID).
		Updates(updates).Error
}

// UpdateDisplayNamePreferenceNew updates the display name preference in preferences table
func UpdateDisplayNamePreferenceNew(userID uint, preference int) error {
	return database.DB.Model(&models.UserPreferences{}).
		Where("user_id = ?", userID).
		Update("display_name_preference", preference).Error
}

// UpdateLanguagePreferenceNew updates the language preference in preferences table
func UpdateLanguagePreferenceNew(userID uint, language string) error {
	return database.DB.Model(&models.UserPreferences{}).
		Where("user_id = ?", userID).
		Update("language", language).Error
}
