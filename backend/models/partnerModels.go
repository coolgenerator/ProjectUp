package models

import (
	"time"

	"gorm.io/datatypes"
)

type PartnerEvent struct {
	EventID     uint           `gorm:"primaryKey;autoIncrement" json:"event_id"`
	UserID      uint           `gorm:"not null" json:"user_id"` // Foreign key to User table
	Title       string         `gorm:"type:varchar(255);not null" json:"title"`
	Description string         `gorm:"type:text;not null" json:"description"`
	Date        time.Time      `gorm:"not null" json:"date"`
	Location    string         `gorm:"type:varchar(255);not null" json:"location"`
	Cover       *string        `gorm:"type:varchar(255)" json:"cover,omitempty"` // URL for cover image
	Medias      datatypes.JSON `json:"medias" gorm:"type:jsonb;default:'{}'"`    // JSONB for media files
	Category    *string        `gorm:"type:varchar(100)" json:"category,omitempty"`
	Topics      datatypes.JSON `gorm:"type:jsonb" json:"topics,omitempty"` // JSON array of topics
	CreatedAt   time.Time      `gorm:"autoCreateTime" json:"created_at"`

	// Relationships
	Organizer    User               `gorm:"foreignKey:UserID;-:migration" json:"organizer,omitempty"`
	Participants []EventParticipant `gorm:"foreignKey:EventID;-:migration" json:"participants,omitempty"`
	Memos        []EventMemo        `gorm:"foreignKey:EventID;-:migration" json:"memos,omitempty"` // Memos associated with this event
}

func (PartnerEvent) TableName() string {
	return "partners"
}

type EventParticipant struct {
	ParticipantID uint      `gorm:"primaryKey;autoIncrement" json:"participant_id"`
	UserID        uint      `gorm:"not null" json:"user_id"`  // Foreign key to User table
	EventID       uint      `gorm:"not null" json:"event_id"` // Foreign key to PartnerEvent table
	JoinedAt      time.Time `gorm:"autoCreateTime" json:"joined_at"`

	// Relationships
	User  User         `gorm:"foreignKey:UserID;-:migration" json:"user,omitempty"`
	Event PartnerEvent `gorm:"foreignKey:EventID;-:migration" json:"event,omitempty"`
}

func (EventParticipant) TableName() string {
	return "event_participants"
}

type EventMemo struct {
	MemoID     uint    `gorm:"primaryKey;autoIncrement" json:"memo_id"`
	EventID    uint    `gorm:"not null" json:"event_id"` // Foreign key to PartnerEvent table
	UserID     uint    `gorm:"not null" json:"user_id"`  // Foreign key to User table
	Title      string  `gorm:"type:varchar(255);not null" json:"title"`
	Content    *string `gorm:"type:text" json:"content,omitempty"`
	ParentMemo *uint   `gorm:"index" json:"parent_memo"`                  // Parent memo for hierarchy
	BucketList bool    `gorm:"not null;default:false" json:"bucket_list"` // Indicates if this is a bucket list item

	// Handle children in a way that avoids circular references
	// The actual association will be handled at query time
	Children []EventMemo `json:"children,omitempty" gorm:"-"` // Use gorm:"-" to exclude from DB operations

	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	// Relationships
	User  User         `gorm:"foreignKey:UserID;-:migration" json:"user,omitempty"`
	Event PartnerEvent `gorm:"foreignKey:EventID;-:migration" json:"event,omitempty"`
}

func (EventMemo) TableName() string {
	return "event_memos"
}
