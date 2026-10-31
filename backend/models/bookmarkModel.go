package models

import (
	"time"

	"gorm.io/gorm"
)

// Bookmark represents a saved bookmark/link
type Bookmark struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	UserID      uint           `gorm:"not null;index" json:"user_id"`
	URL         string         `gorm:"type:text;not null" json:"url"`
	Title       string         `gorm:"type:varchar(500)" json:"title"`
	Description string         `gorm:"type:text" json:"description"`
	Thumbnail   string         `gorm:"type:text" json:"thumbnail"`
	Category    string         `gorm:"type:varchar(100)" json:"category"`
	Tags        string         `gorm:"type:text" json:"tags"` // Comma-separated tags
	Platform    string         `gorm:"type:varchar(50)" json:"platform"` // youtube, bilibili, article, etc.
	Author      string         `gorm:"type:varchar(255)" json:"author"`
	AuthorAvatar string        `gorm:"type:text" json:"author_avatar"`
	ViewCount   int            `gorm:"default:0" json:"view_count"`
	LikeCount   int            `gorm:"default:0" json:"like_count"`
	Collections string         `gorm:"type:text" json:"collections"` // Comma-separated collection names
	IsFavorite  bool           `gorm:"default:false" json:"is_favorite"`
	IsArchived  bool           `gorm:"default:false" json:"is_archived"`
	ImportedAt  time.Time      `json:"imported_at"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
	
	// Relations
	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// TableName overrides the table name
func (Bookmark) TableName() string {
	return "bookmarks"
}

// BookmarkCategory represents predefined categories for bookmarks
type BookmarkCategory struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"type:varchar(100);unique;not null" json:"name"`
	Icon        string    `gorm:"type:varchar(50)" json:"icon"`
	Color       string    `gorm:"type:varchar(50)" json:"color"`
	Keywords    string    `gorm:"type:text" json:"keywords"` // Keywords for auto-categorization
	Description string    `gorm:"type:text" json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// TableName overrides the table name
func (BookmarkCategory) TableName() string {
	return "bookmark_categories"
}

// BookmarkRequest represents the request to create a bookmark
type BookmarkRequest struct {
	URL         string   `json:"url" binding:"required"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Tags        []string `json:"tags"`
	Collections []string `json:"collections"`
}

// BookmarkResponse represents the API response for bookmarks
type BookmarkResponse struct {
	Bookmarks  []Bookmark `json:"bookmarks"`
	TotalCount int64      `json:"total_count"`
	Page       int        `json:"page"`
	PageSize   int        `json:"page_size"`
}