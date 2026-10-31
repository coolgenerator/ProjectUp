package services

import (
	"projectup/database"
	"projectup/models"
	"time"
)

// ToggleInteraction toggles an interaction (like, save, etc.) for any entity
func ToggleInteraction(userID uint, entityType int, entityID uint, interactionType int) (bool, error) {
	// Check if the interaction already exists
	var existingInteraction models.Interaction
	err := database.DB.Where(
		"entity_type = ? AND entity_id = ? AND user_id = ? AND type = ?",
		entityType, entityID, userID, interactionType,
	).First(&existingInteraction).Error

	// If interaction exists, delete it (toggle off)
	if err == nil {
		if err := database.DB.Unscoped().Delete(&existingInteraction).Error; err != nil {
			return false, err
		}
		return false, nil // Interaction was removed
	}

	// Otherwise, create a new interaction (toggle on)
	interaction := models.Interaction{
		EntityType: entityType,
		EntityID:   entityID,
		UserID:     userID,
		Type:       interactionType,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	if err := database.DB.Create(&interaction).Error; err != nil {
		return false, err
	}

	return true, nil // Interaction was added
}

// GetInteractionCount gets the count of a specific interaction type for an entity
func GetInteractionCount(entityType int, entityID uint, interactionType int) (int, error) {
	var count int64
	err := database.DB.Model(&models.Interaction{}).
		Where("entity_type = ? AND entity_id = ? AND type = ?",
			entityType, entityID, interactionType).
		Count(&count).Error

	return int(count), err
}

// CheckUserInteraction checks if a user has a specific interaction with an entity
func CheckUserInteraction(userID uint, entityType int, entityID uint, interactionType int) (bool, error) {
	var count int64
	err := database.DB.Model(&models.Interaction{}).
		Where("entity_type = ? AND entity_id = ? AND type = ? AND user_id = ?",
			entityType, entityID, interactionType, userID).
		Count(&count).Error

	return count > 0, err
}

// GetEntityInteractions gets all interaction data for an entity and user
// OPTIMIZED: Uses 2 queries instead of 6+ queries
func GetEntityInteractions(userID uint, entityType int, entityID uint) (map[string]interface{}, error) {
	// OPTIMIZATION: Single query to get all interaction counts grouped by type
	type InteractionCount struct {
		Type  int
		Count int64
	}

	var interactionCounts []InteractionCount
	database.DB.Model(&models.Interaction{}).
		Select("type, COUNT(*) as count").
		Where("entity_type = ? AND entity_id = ?", entityType, entityID).
		Group("type").
		Scan(&interactionCounts)

	// Map results
	likeCount := 0
	saveCount := 0
	viewCount := 0

	for _, ic := range interactionCounts {
		switch ic.Type {
		case models.InteractionTypeLike:
			likeCount = int(ic.Count)
		case models.InteractionTypeSave:
			saveCount = int(ic.Count)
		case models.InteractionTypeView:
			viewCount = int(ic.Count)
		}
	}

	// OPTIMIZATION: Single query to check user interactions
	type UserInteraction struct {
		Type int
	}

	var userInteractions []UserInteraction
	database.DB.Model(&models.Interaction{}).
		Select("type").
		Where("entity_type = ? AND entity_id = ? AND user_id = ?", entityType, entityID, userID).
		Scan(&userInteractions)

	isLiked := false
	isSaved := false

	for _, ui := range userInteractions {
		switch ui.Type {
		case models.InteractionTypeLike:
			isLiked = true
		case models.InteractionTypeSave:
			isSaved = true
		}
	}

	// Get comments count (still need separate query)
	var commentsCount int64
	database.DB.Model(&models.GenericComment{}).
		Where("entity_type = ? AND entity_id = ?", entityType, entityID).
		Count(&commentsCount)

	// Build and return the response
	return map[string]interface{}{
		"likes_count":    likeCount,
		"save_count":     saveCount,
		"view_count":     viewCount,
		"comments_count": int(commentsCount),
		"is_loved":       isLiked, // Keeping both is_loved and is_liked for compatibility
		"is_liked":       isLiked,
		"is_saved":       isSaved,
	}, nil
}

// GetAllSavedItems retrieves all saved items for a user, across entity types
func GetAllSavedItems(userID uint) ([]map[string]interface{}, error) {
	// Get all saved interactions for this user
	var interactions []models.Interaction
	if err := database.DB.Where("user_id = ? AND type = ?", userID, models.InteractionTypeSave).Find(&interactions).Error; err != nil {
		return nil, err
	}

	// Prepare to collect results
	var result []map[string]interface{}

	// Process each saved interaction
	for _, interaction := range interactions {
		var item map[string]interface{}
		var found bool

		switch interaction.EntityType {
		case models.EntityTypeGeneralPost:
			// Fetch general post
			var post models.Post
			if err := database.DB.Where("id = ?", interaction.EntityID).First(&post).Error; err == nil {
				item = map[string]interface{}{
					"id":          post.ID,
					"short_id":    post.ShortID,
					"title":       post.Title,
					"content":     post.Content,
					"post_type":   post.PostType,
					"created_at":  post.CreatedAt,
					"tags":        post.Tags,
					"entity_type": models.EntityTypeGeneralPost,
				}
				found = true
			}

		case models.EntityTypeProjectPost:
			// Fetch project post
			var post models.ProjectPost
			if err := database.DB.Where("post_id = ?", interaction.EntityID).First(&post).Error; err == nil {
				item = map[string]interface{}{
					"id":          post.PostID,
					"short_id":    post.ShortID,
					"title":       post.Title,
					"content":     post.Description,
					"post_type":   "Project",
					"cover":       post.Cover,
					"created_at":  post.CreatedAt,
					"entity_type": models.EntityTypeProjectPost,
				}
				found = true
			}
		}

		if found {
			result = append(result, item)
		}
	}

	return result, nil
}
