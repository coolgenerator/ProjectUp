package models

import (
    "time"

    "github.com/google/uuid"
    "gorm.io/gorm"
)

// PostSuggestion stores AI-based recommended posts for users
type PostSuggestion struct {
    ID              uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
    PostID          uuid.UUID `gorm:"type:uuid;not null;index" json:"post_id"`
    SuggestedUserID uuid.UUID `gorm:"type:uuid;not null;index" json:"suggested_user_id"`
    Reason          string    `gorm:"type:text;not null" json:"reason"`
    CreatedAt       time.Time `gorm:"autoCreateTime" json:"created_at"`
}

// BeforeCreate hook to generate UUID
func (ps *PostSuggestion) BeforeCreate(tx *gorm.DB) (err error) {
    ps.ID = uuid.New()
    return
}
