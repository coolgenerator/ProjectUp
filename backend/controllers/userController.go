package controllers

import (
	"errors"
	"net/http"
	"projectup/config"
	"projectup/database"
	"projectup/helper"
	"projectup/middleware"
	"projectup/models"
	"projectup/services"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func GetUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		userId := c.Param("user_id")
		if err := helper.MatchUserTypeToUid(c, userId); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Try to get from cache first
		cache := middleware.GetCacheService(c)
		var user models.User
		
		if cache != nil {
			// Convert userId to uint
			userIDUint, _ := strconv.ParseUint(userId, 10, 32)
			cacheKey := services.UserCacheKey(uint(userIDUint))
			
			// Try to get from cache
			if err := cache.Get(cacheKey, &user); err == nil {
				c.JSON(http.StatusOK, user)
				return
			}
		}

		// If not in cache or cache is disabled, get from database
		err := database.DB.Where("user_id = ?", userId).First(&user).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
			}
			return
		}

		// Store in cache if available
		if cache != nil {
			redisConfig := config.LoadRedisConfig()
			userIDUint, _ := strconv.ParseUint(userId, 10, 32)
			cacheKey := services.UserCacheKey(uint(userIDUint))
			cache.Set(cacheKey, user, redisConfig.UserCacheExpiration)
		}

		c.JSON(http.StatusOK, user)
	}
}

func GetUsers() gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := helper.CheckUserType(c, "ADMIN"); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		recordPerPage, err := strconv.Atoi(c.Query("recordPerPage"))
		if err != nil || recordPerPage < 1 {
			recordPerPage = 10
		}

		page, err1 := strconv.Atoi(c.Query("page"))
		if err1 != nil || page < 1 {
			page = 1
		}

		startIndex := (page - 1) * recordPerPage

		if customStartIndex, err := strconv.Atoi(c.Query("startIndex")); err == nil {
			startIndex = customStartIndex
		}

		var users []models.User

		filter := c.Query("filter")
		query := database.DB.Model(&models.User{})

		if filter != "" {
			query = query.Where("user_type = ?", filter) // Adjust filter logic based on requirements
		}

		groupBy := c.Query("groupBy") // Example: Fetch group field from query params
		if groupBy != "" {
			query = query.Select(groupBy + ", COUNT(*) AS count").Group(groupBy)
		}

		query = query.Offset(startIndex).Limit(recordPerPage)

		if err := query.Find(&users).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve users"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"page":          page,
			"recordPerPage": recordPerPage,
			"users":         users,
		})
	}
}

func CheckUsernameAvailability() gin.HandlerFunc {
	return func(c *gin.Context) {
		username := c.Query("username")

		if username == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Username parameter is required"})
			return
		}

		var count int64
		if err := database.DB.Model(&models.User{}).Where("username = ?", username).Count(&count).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check username"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"exists": count > 0,
		})
	}
}

// UpdateUsername updates the user's username
//
//	@Summary		Update username
//	@Description	Updates the authenticated user's username
//	@Tags			User
//	@Accept			json
//	@Produce		json
//	@Param			request	body		object{username=string}	true	"New username"
//	@Success		200	{object}	map[string]interface{}	"Username updated successfully"
//	@Failure		400	{object}	map[string]interface{}	"Invalid request or username already taken"
//	@Failure		401	{object}	map[string]interface{}	"Unauthorized"
//	@Failure		500	{object}	map[string]interface{}	"Internal server error"
//	@Router			/update-username [post]
func UpdateUsername() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get user ID from context (set by authentication middleware)
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		// Parse request body
		var request struct {
			Username string `json:"username" binding:"required"`
		}

		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		username := request.Username

		// Validate username format (alphanumeric and underscores only, min 3 chars)
		if len(username) < 3 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Username must be at least 3 characters long"})
			return
		}

		// Check if username already exists
		var count int64
		if err := database.DB.Model(&models.User{}).Where("username = ? AND id != ?", username, userID).Count(&count).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check username availability"})
			return
		}

		if count > 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Username is already taken"})
			return
		}

		// Update username
		if err := database.DB.Model(&models.User{}).Where("id = ?", userID).Update("username", username).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update username"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message":  "Username updated successfully",
			"username": username,
		})
	}
}

// SearchUsersByUsername handles searching for users by username or email
//
//	@Summary		Search users by username or email
//	@Description	Searches for users by username or email and returns user profiles
//	@Tags			User
//	@Produce		json
//	@Param			query	query		string	true	"Username or email to search for"
//	@Success		200	{object}	map[string]interface{}	"List of matching users"
//	@Failure		400	{object}	map[string]interface{}	"Invalid request"
//	@Failure		401	{object}	map[string]interface{}	"Unauthorized"
//	@Failure		500	{object}	map[string]interface{}	"Internal server error"
//	@Router			/user/search [get]
func SearchUsersByUsername() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get current user ID for filtering out from results
		currentUserID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		// Get query parameter (can be username or email)
		query := c.Query("query")
		if query == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Query parameter is required"})
			return
		}

		// Query users with matching username or email (case insensitive)
		var users []models.User
		searchPattern := "%" + query + "%"
		if err := database.DB.Where("(username LIKE ? OR email LIKE ?) AND id != ?", searchPattern, searchPattern, currentUserID).Limit(10).Find(&users).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search users"})
			return
		}

		// If no users found
		if len(users) == 0 {
			c.JSON(http.StatusOK, gin.H{"users": []models.User{}})
			return
		}

		// Get user profiles for the found users
		var userIDs []uint
		for _, user := range users {
			userIDs = append(userIDs, user.ID)
		}

		var profiles []models.Profile
		if err := database.DB.Where("user_id IN (?)", userIDs).Find(&profiles).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user profiles"})
			return
		}

		// Create a map of user ID to profile for easier lookup
		profileMap := make(map[uint]models.Profile)
		for _, profile := range profiles {
			profileMap[profile.UserID] = profile
		}

		// Create response with user data and profile info
		type UserResponse struct {
			ID            uint    `json:"id"`
			Username      string  `json:"username"`
			Email         *string `json:"email"`
			PreferredName *string `json:"preferred_name"`
			LastName      *string `json:"last_name"`
			AvatarURL     *string `json:"avatar_url"`
			Field         *string `json:"field"`
			School        *string `json:"school"`
		}

		var response []UserResponse
		for _, user := range users {
			profile, hasProfile := profileMap[user.ID]

			// Safely handle nil username
			username := ""
			if user.Username != nil {
				username = *user.Username
			}

			userResp := UserResponse{
				ID:       user.ID,
				Username: username,
				Email:    user.Email,
			}

			// Add profile data if available
			if hasProfile {
				userResp.PreferredName = profile.FirstName // Using FirstName as PreferredName
				userResp.LastName = profile.LastName
				userResp.AvatarURL = profile.AvatarURL
				userResp.Field = profile.Field
				userResp.School = profile.School
			}

			response = append(response, userResp)
		}

		c.JSON(http.StatusOK, gin.H{"users": response})
	}
}

// GetUserBasicInfo returns basic public info about a user (for multi-user chat attribution)
// This endpoint returns minimal user data: id, username, first name, last name, avatar
// Used by frontend to display user information in multi-user contexts
func GetUserBasicInfo() gin.HandlerFunc {
	return func(c *gin.Context) {
		userIdStr := c.Param("id")

		// Convert to uint
		userId, err := strconv.ParseUint(userIdStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
			return
		}

		// Try cache first
		cache := middleware.GetCacheService(c)
		type BasicUserInfo struct {
			ID        uint   `json:"id"`
			Username  string `json:"username"`
			FirstName string `json:"firstName"`
			LastName  string `json:"lastName"`
			Avatar    string `json:"avatar"`
		}
		var userInfo BasicUserInfo

		cacheKey := "user:basic:" + userIdStr
		if cache != nil {
			if err := cache.Get(cacheKey, &userInfo); err == nil {
				c.JSON(http.StatusOK, userInfo)
				return
			}
		}

		// Fetch from database
		var user models.User
		if err := database.DB.Where("user_id = ?", userId).First(&user).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
			}
			return
		}

		// Get profile data for avatar and name
		var profile models.Profile
		hasProfile := database.DB.Where("user_id = ?", userId).First(&profile).Error == nil

		// Build response
		userInfo = BasicUserInfo{
			ID:       uint(userId),
			Username: derefString(user.Username),
		}

		if hasProfile {
			userInfo.FirstName = derefString(profile.FirstName)
			userInfo.LastName = derefString(profile.LastName)
			userInfo.Avatar = derefString(profile.AvatarURL)
		}

		// Cache the result (5 minutes)
		if cache != nil {
			cache.Set(cacheKey, userInfo, 300) // 5 minutes
		}

		c.JSON(http.StatusOK, userInfo)
	}
}

// derefString safely dereferences a *string pointer, returning empty string if nil
func derefString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
