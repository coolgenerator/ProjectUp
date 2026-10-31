package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"projectup/database"
	"projectup/models"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// HandleInteractionGeneric handles interactions (like, save, etc.) for any entity type
// @Summary Handle interaction
// @Description Toggles an interaction (like, save, etc.) for any entity
// @Tags Interactions
// @Accept json
// @Produce json
// @Param interaction body object true "Interaction data"
// @Success 200 {object} map[string]interface{} "Interaction processed successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request body"
// @Failure 401 {object} map[string]interface{} "User not authorized"
// @Failure 500 {object} map[string]interface{} "Failed to process interaction"
// @Router /interactions [post]
func HandleInteractionGeneric(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authorized"})
		return
	}

	var input struct {
		EntityType int  `json:"entity_type"`
		EntityID   uint `json:"entity_id" binding:"required"`
		Type       int  `json:"type" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	// Check if the interaction already exists
	var existingInteraction models.Interaction
	err := database.DB.Where(
		"entity_type = ? AND entity_id = ? AND user_id = ? AND type = ?",
		input.EntityType, input.EntityID, userID, input.Type,
	).First(&existingInteraction).Error

	// If interaction exists, delete it (toggle off)
	if err == nil {
		if err := database.DB.Unscoped().Delete(&existingInteraction).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove interaction"})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"message":   "Interaction removed",
			"action":    "removed",
			"is_active": false,
		})
		return
	}

	// Otherwise, create a new interaction (toggle on)
	interaction := models.Interaction{
		EntityType: input.EntityType,
		EntityID:   input.EntityID,
		UserID:     userID.(uint),
		Type:       input.Type,
	}

	if err := database.DB.Create(&interaction).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create interaction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Interaction created",
		"action":    "added",
		"is_active": true,
	})
}

// GetInteractionCountsGeneric retrieves interaction counts for an entity
// @Summary Get interaction counts
// @Description Retrieves interaction counts (likes, saves, etc.) for an entity
// @Tags Interactions
// @Accept json
// @Produce json
// @Param entity_type query int true "Entity type (1=project, 2=general, 3=partner)"
// @Param entity_id query int true "Entity ID"
// @Success 200 {object} models.InteractionCountResponse "Interaction counts retrieved successfully"
// @Failure 400 {object} map[string]interface{} "Invalid input parameters"
// @Failure 500 {object} map[string]interface{} "Failed to fetch interaction counts"
// @Router /interactions/counts [get]
func GetInteractionCountsGeneric(c *gin.Context) {
	entityTypeStr := c.Query("entity_type")
	entityIDStr := c.Query("entity_id")
	userIDRaw, userExists := c.Get("userID")

	// Parse parameters
	entityType, err := strconv.Atoi(entityTypeStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid entity type"})
		return
	}

	entityID, err := strconv.ParseUint(entityIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid entity ID"})
		return
	}

	// Get counts by interaction type
	var likesCount, savesCount, viewsCount int64
	var isLiked, isSaved bool

	// Count likes
	database.DB.Model(&models.Interaction{}).
		Where("entity_type = ? AND entity_id = ? AND type = ?",
			entityType, entityID, models.InteractionTypeLike).
		Count(&likesCount)

	// Count saves
	database.DB.Model(&models.Interaction{}).
		Where("entity_type = ? AND entity_id = ? AND type = ?",
			entityType, entityID, models.InteractionTypeSave).
		Count(&savesCount)

	// Count views
	database.DB.Model(&models.Interaction{}).
		Where("entity_type = ? AND entity_id = ? AND type = ?",
			entityType, entityID, models.InteractionTypeView).
		Count(&viewsCount)

	// Check if authenticated user has liked/saved
	if userExists {
		userID := userIDRaw.(uint)

		// Check like status
		var likeCount int64
		database.DB.Model(&models.Interaction{}).
			Where("entity_type = ? AND entity_id = ? AND type = ? AND user_id = ?",
				entityType, entityID, models.InteractionTypeLike, userID).
			Count(&likeCount)
		isLiked = likeCount > 0

		// Check save status
		var saveCount int64
		database.DB.Model(&models.Interaction{}).
			Where("entity_type = ? AND entity_id = ? AND type = ? AND user_id = ?",
				entityType, entityID, models.InteractionTypeSave, userID).
			Count(&saveCount)
		isSaved = saveCount > 0
	}

	response := models.InteractionCountResponse{
		EntityID:  uint(entityID),
		LikeCount: int(likesCount),
		SaveCount: int(savesCount),
		ViewCount: int(viewsCount),
		IsLiked:   isLiked,
		IsSaved:   isSaved,
	}

	c.JSON(http.StatusOK, response)
}

// RecordViewGeneric records a view interaction
// @Summary Record view
// @Description Records a view interaction for an entity
// @Tags Interactions
// @Accept json
// @Produce json
// @Param entity_type query int true "Entity type (1=project, 2=general, 3=partner)"
// @Param entity_id query int true "Entity ID"
// @Success 200 {object} map[string]interface{} "View recorded successfully"
// @Failure 400 {object} map[string]interface{} "Invalid input parameters"
// @Failure 500 {object} map[string]interface{} "Failed to record view"
// @Router /interactions/view [post]
func RecordViewGeneric(c *gin.Context) {
	entityTypeStr := c.Query("entity_type")
	entityIDStr := c.Query("entity_id")
	userIDRaw, userExists := c.Get("userID")

	// Parse parameters
	entityType, err := strconv.Atoi(entityTypeStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid entity type"})
		return
	}

	entityID, err := strconv.ParseUint(entityIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid entity ID"})
		return
	}

	// Only record views for authenticated users
	if !userExists {
		c.JSON(http.StatusOK, gin.H{"message": "View not recorded for anonymous user"})
		return
	}

	userID := userIDRaw.(uint)

	// Check if view already exists (don't duplicate views in a short time period)
	var viewCount int64
	database.DB.Model(&models.Interaction{}).
		Where("entity_type = ? AND entity_id = ? AND type = ? AND user_id = ?",
			entityType, entityID, models.InteractionTypeView, userID).
		Count(&viewCount)

	if viewCount > 0 {
		c.JSON(http.StatusOK, gin.H{"message": "View already recorded"})
		return
	}

	// Create the view interaction
	interaction := models.Interaction{
		EntityType: entityType,
		EntityID:   uint(entityID),
		UserID:     userID,
		Type:       models.InteractionTypeView,
	}

	if err := database.DB.Create(&interaction).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record view"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "View recorded successfully"})
}

// GetSavedItemsController retrieves all saved items (both posts and project posts) for the current user
// @Summary Get saved items
// @Description Retrieves all saved items (posts and project posts) for the current user
// @Tags Interactions
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {array} object "Saved items retrieved successfully"
// @Failure 401 {object} map[string]interface{} "User not authorized"
// @Failure 500 {object} map[string]interface{} "Failed to fetch saved items"
// @Router /interactions/saved [get]
func GetSavedItemsController(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authorized"})
		return
	}

	// Get all saved interactions for this user
	var interactions []models.Interaction
	if err := database.DB.Where("user_id = ? AND type = ?", userID, models.InteractionTypeSave).Find(&interactions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch saved items"})
		return
	}

	// Prepare to collect results
	var result []map[string]interface{}

	// Process each saved interaction
	for _, interaction := range interactions {
		var item map[string]interface{}
		var found bool

		switch interaction.EntityType {
		case models.EntityTypeGeneralPost:
			fmt.Printf("Processing general post with ID %d\n", interaction.EntityID)

			// Use direct SQL query to fetch post with all necessary fields
			var post struct {
				ID        uint
				ShortID   string
				Title     string
				Content   string
				PostType  string
				CreatedAt time.Time
				Tags      []string
				Media     json.RawMessage
				UserID    uint
			}

			err := database.DB.Raw(`
				SELECT id, short_id, title, content, post_type, created_at, tags, media, user_id
				FROM posts 
				WHERE id = ?
			`, interaction.EntityID).Scan(&post).Error

			if err != nil {
				fmt.Printf("Error fetching general post ID %d: %s\n", interaction.EntityID, err.Error())
			} else if post.ID > 0 {
				fmt.Printf("Successfully found general post ID %d: %s\n", post.ID, post.Title)

				// Create post data with profile info
				item = map[string]interface{}{
					"id":          post.ID,
					"short_id":    post.ShortID,
					"title":       post.Title,
					"content":     post.Content,
					"post_type":   post.PostType,
					"created_at":  post.CreatedAt,
					"tags":        post.Tags,
					"media":       post.Media,
					"entity_type": models.EntityTypeGeneralPost,
				}

				// Fetch user and profile info
				var user models.User
				var profile models.Profile

				if post.UserID > 0 {
					// Get user data
					if err := database.DB.Where("id = ?", post.UserID).First(&user).Error; err == nil {
						item["user"] = map[string]interface{}{
							"id":       user.ID,
							"username": user.Username,
						}

						// Get profile data
						if err := database.DB.Where("user_id = ?", post.UserID).First(&profile).Error; err == nil {
							item["profile"] = map[string]interface{}{
								"preferred_name": profile.PreferredName,
								"avatar_url":     profile.AvatarURL,
							}
						} else {
							// Default profile if not found
							item["profile"] = map[string]interface{}{
								"preferred_name": user.Username,
								"avatar_url":     "",
							}
						}
					}
				}

				// Get interaction data (like count)
				var likeCount int64
				database.DB.Model(&models.Interaction{}).
					Where("entity_type = ? AND entity_id = ? AND type = ?",
						models.EntityTypeGeneralPost, post.ID, models.InteractionTypeLike).
					Count(&likeCount)

				item["love_count"] = likeCount
				found = true
			} else {
				fmt.Printf("No general post found with ID %d\n", interaction.EntityID)
			}

		case models.EntityTypeProjectPost:
			// Fetch project post
			var post models.ProjectPost
			if err := database.DB.Where("post_id = ?", interaction.EntityID).First(&post).Error; err == nil {
				// Get user data
				var user models.User
				var profile models.Profile

				item = map[string]interface{}{
					"id":          post.PostID,
					"short_id":    post.ShortID,
					"title":       post.Title,
					"content":     post.Description,
					"post_type":   "Project",
					"cover":       post.Cover,
					"media":       post.Medias, // Add media
					"created_at":  post.CreatedAt,
					"entity_type": models.EntityTypeProjectPost,
				}

				// Add user and profile info
				if post.UserID > 0 {
					if err := database.DB.Where("id = ?", post.UserID).First(&user).Error; err == nil {
						item["user"] = map[string]interface{}{
							"id":       user.ID,
							"username": user.Username,
						}

						// Get profile data
						if err := database.DB.Where("user_id = ?", post.UserID).First(&profile).Error; err == nil {
							item["profile"] = map[string]interface{}{
								"preferred_name": profile.PreferredName,
								"avatar_url":     profile.AvatarURL,
							}
						} else {
							// Default profile if not found
							item["profile"] = map[string]interface{}{
								"preferred_name": user.Username,
								"avatar_url":     "",
							}
						}
					}
				}

				// Get interaction data (like count)
				var likeCount int64
				database.DB.Model(&models.Interaction{}).
					Where("entity_type = ? AND entity_id = ? AND type = ?",
						models.EntityTypeProjectPost, post.PostID, models.InteractionTypeLike).
					Count(&likeCount)

				item["love_count"] = likeCount
				found = true
			}
		}

		if found {
			result = append(result, item)
		}
	}

	// Return the results
	c.JSON(http.StatusOK, result)
}
