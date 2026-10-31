package models

import (
	"time"
)

// ShareLink represents a shareable link to a project or workspace
type ShareLink struct {
	ShareID     uint       `gorm:"primaryKey;autoIncrement" json:"share_id"`
	ProjectID   uint       `gorm:"not null;index" json:"project_id"`
	WorkspaceID *uint      `gorm:"default:null;index" json:"workspace_id,omitempty"` // NULL = full project access
	ShareToken  string     `gorm:"type:varchar(64);uniqueIndex;not null" json:"share_token"`
	AccessLevel string     `gorm:"type:varchar(20);not null" json:"access_level"` // 'view' or 'edit'
	CreatedBy   uint       `gorm:"not null;index" json:"created_by"`
	ExpiresAt   *time.Time `gorm:"default:null" json:"expires_at,omitempty"`
	IsActive    bool       `gorm:"default:true;index" json:"is_active"`
	UsageCount  int        `gorm:"default:0" json:"usage_count"` // Track how many times link was used
	CreatedAt   time.Time  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time  `gorm:"autoUpdateTime" json:"updated_at"`

	// Relationships
	Project   *Project      `gorm:"foreignKey:ProjectID;constraint:OnDelete:CASCADE" json:"project,omitempty"`
	Workspace *ProjectGroup `gorm:"foreignKey:WorkspaceID;constraint:OnDelete:CASCADE" json:"workspace,omitempty"`
	Creator   *User         `gorm:"foreignKey:CreatedBy;constraint:OnDelete:CASCADE" json:"creator,omitempty"`
}

// TableName specifies the table name for ShareLink model
func (ShareLink) TableName() string {
	return "share_links"
}

// IsExpired checks if the share link has expired
func (s *ShareLink) IsExpired() bool {
	if s.ExpiresAt == nil {
		return false
	}
	return time.Now().After(*s.ExpiresAt)
}

// IsValid checks if the share link is valid (active and not expired)
func (s *ShareLink) IsValid() bool {
	return s.IsActive && !s.IsExpired()
}

// ShareLinkUsage tracks each time a share link is used
type ShareLinkUsage struct {
	UsageID      uint      `gorm:"primaryKey;autoIncrement" json:"usage_id"`
	ShareID      uint      `gorm:"not null;index" json:"share_id"`
	UserID       *uint     `gorm:"default:null;index" json:"user_id,omitempty"` // NULL if anonymous
	IPAddress    string    `gorm:"type:varchar(45)" json:"ip_address"`
	UserAgent    string    `gorm:"type:text" json:"user_agent"`
	AccessedAt   time.Time `gorm:"autoCreateTime" json:"accessed_at"`
	ActionTaken  string    `gorm:"type:varchar(50)" json:"action_taken"` // 'viewed', 'joined', 'declined'

	// Relationships
	ShareLink *ShareLink `gorm:"foreignKey:ShareID;constraint:OnDelete:CASCADE" json:"share_link,omitempty"`
	User      *User      `gorm:"foreignKey:UserID;constraint:OnDelete:SET NULL" json:"user,omitempty"`
}

// TableName specifies the table name for ShareLinkUsage model
func (ShareLinkUsage) TableName() string {
	return "share_link_usage"
}
