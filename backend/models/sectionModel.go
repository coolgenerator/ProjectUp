package models

import (
	"time"

	"gorm.io/gorm"
)

// Section represents a task section/phase within a project
type Section struct {
	ID          int            `gorm:"primaryKey;autoIncrement" json:"id"`
	ProjectID   string         `gorm:"type:varchar(50);not null;index" json:"project_id"`
	Name        string         `gorm:"type:varchar(255);not null" json:"name"`
	Description *string        `gorm:"type:text" json:"description,omitempty"`
	MilestoneID *uint          `gorm:"default:null;index" json:"milestone_id,omitempty"`
	Order       int            `gorm:"type:int;not null;default:0" json:"order"`
	Color       string         `gorm:"type:varchar(20)" json:"color,omitempty"`
	CreatedAt   time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName specifies the table name for Section
func (Section) TableName() string {
	return "sections"
}
