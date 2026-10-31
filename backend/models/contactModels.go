package models

import (
	"time"
)

// Contact model with category field
type Contact struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"user_id"`
	ContactID uint      `json:"contact_id"`
	Category  string    `json:"category" gorm:"type:varchar(255);default:'Uncategorized'"` // Category for contacts
	Status    uint      `json:"status"`                                                    // 0 = Pending, 1 = Accepted, 2 = Declined
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ContactRequest model with status and timestamp
type ContactRequest struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"user_id" binding:"required"`
	ContactID uint      `json:"contact_id" binding:"required"`
	Status    uint      `json:"status" gorm:"default:0"` // 0 = Pending, 1 = Accepted, 2 = Declined
	CreatedAt time.Time `json:"created_at"`
}
