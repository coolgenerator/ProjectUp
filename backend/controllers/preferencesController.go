package controllers

import (
	"net/http"
	"projectup/models"
	"projectup/services"

	"github.com/gin-gonic/gin"
)

// GetAllPreferences retrieves all user preferences
// @Summary Get all user preferences
// @Description Gets all preferences for the authenticated user
// @Tags Preferences
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "User preferences"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 404 {object} map[string]interface{} "Preferences not found"
// @Router /preferences [get]
func GetAllPreferences() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authorized"})
			return
		}

		preferences, err := services.GetAllPreferences(userID.(uint))
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Preferences not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"preferences": preferences,
		})
	}
}

// UpdateAllPreferences updates multiple preferences at once
// @Summary Update multiple preferences
// @Description Updates multiple user preferences in a single request
// @Tags Preferences
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param preferences body map[string]interface{} true "Preferences to update"
// @Success 200 {object} map[string]interface{} "Success response"
// @Failure 400 {object} map[string]interface{} "Invalid request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /preferences [put]
func UpdateAllPreferences() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authorized"})
			return
		}

		var updates map[string]interface{}
		if err := c.ShouldBindJSON(&updates); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		if err := services.UpdateAllPreferences(userID.(uint), updates); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update preferences"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Preferences updated successfully",
		})
	}
}

// UpdateDisplayNamePreference updates the display name preference
// @Summary Update display name preference
// @Description Updates how the user's name is displayed (0=preferredName, 1=firstName, 2=username)
// @Tags Preferences
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param preference body map[string]int true "Display name preference (0-2)"
// @Success 200 {object} map[string]interface{} "Success response"
// @Failure 400 {object} map[string]interface{} "Invalid preference"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /preferences/display-name [put]
func UpdateDisplayNamePreferenceController() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authorized"})
			return
		}

		var req struct {
			Preference *int `json:"preference" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Preference is required"})
			return
		}

		if req.Preference == nil || *req.Preference < 0 || *req.Preference > 2 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid preference. Must be 0 (preferredName), 1 (firstName), or 2 (username)"})
			return
		}

		if err := services.UpdateDisplayNamePreferenceService(userID.(uint), *req.Preference); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update display name preference"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message":    "Display name preference updated successfully",
			"preference": *req.Preference,
		})
	}
}

// UpdateLanguagePreference updates the language preference
// @Summary Update language preference
// @Description Updates the user's language preference (e.g., "en", "zh")
// @Tags Preferences
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param language body map[string]string true "Language code (ISO 639-1)"
// @Success 200 {object} map[string]interface{} "Success response"
// @Failure 400 {object} map[string]interface{} "Invalid language code"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /preferences/language [put]
func UpdateLanguagePreferenceController() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authorized"})
			return
		}

		var req struct {
			Language string `json:"language" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Language is required"})
			return
		}

		// Validate language code (basic validation)
		if len(req.Language) < 2 || len(req.Language) > 10 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid language code"})
			return
		}

		if err := services.UpdateLanguagePreferenceService(userID.(uint), req.Language); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update language preference"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message":  "Language preference updated successfully",
			"language": req.Language,
		})
	}
}

// UpdateNotificationPreferences updates notification preferences
// @Summary Update notification preferences
// @Description Updates all notification-related preferences
// @Tags Preferences
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param notifications body map[string]bool true "Notification preferences"
// @Success 200 {object} map[string]interface{} "Success response"
// @Failure 400 {object} map[string]interface{} "Invalid request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /preferences/notifications [put]
func UpdateNotificationPreferencesController() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authorized"})
			return
		}

		var req struct {
			InAppNotifications   *bool `json:"in_app_notifications"`
			EmailNotifications   *bool `json:"email_notifications"`
			PushNotifications    *bool `json:"push_notifications"`
			ProjectUpdates       *bool `json:"project_updates"`
			CommentNotifications *bool `json:"comment_notifications"`
			MessageNotifications *bool `json:"message_notifications"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		updates := make(map[string]interface{})
		if req.InAppNotifications != nil {
			updates["in_app_notifications"] = *req.InAppNotifications
		}
		if req.EmailNotifications != nil {
			updates["email_notifications"] = *req.EmailNotifications
		}
		if req.PushNotifications != nil {
			updates["push_notifications"] = *req.PushNotifications
		}
		if req.ProjectUpdates != nil {
			updates["project_updates"] = *req.ProjectUpdates
		}
		if req.CommentNotifications != nil {
			updates["comment_notifications"] = *req.CommentNotifications
		}
		if req.MessageNotifications != nil {
			updates["message_notifications"] = *req.MessageNotifications
		}

		if err := services.UpdateNotificationPreferencesService(userID.(uint), updates); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update notification preferences"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Notification preferences updated successfully",
		})
	}
}

// UpdatePrivacyPreferences updates privacy preferences
// @Summary Update privacy preferences
// @Description Updates privacy-related preferences including visibility
// @Tags Preferences
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param privacy body map[string]interface{} true "Privacy preferences"
// @Success 200 {object} map[string]interface{} "Success response"
// @Failure 400 {object} map[string]interface{} "Invalid request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /preferences/privacy [put]
func UpdatePrivacyPreferencesController() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authorized"})
			return
		}

		var req struct {
			ProfileVisibility    *int  `json:"profile_visibility"`
			ShowEmail            *bool `json:"show_email"`
			ShowPhone            *bool `json:"show_phone"`
			AllowContactRequests *bool `json:"allow_contact_requests"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		updates := make(map[string]interface{})

		if req.ProfileVisibility != nil {
			if *req.ProfileVisibility < 0 || *req.ProfileVisibility > 2 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid profile visibility. Must be 0 (public), 1 (private), or 2 (friends only)"})
				return
			}
			updates["profile_visibility"] = *req.ProfileVisibility
		}
		if req.ShowEmail != nil {
			updates["show_email"] = *req.ShowEmail
		}
		if req.ShowPhone != nil {
			updates["show_phone"] = *req.ShowPhone
		}
		if req.AllowContactRequests != nil {
			updates["allow_contact_requests"] = *req.AllowContactRequests
		}

		if err := services.UpdatePrivacyPreferencesService(userID.(uint), updates); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update privacy preferences"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Privacy preferences updated successfully",
		})
	}
}

// UpdateThemePreference updates the theme preference
// @Summary Update theme preference
// @Description Updates the user's theme preference (light, dark, auto)
// @Tags Preferences
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param theme body map[string]string true "Theme preference"
// @Success 200 {object} map[string]interface{} "Success response"
// @Failure 400 {object} map[string]interface{} "Invalid theme"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /preferences/theme [put]
func UpdateThemePreferenceController() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authorized"})
			return
		}

		var req struct {
			Theme string `json:"theme" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Theme is required"})
			return
		}

		// Validate theme
		validThemes := map[string]bool{
			models.ThemeLight: true,
			models.ThemeDark:  true,
			models.ThemeAuto:  true,
		}
		if !validThemes[req.Theme] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid theme. Must be 'light', 'dark', or 'auto'"})
			return
		}

		if err := services.UpdateThemePreferenceService(userID.(uint), req.Theme); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update theme preference"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Theme preference updated successfully",
			"theme":   req.Theme,
		})
	}
}
