package services

import (
	"projectup/models"
	"projectup/repositories"
)

// GetAllPreferences retrieves all user preferences
func GetAllPreferences(userID uint) (*models.UserPreferences, error) {
	return repositories.GetUserPreferences(userID)
}

// UpdateAllPreferences updates multiple user preferences at once
func UpdateAllPreferences(userID uint, updates map[string]interface{}) error {
	return repositories.UpdateUserPreferences(userID, updates)
}

// UpdateDisplayNamePreferenceService updates the display name preference
func UpdateDisplayNamePreferenceService(userID uint, preference int) error {
	return repositories.UpdateDisplayNamePreferenceNew(userID, preference)
}

// UpdateLanguagePreferenceService updates the language preference
func UpdateLanguagePreferenceService(userID uint, language string) error {
	return repositories.UpdateLanguagePreferenceNew(userID, language)
}

// UpdateNotificationPreferencesService updates notification preferences
func UpdateNotificationPreferencesService(userID uint, updates map[string]interface{}) error {
	return repositories.UpdateUserPreferences(userID, updates)
}

// UpdatePrivacyPreferencesService updates privacy preferences
func UpdatePrivacyPreferencesService(userID uint, updates map[string]interface{}) error {
	return repositories.UpdateUserPreferences(userID, updates)
}

// UpdateThemePreferenceService updates the theme preference
func UpdateThemePreferenceService(userID uint, theme string) error {
	updates := map[string]interface{}{
		"theme": theme,
	}
	return repositories.UpdateUserPreferences(userID, updates)
}

// CreateDefaultPreferences creates default preferences for a new user
func CreateDefaultPreferences(userID uint) error {
	return repositories.CreateUserPreferences(userID)
}
