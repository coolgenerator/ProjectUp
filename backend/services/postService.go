package services

import (
	"projectup/models"
	"projectup/repositories"
	"time"
)

// Using constants from the models package instead of redefining them
// Toggle functions should use the new Interaction model

// Legacy interaction service functions have been removed as they're now replaced
// by the generic functions in interactionService.go

// CreatePostComment creates a new comment on a post
func CreatePostComment(userID, postID uint, content string, parentID *uint) (*models.GenericComment, error) {
	// Determine the level of the comment
	level := 0
	if parentID != nil {
		// This is a reply, so the level is the parent's level + 1
		var parentComment models.GenericComment
		if err := repositories.GetCommentByID(*parentID, &parentComment); err != nil {
			return nil, err
		}
		level = parentComment.Level + 1
	}

	comment := &models.GenericComment{
		EntityType: models.EntityTypeGeneralPost,
		EntityID:   postID,
		UserID:     userID,
		ParentID:   parentID,
		Content:    content,
		Level:      level,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	if err := repositories.CreatePostComment(comment); err != nil {
		return nil, err
	}

	// If it's a reply, increment the parent's replies count
	if parentID != nil {
		// Ignoring error since this is not critical to the comment creation
		_ = repositories.IncrementCommentRepliesCount(*parentID)
	}

	return comment, nil
}

// GetPostComments retrieves comments for a post
func GetPostComments(postID uint, parentID *uint) ([]models.GenericComment, error) {
	return repositories.GetPostComments(postID, parentID)
}
