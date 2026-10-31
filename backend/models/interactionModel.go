package models

import (
	"time"

	"gorm.io/datatypes"
)

// InteractionType enum
const (
	InteractionTypeLike  = iota + 1 // 1
	InteractionTypeSave             // 2
	InteractionTypeView             // 3
	InteractionTypeShare            // 4
	// Add more as needed
)

// Interaction represents any user interaction with content
type Interaction struct {
	ID         uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	EntityType int            `gorm:"not null;index" json:"entity_type"`    // Type of content interacted with {1: project, 2: general post, 3: partner}
	EntityID   uint           `gorm:"not null;index" json:"entity_id"`      // ID of the entity interacted with
	UserID     uint           `gorm:"not null;index" json:"user_id"`        // User who performed the interaction
	Type       int            `gorm:"not null;index" json:"type"`           // Type of interaction (like, save, etc.) {}
	Metadata   datatypes.JSON `gorm:"type:jsonb" json:"metadata,omitempty"` // Additional data about the interaction
	CreatedAt  time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt  time.Time      `gorm:"autoUpdateTime" json:"updated_at"`

	// Preload related data
	User User `gorm:"foreignKey:UserID;-:migration" json:"user,omitempty"`
}

func (Interaction) TableName() string {
	return "interactions"
}

// Helper function to convert string interaction type to int
func ConvertInteractionTypeToInt(typeStr string) int {
	switch typeStr {
	case "love", "like":
		return InteractionTypeLike
	case "save":
		return InteractionTypeSave
	case "view":
		return InteractionTypeView
	case "share":
		return InteractionTypeShare
	default:
		return 0
	}
}

// Helper function to convert int interaction type to string
func ConvertInteractionTypeToString(typeInt int) string {
	switch typeInt {
	case InteractionTypeLike:
		return "like"
	case InteractionTypeSave:
		return "save"
	case InteractionTypeView:
		return "view"
	case InteractionTypeShare:
		return "share"
	default:
		return "unknown"
	}
}

// ProjectInteraction is a legacy model kept for conversion purposes
type ProjectInteraction struct {
	ID              uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID          uint      `gorm:"not null;index" json:"user_id"`
	PostID          uint      `gorm:"not null;index" json:"post_id"`
	InteractionType string    `gorm:"not null;index" json:"interaction_type"` // "like", "save", etc.
	CreatedAt       time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt       time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

// CreateInteractionFromLegacy converts a ProjectInteraction to the new Interaction model
func CreateInteractionFromLegacy(pi *ProjectInteraction) *Interaction {
	return &Interaction{
		EntityType: EntityTypeProjectPost,
		EntityID:   pi.PostID,
		UserID:     pi.UserID,
		Type:       ConvertInteractionTypeToInt(pi.InteractionType),
		CreatedAt:  pi.CreatedAt,
		UpdatedAt:  pi.UpdatedAt,
	}
}

// InteractionCountResponse provides a standard format for interaction count responses
type InteractionCountResponse struct {
	EntityID  uint `json:"entity_id"`
	LikeCount int  `json:"like_count"`
	SaveCount int  `json:"save_count"`
	ViewCount int  `json:"view_count"`
	IsLiked   bool `json:"is_liked"`
	IsSaved   bool `json:"is_saved"`
}
