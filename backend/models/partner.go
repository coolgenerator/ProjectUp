package models

import (
	"time"
)

// PartnerPost represents a partner/buddy finding post
type PartnerPost struct {
	ID               uint      `json:"post_id" gorm:"primaryKey"`
	UserID           uint      `json:"user_id" gorm:"not null"`
	Title            string    `json:"title" gorm:"not null"`
	Topic            string    `json:"topic" gorm:"not null"`
	Description      string    `json:"description" gorm:"not null"`
	Location         string    `json:"location" gorm:"not null"`
	SpecificDate     string    `json:"date,omitempty" gorm:"default:null"`
	PreferredTime    string    `json:"preferredTime,omitempty" gorm:"default:null"`
	UseSpecificDate  bool      `json:"useSpecificDate" gorm:"default:false"`
	SpotAvailability string    `json:"spotAvailability" gorm:"not null"` // Can be "Always" or a number
	ExpirationPeriod int       `json:"expirationPeriod" gorm:"not null"` // In days
	CreatedAt        time.Time `json:"created_at" gorm:"autoCreateTime"`
	ExpireAt         time.Time `json:"expire_at" gorm:"not null"`
	User             User      `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// PartnerPostRequest is the request body for creating a partner post
type PartnerPostRequest struct {
	Title            string      `json:"title" binding:"required"`
	Topic            string      `json:"topic" binding:"required"`
	Description      string      `json:"description" binding:"required"`
	Location         string      `json:"location" binding:"required"`
	SpecificDate     string      `json:"date,omitempty"`
	PreferredTime    string      `json:"preferredTime,omitempty"`
	UseSpecificDate  bool        `json:"useSpecificDate"`
	SpotAvailability interface{} `json:"spotAvailability" binding:"required"` // Can be "Always" or a number
	ExpirationPeriod int         `json:"expirationPeriod" binding:"required"` // In days
}

// PartnerPostResponse is the response for partner posts with pagination
type PartnerPostResponse struct {
	Partners []*PartnerPost `json:"partners"`
	HasMore  bool           `json:"has_more"`
}
