package repositories

import (
	"errors"
	"projectup/database"
	"projectup/helper"
	"projectup/models"

	"gorm.io/gorm"
)

// GeneratePostShortID generates a unique short ID for a post
func GeneratePostShortID(post *models.Post) error {
	for {
		shortID := helper.GenerateShortID(8)
		var conflictPost models.Post
		if err := database.DB.Where("short_id = ?", shortID).First(&conflictPost).Error; errors.Is(err, gorm.ErrRecordNotFound) {
			post.ShortID = shortID
			break
		}
	}
	return nil
}

// CreatePost creates a new post in the database
func CreatePost(post *models.Post) error {
	return database.DB.Create(post).Error
}

// GetPostInteraction retrieves a post interaction by user ID, post ID, and interaction type
func GetPostInteraction(userID, postID uint, interactionType int) (*models.Interaction, error) {
	var interaction models.Interaction
	err := database.DB.Where("user_id = ? AND entity_id = ? AND entity_type = ? AND type = ?",
		userID, postID, models.EntityTypeGeneralPost, interactionType).First(&interaction).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &interaction, nil
}

// CreatePostInteraction creates a new post interaction
func CreatePostInteraction(interaction *models.Interaction) error {
	return database.DB.Create(interaction).Error
}

// DeletePostInteraction deletes a post interaction
func DeletePostInteraction(interaction *models.Interaction) error {
	return database.DB.Delete(interaction).Error
}

// GetPostInteractionCount gets the count of interactions for a post by type
func GetPostInteractionCount(postID uint, interactionType int) (int, error) {
	var count int64
	err := database.DB.Model(&models.Interaction{}).
		Where("entity_id = ? AND entity_type = ? AND type = ?",
			postID, models.EntityTypeGeneralPost, interactionType).
		Count(&count).Error
	return int(count), err
}

// CheckUserPostInteraction checks if a user has interacted with a post in a specific way
func CheckUserPostInteraction(userID, postID uint, interactionType int) (bool, error) {
	var interaction models.Interaction
	err := database.DB.Where("user_id = ? AND entity_id = ? AND entity_type = ? AND type = ?",
		userID, postID, models.EntityTypeGeneralPost, interactionType).First(&interaction).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return false, nil
	}
	return err == nil, err
}

// GetSavedItems retrieves all posts that a user has saved
func GetSavedItems(userID uint) ([]models.Post, error) {
	var posts []models.Post
	err := database.DB.
		Joins("JOIN interactions ON posts.id = interactions.entity_id").
		Where("interactions.user_id = ? AND interactions.entity_type = ? AND interactions.type = ?",
			userID, models.EntityTypeGeneralPost, models.InteractionTypeSave).
		Find(&posts).Error
	return posts, err
}

// GetPostComments retrieves comments for a post
func GetPostComments(postID uint, parentID *uint) ([]models.GenericComment, error) {
	var comments []models.GenericComment
	query := database.DB.Where("entity_type = ? AND entity_id = ?", models.EntityTypeGeneralPost, postID)

	if parentID == nil {
		// Get top-level comments
		query = query.Where("parent_id IS NULL")
	} else {
		// Get replies to a specific comment
		query = query.Where("parent_id = ?", *parentID)
	}

	err := query.Order("created_at DESC").Find(&comments).Error
	return comments, err
}

// CreatePostComment creates a new comment on a post
func CreatePostComment(comment *models.GenericComment) error {
	return database.DB.Create(comment).Error
}

// GetCommentByID retrieves a comment by its ID
func GetCommentByID(commentID uint, comment *models.GenericComment) error {
	return database.DB.First(comment, commentID).Error
}

// IncrementCommentRepliesCount increments the replies_count field of a comment
func IncrementCommentRepliesCount(commentID uint) error {
	return database.DB.Model(&models.GenericComment{}).
		Where("id = ?", commentID).
		UpdateColumn("replies_count", gorm.Expr("replies_count + ?", 1)).Error
}
