package models

import (
	"time"
)

type Notification struct {
	NotificationID uint      `gorm:"primaryKey;autoIncrement" json:"notification_id"`
	UserID         uint      `gorm:"not null" json:"user_id"`
	Title          string    `gorm:"type:varchar(255);not null" json:"title"`
	Description    string    `gorm:"type:text;not null" json:"description"`
	URL            string    `gorm:"type:varchar(255);not null" json:"url"` // URL for details
	IsRead         bool      `gorm:"default:false" json:"is_read"`
	Type           string    `gorm:"type:varchar(20);default:'system'" json:"type"` // application, invitation, project or system; used to group the inbox
	CreatedAt      time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (Notification) TableName() string {
	return "notifications"
}

// Notification types, used by the inbox to group notifications.
const (
	NotificationTypeApplication = "application"
	NotificationTypeInvitation  = "invitation"
	NotificationTypeProject     = "project"
	NotificationTypeSystem      = "system"
)
