package models

import (
	"time"
)

// ProjectGroup represents a workspace in a project with hierarchical structure
type ProjectGroup struct {
	GroupID   uint      `gorm:"primaryKey;autoIncrement" json:"group_id"`
	ProjectID uint      `gorm:"not null;index" json:"project_id"`
	ParentID  *uint     `gorm:"default:null;index" json:"parent_id,omitempty"` // NULL = Main workspace

	Name        string  `gorm:"type:varchar(100);not null" json:"name"`
	Description *string `gorm:"type:text" json:"description,omitempty"`

	// Hierarchy fields
	IsMain bool `gorm:"default:false;index" json:"is_main"` // Main workspace flag
	Level  int  `gorm:"default:0" json:"level"`             // 0 = main, 1 = child, 2 = sub-child

	// Workspace settings
	WorkspaceType string  `gorm:"type:varchar(50);default:'team'" json:"workspace_type"` // main, team, department
	Color         *string `gorm:"type:varchar(7)" json:"color,omitempty"`
	Icon          *string `gorm:"type:varchar(50)" json:"icon,omitempty"`
	SortOrder     int     `gorm:"default:0" json:"sort_order"`

	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	// Relationships
	Project  *Project        `gorm:"foreignKey:ProjectID;-:migration" json:"project,omitempty"`
	Parent   *ProjectGroup   `gorm:"foreignKey:ParentID;-:migration" json:"parent,omitempty"`
	Children []*ProjectGroup `gorm:"foreignKey:ParentID;-:migration" json:"children,omitempty"`
}

func (ProjectGroup) TableName() string {
	return "project_groups"
}

// ProjectGroupMember represents the many-to-many relationship between users and project groups (workspaces)
type ProjectGroupMember struct {
	ProjectID uint      `gorm:"primaryKey" json:"project_id"`
	UserID    uint      `gorm:"primaryKey" json:"user_id"`
	GroupID   uint      `gorm:"primaryKey" json:"group_id"`

	// Role within this workspace
	Role string `gorm:"type:varchar(50);default:'member'" json:"role"` // admin, member, viewer

	JoinedAt time.Time `gorm:"autoCreateTime" json:"joined_at"`

	// Add relationships with proper references and use pointers to avoid circular references
	Project *Project      `gorm:"foreignKey:ProjectID;-:migration" json:"project,omitempty"`
	User    *User         `gorm:"foreignKey:UserID;-:migration" json:"user,omitempty"`
	Group   *ProjectGroup `gorm:"foreignKey:GroupID;-:migration" json:"group,omitempty"`
}

func (ProjectGroupMember) TableName() string {
	return "project_group_members"
}

// ProjectMember model for project membership
// Role determines permissions: owner (full control), admin (manage team), editor (edit content), viewer (read-only)
// Supports placeholder members (not yet registered) via IsPlaceholder flag
type ProjectMember struct {
	ProjectID   uint       `gorm:"primaryKey" json:"project_id"`
	UserID      uint       `gorm:"primaryKey" json:"user_id"`
	Role        string     `gorm:"type:varchar(50);default:'viewer'" json:"role"`     // owner, admin, editor, viewer
	Permissions int        `gorm:"not null;default:1" json:"permissions"`             // Bitwise permission flags
	JoinedAt    time.Time  `gorm:"autoCreateTime" json:"joined_at"`
	UpdatedAt   time.Time  `gorm:"autoUpdateTime" json:"updated_at"`
	RemovedAt   *time.Time `gorm:"index" json:"removed_at,omitempty"` // Soft delete: when member was removed

	// Placeholder member fields (for team members not yet registered)
	IsPlaceholder   bool    `gorm:"default:false" json:"is_placeholder"`
	PlaceholderName *string `gorm:"type:varchar(255)" json:"placeholder_name,omitempty"` // Name of placeholder member
	PlaceholderEmail *string `gorm:"type:varchar(255)" json:"placeholder_email,omitempty"` // Email for invitation
	InviteToken     *string `gorm:"type:varchar(255);unique;index" json:"invite_token,omitempty"` // Token for accepting invite

	// Use pointers for relationships to avoid circular references
	User    *User           `gorm:"foreignKey:UserID;-:migration" json:"user,omitempty"`
	Project *Project        `gorm:"foreignKey:ProjectID;-:migration" json:"project,omitempty"`
	Groups  []*ProjectGroup `gorm:"many2many:project_group_members;foreignKey:ProjectID,UserID;joinForeignKey:ProjectID,UserID;References:GroupID;joinReferences:GroupID;-:migration" json:"groups,omitempty"`
}

func (ProjectMember) TableName() string {
	return "project_members"
}
