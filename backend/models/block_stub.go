package models

import (
	"time"
	"gorm.io/datatypes"
)

// Block is a temporary stub for backward compatibility
// This model is deprecated and will be removed completely
// Use IdeaNode from idea_tree.go instead
type Block struct {
	BlockID      uint           `json:"block_id" gorm:"primaryKey;autoIncrement"`
	ProjectID    uint           `json:"project_id"`
	Type         string         `json:"type"`
	Title        string         `json:"title"`
	Content      datatypes.JSON `json:"content"`
	Archived     bool           `json:"archived"`
	ParentID     *uint          `json:"parent_id"`
	SortOrder    int            `json:"sort_order"`
	UserID       uint           `json:"user_id"`       // Added for compatibility
	LastEditedBy uint           `json:"last_edited_by"` // Added for compatibility
	HasChildren  bool           `json:"has_children"`  // Added for compatibility
	Color        string         `json:"color"`         // Added for compatibility
	Icon         string         `json:"icon"`          // Added for compatibility
	IsTemplate   bool           `json:"is_template"`   // Added for compatibility
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
}

// BlockPermission is a temporary stub for backward compatibility
type BlockPermission struct {
	ID         uint       `json:"id" gorm:"primaryKey;autoIncrement"`
	BlockID    uint       `json:"block_id"`
	UserID     *uint      `json:"user_id"`
	GroupID    *uint      `json:"group_id"`
	CanView    bool       `json:"can_view"`
	CanEdit    bool       `json:"can_edit"`
	CanComment bool       `json:"can_comment"`
	CanShare   bool       `json:"can_share"`
	Group      *ProjectGroup `json:"group,omitempty" gorm:"foreignKey:GroupID"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

// BlockVisibleGroup is a temporary stub for backward compatibility
type BlockVisibleGroup struct {
	ID        uint      `json:"id" gorm:"primaryKey;autoIncrement"`
	BlockID   uint      `json:"block_id"`
	GroupID   uint      `json:"group_id"`
	CreatedAt time.Time `json:"created_at"`
}

// BlockTemplate is a temporary stub for backward compatibility
type BlockTemplate struct {
	ID          uint           `json:"id" gorm:"primaryKey;autoIncrement"`
	Name        string         `json:"name"`
	Description string         `json:"description"`
	ProjectID   uint           `json:"project_id"`
	UserID      uint           `json:"user_id"`
	Type        string         `json:"type"`
	Structure   datatypes.JSON `json:"structure"`
	Icon        string         `json:"icon"`
	Color       string         `json:"color"`
	Category    string         `json:"category"`
	Content     datatypes.JSON `json:"content"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

// BlockType constants for backward compatibility
type BlockType string

const (
	FileBlock       BlockType = "file"
	ImageBlock      BlockType = "image"
	VideoBlock      BlockType = "video"
	AudioBlock      BlockType = "audio"
	LinkBlock       BlockType = "link"
	EmbedBlock      BlockType = "embed"
	PageBlock       BlockType = "page"
	TextBlock       BlockType = "text"
	HeadingBlock    BlockType = "heading"
	CodeBlock       BlockType = "code"
	BulletListBlock BlockType = "bullet_list"
	NumberListBlock BlockType = "number_list"
	TodoBlock       BlockType = "todo"
	TaskBlock       BlockType = "task"
)

// TableName overrides for GORM
func (Block) TableName() string {
	return "blocks"
}

func (BlockPermission) TableName() string {
	return "block_permissions"
}

func (BlockVisibleGroup) TableName() string {
	return "block_visible_groups"
}