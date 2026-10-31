package models

import (
	"time"

	"gorm.io/datatypes"
)

// IdeaDraft is an Idea Workbench session saved as the user works, so an idea
// can be picked up again after a refresh or on another device.
type IdeaDraft struct {
	ID        uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    uint           `gorm:"index;not null" json:"user_id"`
	Idea      string         `gorm:"type:text;not null" json:"idea"`
	Rounds    datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"rounds" swaggertype:"object"` // Answered question rounds
	Current   datatypes.JSON `gorm:"type:jsonb" json:"current" swaggertype:"object"`             // Unanswered round: questions, answers so far, reflection
	Brief     datatypes.JSON `gorm:"type:jsonb" json:"brief" swaggertype:"object"`               // Shaped project brief, once generated
	PostSID   *string        `gorm:"type:varchar(10);column:post_sid" json:"post_sid"`           // Set once the brief is published
	CreatedAt time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
}

func (IdeaDraft) TableName() string {
	return "idea_drafts"
}
