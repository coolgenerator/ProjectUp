package models

import (
	"time"

	"gorm.io/gorm"
)

// Meeting represents a scheduled meeting for a project
type Meeting struct {
	ID          string         `gorm:"type:varchar(36);primaryKey" json:"id" example:"550e8400-e29b-41d4-a716-446655440000"`
	ProjectID   uint           `gorm:"not null;index" json:"project_id" example:"1"`
	Title       string         `gorm:"type:varchar(255);not null" json:"title" example:"Sprint Planning Meeting"`
	Description *string        `gorm:"type:text" json:"description,omitempty" example:"Discuss sprint goals and tasks"`
	StartTime   time.Time      `gorm:"type:timestamp;not null" json:"start_time" example:"2024-03-20T10:00:00Z"`
	EndTime     time.Time      `gorm:"type:timestamp;not null" json:"end_time" example:"2024-03-20T11:00:00Z"`
	Location    *string        `gorm:"type:varchar(255)" json:"location,omitempty" example:"Conference Room A"`
	MeetingURL  *string        `gorm:"type:varchar(500)" json:"meeting_url,omitempty" example:"https://zoom.us/j/123456789"`
	CreatedBy   uint           `gorm:"not null" json:"created_by" example:"5"`
	Status      string         `gorm:"type:varchar(50);default:'pending'" json:"status" example:"pending"` // pending, scheduled, in_progress, completed, cancelled
	CreatedAt   time.Time      `gorm:"autoCreateTime" json:"created_at" example:"2024-03-15T10:30:00Z"`
	UpdatedAt   time.Time      `gorm:"autoUpdateTime" json:"updated_at" example:"2024-03-15T14:45:00Z"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`

	// Relationships
	Project     Project             `gorm:"foreignKey:ProjectID" json:"-"`
	Creator     User                `gorm:"foreignKey:CreatedBy" json:"-"`
	Attendees   []MeetingAttendee   `gorm:"foreignKey:MeetingID" json:"attendees,omitempty"`
}

// MeetingAttendee represents a user invited to a meeting
type MeetingAttendee struct {
	ID         uint           `gorm:"primaryKey;autoIncrement" json:"id" example:"1"`
	MeetingID  string         `gorm:"type:varchar(36);not null;index" json:"meeting_id" example:"550e8400-e29b-41d4-a716-446655440000"`
	UserID     uint           `gorm:"not null;index" json:"user_id" example:"3"`
	Status     string         `gorm:"type:varchar(50);default:'invited'" json:"status" example:"accepted"` // invited, accepted, declined, tentative
	ResponseAt *time.Time     `gorm:"type:timestamp" json:"response_at,omitempty" example:"2024-03-16T09:00:00Z"`
	CreatedAt  time.Time      `gorm:"autoCreateTime" json:"created_at" example:"2024-03-15T10:30:00Z"`
	UpdatedAt  time.Time      `gorm:"autoUpdateTime" json:"updated_at" example:"2024-03-15T14:45:00Z"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`

	// Relationships
	Meeting      Meeting                `gorm:"foreignKey:MeetingID" json:"-"`
	User         User                   `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Availability []MeetingAvailability  `gorm:"foreignKey:AttendeeID" json:"availability,omitempty"`
}

// MeetingAvailability represents availability shared by an attendee for a pending meeting
type MeetingAvailability struct {
	ID           uint           `gorm:"primaryKey;autoIncrement" json:"id" example:"1"`
	MeetingID    string         `gorm:"type:varchar(36);not null;index" json:"meeting_id" example:"550e8400-e29b-41d4-a716-446655440000"`
	AttendeeID   uint           `gorm:"not null;index" json:"attendee_id" example:"1"` // References MeetingAttendee.ID
	AvailableDates string       `gorm:"type:text" json:"available_dates"` // JSON array of dates ["2024-03-20", "2024-03-21"]
	TimeZone     int            `gorm:"type:int" json:"timezone" example:"-8"` // Timezone offset in hours
	StartTime    string         `gorm:"type:varchar(10)" json:"start_time" example:"09:00"`
	EndTime      string         `gorm:"type:varchar(10)" json:"end_time" example:"17:00"`
	CreatedAt    time.Time      `gorm:"autoCreateTime" json:"created_at" example:"2024-03-15T10:30:00Z"`
	UpdatedAt    time.Time      `gorm:"autoUpdateTime" json:"updated_at" example:"2024-03-15T14:45:00Z"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`

	// Relationships
	Meeting  Meeting         `gorm:"foreignKey:MeetingID" json:"-"`
	Attendee MeetingAttendee `gorm:"foreignKey:AttendeeID" json:"-"`
}

// CreateMeetingRequest represents the request body for creating a meeting
type CreateMeetingRequest struct {
	ProjectID   uint     `json:"project_id" binding:"required" example:"1"`
	Title       string   `json:"title" binding:"required" example:"Sprint Planning Meeting"`
	Description *string  `json:"description,omitempty" example:"Discuss sprint goals and tasks"`
	StartTime   *string  `json:"start_time,omitempty" example:"2024-03-20T10:00:00Z"` // Optional for pending meetings
	EndTime     *string  `json:"end_time,omitempty" example:"2024-03-20T11:00:00Z"` // Optional for pending meetings
	Location    *string  `json:"location,omitempty" example:"Conference Room A"`
	MeetingURL  *string  `json:"meeting_url,omitempty" example:"https://zoom.us/j/123456789"`
	Status      *string  `json:"status,omitempty" example:"pending"` // pending or scheduled
	AttendeeIDs []uint   `json:"attendee_ids,omitempty" example:"3,5,7"` // User IDs to invite
}

// UpdateMeetingRequest represents the request body for updating a meeting
type UpdateMeetingRequest struct {
	Title       *string  `json:"title,omitempty" example:"Updated Sprint Planning"`
	Description *string  `json:"description,omitempty" example:"Updated description"`
	StartTime   *string  `json:"start_time,omitempty" example:"2024-03-20T10:00:00Z"`
	EndTime     *string  `json:"end_time,omitempty" example:"2024-03-20T11:00:00Z"`
	Location    *string  `json:"location,omitempty" example:"Conference Room B"`
	MeetingURL  *string  `json:"meeting_url,omitempty" example:"https://zoom.us/j/987654321"`
	Status      *string  `json:"status,omitempty" example:"completed"`
	AttendeeIDs *[]uint  `json:"attendee_ids,omitempty" example:"3,5,7,9"` // User IDs to invite (replaces existing)
}

// UpdateAttendeeStatusRequest represents the request body for updating attendee status
type UpdateAttendeeStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=accepted declined tentative" example:"accepted"`
}

// MeetingResponse represents a meeting with populated attendee information
type MeetingResponse struct {
	Meeting
	AttendeeDetails []AttendeeDetail `json:"attendee_details,omitempty"`
}

// AttendeeDetail represents detailed information about a meeting attendee
type AttendeeDetail struct {
	UserID     uint       `json:"user_id" example:"3"`
	Username   string     `json:"username" example:"john_doe"`
	Email      string     `json:"email" example:"john@example.com"`
	Status     string     `json:"status" example:"accepted"`
	ResponseAt *time.Time `json:"response_at,omitempty" example:"2024-03-16T09:00:00Z"`
}
