package models

import (
	"time"

	"gorm.io/gorm"
)

// EntityType enum for different types of content
const (
	EntityTypeProjectPost = 1 // Project Post (1)
	EntityTypeGeneralPost = 2 // General Post (2)
	EntityTypePartnerPost = 3 // Partner Post (3)
	// Add more entity types as needed
)

// GenericComment represents a user's comment on any type of content
type GenericComment struct {
	ID           uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	EntityType   int            `gorm:"not null;index" json:"entity_type"` // Type of content being commented on {1: project, 2: general post, 3: partner}
	EntityID     uint           `gorm:"not null;index" json:"entity_id"`   // ID of the entity being commented on
	UserID       uint           `gorm:"not null;index" json:"user_id"`     // User who created the comment
	ParentID     *uint          `gorm:"index" json:"parent_id,omitempty"`  // Parent comment ID (null for top-level)
	Content      string         `gorm:"type:text;not null" json:"content"` // Comment text
	Level        int            `gorm:"not null;default:0" json:"level"`   // Nesting level (0 for top-level)
	LikesCount   int            `gorm:"not null;default:0" json:"likes_count"`
	RepliesCount int            `gorm:"not null;default:0" json:"replies_count"`
	CreatedAt    time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
	IsDeleted    bool           `gorm:"default:false" json:"is_deleted"`

	// Use pointer for user relationship to avoid circular reference
	User *User `gorm:"foreignKey:UserID;-:migration" json:"user,omitempty"`

	// Handle parent-child relationship with pointers
	Parent  *GenericComment   `gorm:"foreignKey:ParentID;-:migration" json:"parent,omitempty"`
	Replies []*GenericComment `json:"replies,omitempty" gorm:"-"` // Use gorm:"-" to exclude from DB operations
}

func (GenericComment) TableName() string {
	return "comments"
}

// CommentResponse provides a consistent output format regardless of storage
type CommentResponse struct {
	ID                    uint              `json:"id"`
	EntityType            int               `json:"entity_type,omitempty"`
	EntityID              uint              `json:"entity_id"`
	UserID                uint              `json:"user_id"`
	Username              string            `json:"username"`
	FirstName             string            `json:"first_name,omitempty"`
	LastName              string            `json:"last_name,omitempty"`
	PreferredName         string            `json:"preferred_name,omitempty"`
	DisplayNamePreference *int              `json:"display_name_preference,omitempty"`
	AvatarURL             string            `json:"avatar_url"`
	ParentID              *uint             `json:"parent_id,omitempty"`
	Content               string            `json:"content"`
	Level                 int               `json:"level"`
	LikesCount            int               `json:"likes_count"`
	RepliesCount          int               `json:"replies_count"`
	CreatedAt             time.Time         `json:"created_at"`
	Replies               []CommentResponse `json:"replies,omitempty"`
}
