package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"projectup/helper"
	"projectup/models"
	"projectup/repositories"
	"projectup/services"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// GetProfile retrieves a user profile by SID
// @Summary Get user profile
// @Description Retrieves a user profile based on the provided SID
// @Tags Users
// @Accept json
// @Produce json
// @Param sid query string true "User SID"
// @Success 200 {object} map[string]interface{} "Success response with user profile"
// @Failure 400 {object} map[string]interface{} "Bad request (missing sid)"
// @Failure 403 {object} map[string]interface{} "Forbidden (profile is private or friends-only)"
// @Failure 404 {object} map[string]interface{} "User not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /profile [get]
func GetProfile() gin.HandlerFunc {
	return func(c *gin.Context) {
		uid := c.Query("sid")
		if uid == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "sid parameter is required"})
			return
		}

		// Get the requesting user's ID (if authenticated)
		var requestingUserID uint = 0
		if userID, exists := c.Get("userID"); exists {
			requestingUserID = userID.(uint)
		}

		profile, err := services.GetProfileService(uid, requestingUserID)
		if err != nil {
			if err.Error() == "user not found" {
				c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			} else if strings.Contains(err.Error(), "reserved route name") {
				// Handle reserved route names specially
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "reserved_route": true})
			} else if strings.Contains(err.Error(), "profile is private") || strings.Contains(err.Error(), "only visible to friends") || strings.Contains(err.Error(), "must be logged in") {
				// Handle privacy restrictions
				c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
			}
			return
		}

		// Return profile directly to be consistent with other profile endpoints
		c.JSON(http.StatusOK, profile)
	}
}

// GetProfileById retrieves a user profile by ID
// @Summary Get user profile by ID
// @Description Retrieves a user's public profile details
// @Tags Users
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "Success response with profile details"
// @Failure 404 {object} map[string]interface{} "User not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /get-profile [get]
func GetProfileById() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authorized"})
			return
		}

		// Get profile data using the service layer
		profile, err := services.GetUserProfile(userID.(uint))
		if err != nil {
			if err.Error() == "user not found" {
				c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve profile"})
			}
			return
		}

		c.JSON(http.StatusOK, gin.H{"status": "success", "user": profile})
	}
}

// MyProfile retrieves the authenticated user's profile
// @Summary Get my profile
// @Description Retrieves the profile of the authenticated user
// @Tags Users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Success response with user profile"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 404 {object} map[string]interface{} "User not found"
// @Router /my-profile [get]
func MyProfile() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization token is required"})
			return
		}

		tokenString := authHeader[len("Bearer "):]
		profile, err := services.MyProfileService(tokenString)
		if err != nil {
			if err.Error() == "user not found" {
				c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			} else {
				c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			}
			return
		}

		// Check if username exists and add a flag to indicate if it can be changed
		canChangeUsername := profile.Username == nil || *profile.Username == ""

		c.JSON(http.StatusOK, gin.H{
			"status":            "success",
			"user":              profile,
			"canChangeUsername": canChangeUsername,
		})
	}
}

func stringPtr(s string) *string {
	return &s
}

// UpdateProfile updates the authenticated user's profile
// @Summary Update profile
// @Description Updates the profile details of the authenticated user
// @Tags Users
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Param first_name formData string false "First Name"
// @Param last_name formData string false "Last Name"
// @Param username formData string false "Username"
// @Param website formData string false "Website URL"
// @Param email formData string false "User Email"
// @Param school_email formData string false "School Email"
// @Param biography formData string false "Biography"
// @Param state formData string false "State"
// @Param city formData string false "City"
// @Param country formData string false "Country"
// @Param zipcode formData string false "ZIP Code"
// @Success 200 {object} map[string]interface{} "Profile updated successfully"
// @Failure 400 {object} map[string]interface{} "Invalid input format"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Failed to update profile"
// @Router /profile [put]
func UpdateProfile() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authorized"})
			return
		}

		// Get the current user to check if username can be changed
		currentUser, err := repositories.GetUserByID(userID.(uint))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user data"})
			return
		}

		// Check if username is already set
		usernameExists := currentUser.Username != nil && *currentUser.Username != ""

		// Parse the multipart form
		form, err := c.MultipartForm()
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse multipart form"})
			return
		}

		// Extract form fields - separate user and profile data
		user := models.User{
			Email: helper.OptionalString(form.Value, "email"),
		}

		// Only update username if it doesn't already exist
		if !usernameExists {
			user.Username = helper.OptionalString(form.Value, "username")
		}

		profile := models.Profile{
			FirstName:           helper.OptionalString(form.Value, "first_name"),
			LastName:            helper.OptionalString(form.Value, "last_name"),
			PreferredName:       helper.OptionalString(form.Value, "prefer_name"),
			Website:             helper.OptionalString(form.Value, "website"),
			Field:               helper.OptionalString(form.Value, "field"),
			SchoolEmail:         helper.OptionalString(form.Value, "school_email"),
			SchoolEmailVerified: form.Value["school_email_verified"] != nil && form.Value["school_email_verified"][0] == "true",
			School:              helper.OptionalString(form.Value, "school"),
			Biography:           helper.OptionalString(form.Value, "biography"),
			State:               helper.OptionalString(form.Value, "state"),
			City:                helper.OptionalString(form.Value, "city"),
			ZipCode:             helper.OptionalString(form.Value, "zipcode"),
			Country:             helper.OptionalString(form.Value, "country"),
		}

		// Process language field - accept any language string (comma-separated for multiple languages)
		if language, ok := form.Value["language"]; ok && len(language) > 0 {
			// Always set the language field, even if empty (to clear it if needed)
			profile.Language = language[0]
		}

		// Process avatar (handle both file uploads and string-based avatars)
		if err := helper.ProcessAvatar(c, &profile); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Parse skills and interests
		var skills, interests []interface{}
		var skillsProvided, interestsProvided bool

		// Parse skills (JSON strings or array of strings)
		if skillsJSON, ok := form.Value["skills"]; ok && len(skillsJSON) > 0 {
			skillsProvided = true
			if skillsJSON[0] != "" {
				// Try to parse as JSON array
				if err := json.Unmarshal([]byte(skillsJSON[0]), &skills); err != nil {
					// If JSON parsing fails, check if it's a comma-separated list
					skillsStr := parseCommaSeparatedList(skillsJSON[0])
					// Only error if it's not a valid format and not an empty array
					if len(skillsStr) == 0 && skillsJSON[0] != "[]" {
						c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid skills format"})
						return
					}
					// Convert string slice to interface slice
					skills = make([]interface{}, len(skillsStr))
					for i, s := range skillsStr {
						skills[i] = s
					}
				}
			}
		}

		// Parse interests (JSON strings or array of strings)
		if interestsJSON, ok := form.Value["interests"]; ok && len(interestsJSON) > 0 {
			interestsProvided = true
			if interestsJSON[0] != "" {
				// Try to parse as JSON array
				if err := json.Unmarshal([]byte(interestsJSON[0]), &interests); err != nil {
					// If JSON parsing fails, check if it's a comma-separated list
					interestsStr := parseCommaSeparatedList(interestsJSON[0])
					// Only error if it's not a valid format and not an empty array
					if len(interestsStr) == 0 && interestsJSON[0] != "[]" {
						c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid interests format"})
						return
					}
					// Convert string slice to interface slice
					interests = make([]interface{}, len(interestsStr))
					for i, s := range interestsStr {
						interests[i] = s
					}
				}
			}
		}

		// Extract skill data (with levels) from the parsed data
		var skillsData []models.SkillData
		for _, skill := range skills {
			if skillObj, ok := skill.(map[string]interface{}); ok {
				skillItem := models.SkillData{Level: 3} // Default level
				if name, ok := skillObj["name"].(string); ok {
					skillItem.Name = name
				}
				// Try to get level as float64 (JSON numbers are float64)
				if level, ok := skillObj["level"].(float64); ok {
					skillItem.Level = int(level)
				}
				if skillItem.Name != "" {
					skillsData = append(skillsData, skillItem)
				}
			} else if name, ok := skill.(string); ok {
				// Backward compatibility: if just a string, use default level
				skillsData = append(skillsData, models.SkillData{Name: name, Level: 3})
			}
		}

		// Extract interest data (with levels) from the parsed data
		var interestsData []models.InterestData
		for _, interest := range interests {
			if interestObj, ok := interest.(map[string]interface{}); ok {
				interestItem := models.InterestData{Level: 3} // Default level
				if name, ok := interestObj["name"].(string); ok {
					interestItem.Name = name
				}
				// Try to get level as float64 (JSON numbers are float64)
				if level, ok := interestObj["level"].(float64); ok {
					interestItem.Level = int(level)
				}
				if interestItem.Name != "" {
					interestsData = append(interestsData, interestItem)
				}
			} else if name, ok := interest.(string); ok {
				// Backward compatibility: if just a string, use default level
				interestsData = append(interestsData, models.InterestData{Name: name, Level: 3})
			}
		}

		// Use the flags we set earlier when parsing the form data

		// Construct the input for the service layer
		input := services.UserUpdateInput{
			UserID:          userID.(uint),
			SkillsData:      skillsData,
			InterestsData:   interestsData,
			UpdateSkills:    skillsProvided,    // Update skills if field was sent
			UpdateInterests: interestsProvided, // Update interests if field was sent
			User:            &user,
			Profile:         &profile,
		}

		// Call the service layer to update the profile
		if err := services.UpdateProfileService(input); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to update profile: %v", err)})
			return
		}

		// Get the updated profile to return to the client
		updatedProfile, err := services.GetUserProfile(userID.(uint))
		if err != nil {
			c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Profile updated successfully", "warning": "Failed to retrieve updated profile"})
			return
		}

		// Check if this is a new profile or an update
		isNewProfile := false
		if profile.ShortID == "" {
			isNewProfile = true
		}

		// Respond with success and the updated profile
		if isNewProfile {
			c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Profile created successfully", "profile": updatedProfile})
		} else {
			c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Profile updated successfully", "profile": updatedProfile})
		}
	}
}

// parseCommaSeparatedList parses a comma-separated string into a slice of strings
func parseCommaSeparatedList(input string) []string {
	// Split by comma and trim whitespace
	parts := strings.Split(input, ",")
	result := make([]string, 0, len(parts))

	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}

	return result
}

func GetUserProfile() gin.HandlerFunc {
	return func(c *gin.Context) {
		// First try to get the user_id from the query parameters
		userIDParam := c.Query("user_id")
		var targetUserID uint

		if userIDParam != "" {
			// Convert the string ID to uint
			parsedID, err := strconv.ParseUint(userIDParam, 10, 64)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user_id parameter"})
				return
			}
			targetUserID = uint(parsedID)
		} else {
			// Fall back to the authenticated user if no user_id provided
			authUserID, exists := c.Get("userID")
			if !exists {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authorized"})
				return
			}
			targetUserID = authUserID.(uint)
		}

		// Use userID in your service/repository
		profile, err := services.GetUserProfile(targetUserID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, profile)
	}
}

func UpdateSkills() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authorized"})
			return
		}

		var req struct {
			Skills []string `json:"skills" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if err := services.UpdateUserSkills(userID.(uint), req.Skills); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update skills"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Skills updated successfully"})
	}
}

func UpdateInterests() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authorized"})
			return
		}

		var req struct {
			Interests []string `json:"interests" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if err := services.UpdateUserInterests(userID.(uint), req.Interests); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update interests"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Interests updated successfully"})
	}
}
