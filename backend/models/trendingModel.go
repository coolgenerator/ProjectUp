package models

import (
	"time"

	"gorm.io/gorm"
)

// TrendingItem represents an item that is trending
type TrendingItem struct {
	ID           string         `gorm:"primaryKey;type:varchar(36)" json:"id"`
	ItemType     string         `gorm:"type:varchar(50);not null" json:"item_type"` // "post", "project", "user", "topic"
	ItemID       uint           `gorm:"not null" json:"item_id"`                    // ID of the actual item
	Title        string         `gorm:"type:varchar(255);not null" json:"title"`
	Description  string         `gorm:"type:text" json:"description"`
	ImageURL     string         `gorm:"type:varchar(500)" json:"image_url"`
	Score        float64        `gorm:"default:0" json:"score"`                          // Trending score
	ViewCount    int            `gorm:"default:0" json:"view_count"`
	LikeCount    int            `gorm:"default:0" json:"like_count"`
	CommentCount int            `gorm:"default:0" json:"comment_count"`
	ShareCount   int            `gorm:"default:0" json:"share_count"`
	Tags         string         `gorm:"type:text" json:"tags"`                           // Comma-separated tags
	Category     string         `gorm:"type:varchar(100)" json:"category"`
	AuthorID     uint           `gorm:"index" json:"author_id"`
	AuthorName   string         `gorm:"type:varchar(255)" json:"author_name"`
	AuthorAvatar string         `gorm:"type:varchar(500)" json:"author_avatar"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
	
	// Relations
	Author *User `gorm:"foreignKey:AuthorID" json:"author,omitempty"`
}

// TableName overrides the table name used by TrendingItem
func (TrendingItem) TableName() string {
	return "trending_items"
}

// TrendingResponse represents the API response for trending items
type TrendingResponse struct {
	Items      []TrendingItem `json:"items"`
	TotalCount int64          `json:"total_count"`
	Page       int            `json:"page"`
	PageSize   int            `json:"page_size"`
}