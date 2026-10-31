package controllers

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"projectup/database"
	"projectup/models"
	"sort"
	"strconv"

	"github.com/gin-gonic/gin"
)

// GetCommentsGeneric retrieves comments for any entity type
// @Summary Get comments for an entity
// @Description Retrieves comments for any entity type with pagination
// @Tags Comments
// @Accept json
// @Produce json
// @Param entity_type query int true "Entity type (1=project, 2=general, 3=partner)"
// @Param entity_id query int true "Entity ID"
// @Param page query int false "Page number (default: 1)"
// @Param limit query int false "Items per page (default: 10)"
// @Success 200 {object} map[string]interface{} "Comments retrieved successfully"
// @Failure 400 {object} map[string]interface{} "Invalid input parameters"
// @Failure 500 {object} map[string]interface{} "Failed to fetch comments"
// @Router /comments [get]
func GetCommentsGeneric(c *gin.Context) {
	entityTypeStr := c.Query("entity_type")
	entityIDStr := c.Query("entity_id")
	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "10")

	// Log incoming request for debugging
	fmt.Printf("Getting comments for entity_type=%s, entity_id=%s, page=%s, limit=%s\n",
		entityTypeStr, entityIDStr, pageStr, limitStr)

	// Parse parameters
	entityType, err := strconv.Atoi(entityTypeStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid entity type", "details": err.Error()})
		return
	}

	entityID, err := strconv.ParseUint(entityIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid entity ID", "details": err.Error()})
		return
	}

	page, _ := strconv.Atoi(pageStr)
	limit, _ := strconv.Atoi(limitStr)
	offset := (page - 1) * limit

	// Get top-level comments (no parent)
	var comments []struct {
		models.GenericComment
		Username              *string `json:"username"`
		FirstName             *string `json:"first_name"`
		LastName              *string `json:"last_name"`
		PreferredName         *string `json:"preferred_name"`
		DisplayNamePreference *int    `json:"display_name_preference"`
		AvatarURL             *string `json:"avatar_url"`
	}

	db := database.DB.Model(&models.GenericComment{}).
		Where("entity_type = ? AND entity_id = ? AND parent_id IS NULL", entityType, entityID).
		Joins("JOIN users ON users.id = comments.user_id").
		Joins("LEFT JOIN profiles ON profiles.user_id = users.id").
		Joins("LEFT JOIN user_preferences ON user_preferences.user_id = users.id").
		Select("comments.*, users.username, profiles.first_name, profiles.last_name, profiles.preferred_name, profiles.avatar_url, user_preferences.display_name_preference").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit)

	if err := db.Find(&comments).Error; err != nil {
		fmt.Printf("Error fetching comments: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch comments",
			"details": err.Error(),
		})
		return
	}

	// For each top-level comment, get its replies
	var commentResponses []models.CommentResponse
	for _, comment := range comments {
		// Convert to response format
		commentResponse := models.CommentResponse{
			ID:                    comment.ID,
			EntityType:            comment.EntityType,
			EntityID:              comment.EntityID,
			UserID:                comment.UserID,
			Username:              stringValue(comment.Username),
			FirstName:             stringValue(comment.FirstName),
			LastName:              stringValue(comment.LastName),
			PreferredName:         stringValue(comment.PreferredName),
			DisplayNamePreference: comment.DisplayNamePreference,
			AvatarURL:             stringValue(comment.AvatarURL),
			ParentID:              comment.ParentID,
			Content:               comment.Content,
			Level:                 comment.Level,
			LikesCount:            comment.LikesCount,
			RepliesCount:          comment.RepliesCount,
			CreatedAt:             comment.CreatedAt,
			Replies:               []models.CommentResponse{},
		}

		// Only fetch replies if there are any
		if comment.RepliesCount > 0 {
			// Get all direct replies
			fetchRepliesRecursively(entityType, uint(entityID), comment.ID, &commentResponse.Replies)
		}

		commentResponses = append(commentResponses, commentResponse)
	}

	// Count total comments for pagination
	var totalCount int64
	if err := database.DB.Model(&models.GenericComment{}).
		Where("entity_type = ? AND entity_id = ? AND parent_id IS NULL", entityType, entityID).
		Count(&totalCount).Error; err != nil {
		fmt.Printf("Error counting comments: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to count comments",
			"details": err.Error(),
		})
		return
	}

	// Using a consistent response format with a 'comments' field
	response := gin.H{
		"comments": commentResponses,
		"has_more": (offset + limit) < int(totalCount),
		"total":    totalCount,
		"page":     page,
		"limit":    limit,
	}

	// Log the response shape (not the full content)
	fmt.Printf("Returning comments response: %d comments, has_more=%v, total=%d\n",
		len(commentResponses), (offset+limit) < int(totalCount), totalCount)

	c.JSON(http.StatusOK, response)
}

// AddCommentGeneric adds a comment to any entity type
// @Summary Add a comment
// @Description Adds a new comment to any entity
// @Tags Comments
// @Accept json
// @Produce json
// @Param comment body object true "Comment data"
// @Success 201 {object} models.CommentResponse "Comment created successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request body"
// @Failure 401 {object} map[string]interface{} "User not authorized"
// @Failure 500 {object} map[string]interface{} "Failed to add comment"
// @Router /comments [post]
func AddCommentGeneric(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authorized"})
		return
	}

	// Log the raw request body
	body, _ := c.GetRawData()
	fmt.Printf("Raw request body: %s\n", string(body))

	// Restore the request body for binding
	c.Request.Body = io.NopCloser(bytes.NewBuffer(body))

	var input struct {
		EntityType int    `json:"entity_type"`
		EntityID   uint   `json:"entity_id" binding:"required"`
		ParentID   *uint  `json:"parent_id"`
		Content    string `json:"content" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		fmt.Printf("Binding error: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input", "details": err.Error()})
		return
	}

	// Log the parsed input
	fmt.Printf("Parsed input: %+v\n", input)

	// Log incoming comment for debugging
	fmt.Printf("Adding comment for entity_type=%d, entity_id=%d, parent_id=%v, user_id=%d\n",
		input.EntityType, input.EntityID, input.ParentID, userID)

	// Calculate the level
	level := 0
	if input.ParentID != nil {
		// Find parent comment to determine this comment's level
		var parentComment models.GenericComment
		if err := database.DB.First(&parentComment, *input.ParentID).Error; err != nil {
			fmt.Printf("Error finding parent comment: %v\n", err)
			// Default to level 1 if parent not found
			level = 1
		} else {
			// Set level to parent's level + 1
			level = parentComment.Level + 1
			fmt.Printf("Parent comment level: %d, new comment level: %d\n", parentComment.Level, level)
		}
	}

	// Create the comment
	comment := models.GenericComment{
		EntityType: input.EntityType,
		EntityID:   input.EntityID,
		UserID:     userID.(uint),
		ParentID:   input.ParentID,
		Content:    input.Content,
		Level:      level,
	}

	// Start a transaction
	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Save the comment
	if err := tx.Create(&comment).Error; err != nil {
		tx.Rollback()
		fmt.Printf("Error creating comment: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to add comment",
			"details": err.Error(),
		})
		return
	}

	// If this is a reply, increment the parent's reply count
	if input.ParentID != nil {
		if err := tx.Model(&models.GenericComment{}).
			Where("id = ?", *input.ParentID).
			UpdateColumn("replies_count", tx.Raw("replies_count + 1")).
			Error; err != nil {
			tx.Rollback()
			fmt.Printf("Error updating parent reply count: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to update parent comment",
				"details": err.Error(),
			})
			return
		}
	}

	// Commit the transaction
	if err := tx.Commit().Error; err != nil {
		fmt.Printf("Error committing transaction: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to save comment",
			"details": err.Error(),
		})
		return
	}

	// Get the user info for the response
	var user models.User
	if err := database.DB.Select("id, username").First(&user, userID).Error; err != nil {
		// Continue even if user info can't be fetched, but log the error
		fmt.Printf("Error fetching user info for comment: %v\n", err)
		user.Username = nil
	}

	// Get the profile to get the avatar_url
	var profile models.Profile
	var avatarURL *string
	// Directly query the profiles table for avatar_url
	if err := database.DB.Where("user_id = ?", userID).Select("avatar_url").First(&profile).Error; err != nil {
		fmt.Printf("Error fetching avatar for user %d: %v\n", userID, err)
		// Default to empty avatar
		avatarURL = nil
	} else {
		avatarURL = profile.AvatarURL
	}

	// Create the response
	response := models.CommentResponse{
		ID:           comment.ID,
		EntityType:   comment.EntityType,
		EntityID:     comment.EntityID,
		UserID:       comment.UserID,
		Username:     stringValue(user.Username),
		AvatarURL:    stringValue(avatarURL),
		ParentID:     comment.ParentID,
		Content:      comment.Content,
		Level:        comment.Level,
		LikesCount:   0,
		RepliesCount: 0,
		CreatedAt:    comment.CreatedAt,
		Replies:      []models.CommentResponse{},
	}

	// If this is a reply to a reply, make sure to include the parent details
	if comment.ParentID != nil {
		var parentComment models.GenericComment
		var parentUser models.User
		var parentUsername *string

		if err := database.DB.First(&parentComment, *comment.ParentID).Error; err == nil {
			if err := database.DB.Select("id, username").First(&parentUser, parentComment.UserID).Error; err == nil {
				parentUsername = parentUser.Username

				// Add the parent information to the response
				fmt.Printf("Including parent info: parent_id=%d, parent_username=%s\n",
					*comment.ParentID, stringValue(parentUsername))
			}
		}
	}

	// Only fetch replies if there are any
	if comment.RepliesCount > 0 {
		// Get all direct replies
		fetchRepliesRecursively(comment.EntityType, comment.EntityID, comment.ID, &response.Replies)
	}

	// Return the comment response in the same format as GetCommentsGeneric
	// Wrap in a response object for consistency
	c.JSON(http.StatusCreated, gin.H{
		"comment": response,
		"success": true,
	})
}

// Helper function to recursively fetch replies
func fetchRepliesRecursively(entityType int, entityID uint, parentID uint, repliesSlice *[]models.CommentResponse) {
	// Create a flat list of all replies instead of nesting them
	var allReplies []struct {
		models.GenericComment
		Username              *string `json:"username"`
		FirstName             *string `json:"first_name"`
		LastName              *string `json:"last_name"`
		PreferredName         *string `json:"preferred_name"`
		DisplayNamePreference *int    `json:"display_name_preference"`
		AvatarURL             *string `json:"avatar_url"`
	}

	// First fetch direct replies to this comment
	directRepliesDb := database.DB.Model(&models.GenericComment{}).
		Where("entity_type = ? AND entity_id = ? AND parent_id = ?", entityType, entityID, parentID).
		Joins("JOIN users ON users.id = comments.user_id").
		Joins("LEFT JOIN profiles ON profiles.user_id = users.id").
		Joins("LEFT JOIN user_preferences ON user_preferences.user_id = users.id").
		Select("comments.*, users.username, profiles.first_name, profiles.last_name, profiles.preferred_name, profiles.avatar_url, user_preferences.display_name_preference").
		Order("created_at ASC")

	if err := directRepliesDb.Find(&allReplies).Error; err != nil {
		fmt.Printf("Error fetching direct replies for comment %d: %v\n", parentID, err)
		return
	}

	// Process each reply
	for _, reply := range allReplies {
		replyResponse := models.CommentResponse{
			ID:                    reply.ID,
			EntityType:            reply.EntityType,
			EntityID:              reply.EntityID,
			UserID:                reply.UserID,
			Username:              stringValue(reply.Username),
			FirstName:             stringValue(reply.FirstName),
			LastName:              stringValue(reply.LastName),
			PreferredName:         stringValue(reply.PreferredName),
			DisplayNamePreference: reply.DisplayNamePreference,
			AvatarURL:             stringValue(reply.AvatarURL),
			ParentID:              reply.ParentID,
			Content:               reply.Content,
			Level:                 reply.Level,
			LikesCount:            reply.LikesCount,
			RepliesCount:          reply.RepliesCount,
			CreatedAt:             reply.CreatedAt,
			// Explicitly set an empty replies array so it exists in the JSON
			Replies: []models.CommentResponse{},
		}

		// Add this reply to the parent's replies
		*repliesSlice = append(*repliesSlice, replyResponse)

		// Now check if this reply has its own replies, and fetch them separately
		// but include them at the same level as other replies
		if reply.RepliesCount > 0 {
			// Create a separate slice for this reply's replies
			var nestedReplies []models.CommentResponse

			// Recursively fetch replies to this reply
			fetchRepliesRecursively(entityType, entityID, reply.ID, &nestedReplies)

			// Add these nested replies to the original repliesSlice rather than to this reply
			// This flattens the hierarchy
			*repliesSlice = append(*repliesSlice, nestedReplies...)
		}
	}

	// Sort all replies by creation date
	sort.Slice(*repliesSlice, func(i, j int) bool {
		return (*repliesSlice)[i].CreatedAt.Before((*repliesSlice)[j].CreatedAt)
	})
}

// Helper function to safely handle nil string pointers
func stringValue(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
