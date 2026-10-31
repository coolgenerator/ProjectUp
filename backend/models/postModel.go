package models

import (
	"time"

	// "github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// Post represents a post in the system
type Post struct {
	ID         uint           `gorm:"primaryKey" json:"id"`
	ShortID    string         `gorm:"type:varchar(10);not null;uniqueIndex" json:"short_id"`
	UserID     uint           `gorm:"not null;index" json:"user_id"`
	Title      string         `gorm:"type:varchar(255);not null" json:"title"`
	Content    string         `gorm:"type:text;not null" json:"content"`
	PostType   string         `gorm:"type:varchar(50);not null" json:"post_type"`
	Visibility int            `gorm:"type:int" json:"visibility"` // Visibilities (1: private; 2: public; 3: local; 4: organization)
	CreatedAt  time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt  time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"` // Soft delete column
	IsDeleted  bool           `gorm:"default:false" json:"is_deleted"`
	Tags       []string       `gorm:"type:text[]" json:"tags"`
	Media      datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"media"` // Media as a JSON array instead of separate table
	User       *User          `gorm:"-" json:"user"`                        // User information (not stored in DB)
	Profile    *Profile       `gorm:"-" json:"profile"`                     // Profile information (not stored in DB)
}

func (Post) TableName() string {
	return "posts"
}

// MediaItem represents a single media item in a post
type MediaItem struct {
	URL  string `json:"url"`
	Type string `json:"type"`
}

// BeforeCreate hook to set default values
func (p *Post) BeforeCreate(tx *gorm.DB) error {
	if p.PostType == "" {
		p.PostType = "general"
	}
	if p.Visibility == 0 {
		p.Visibility = 2 // Default to public
	}
	return nil
}
