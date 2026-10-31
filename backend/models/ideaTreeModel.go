package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// IdeaNode represents a node in the IdeaTree structure
type IdeaNode struct {
	NodeID      uint  `gorm:"primaryKey;autoIncrement" json:"node_id"`
	ProjectID   uint  `gorm:"not null;index" json:"project_id"`
	WorkspaceID *uint `gorm:"default:null;index" json:"workspace_id,omitempty"` // Optional - only for pro users with workspace feature
	ParentID    *uint `gorm:"default:null;index" json:"parent_id,omitempty"`

	Title   string         `gorm:"type:varchar(255);not null" json:"title"`
	Content datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"content"` // EditorJS content or structured data
	Type    string         `gorm:"type:varchar(50);default:'idea'" json:"type"` // idea, note, decision, task, etc.

	// Metadata
	CreatedByID  uint `gorm:"not null" json:"created_by_id"`
	LastEditedBy uint `gorm:"not null" json:"last_edited_by"`

	// Visual properties
	Color *string `gorm:"type:varchar(7)" json:"color,omitempty"`
	Icon  *string `gorm:"type:varchar(50)" json:"icon,omitempty"`

	// Organization
	SortOrder int  `gorm:"default:0" json:"sort_order"`
	Archived  bool `gorm:"default:false" json:"archived"`

	CreatedAt time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`

	// Relationships
	Workspace    *ProjectGroup `gorm:"foreignKey:WorkspaceID;-:migration" json:"workspace,omitempty"`
	CreatedBy    *User         `gorm:"foreignKey:CreatedByID;-:migration" json:"created_by,omitempty"`
	LastEditor   *User         `gorm:"foreignKey:LastEditedBy;-:migration" json:"last_editor,omitempty"`
	Parent       *IdeaNode     `gorm:"foreignKey:ParentID;-:migration" json:"parent,omitempty"`
	Children     []*IdeaNode   `gorm:"foreignKey:ParentID;-:migration" json:"children,omitempty"`
}

func (IdeaNode) TableName() string {
	return "idea_nodes"
}
