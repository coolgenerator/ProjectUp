package models

import "time"

// ProjectCheckin is one member's weekly update: what they did, what's next and
// what's blocking them. One row per member per week.
type ProjectCheckin struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	ProjectID uint      `gorm:"not null;uniqueIndex:idx_checkin_week" json:"project_id"`
	UserID    uint      `gorm:"not null;uniqueIndex:idx_checkin_week" json:"user_id"`
	WeekStart time.Time `gorm:"type:date;not null;uniqueIndex:idx_checkin_week" json:"week_start"` // Monday of the week
	Done      string    `gorm:"type:text" json:"done"`
	Next      string    `gorm:"type:text" json:"next"`
	Blockers  string    `gorm:"type:text" json:"blockers"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (ProjectCheckin) TableName() string {
	return "project_checkins"
}

// ProjectDecision is one line in a team's decision log, so later members can
// see what was decided and why.
type ProjectDecision struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	ProjectID uint      `gorm:"index;not null" json:"project_id"`
	UserID    uint      `gorm:"not null" json:"user_id"`
	Text      string    `gorm:"type:text;not null" json:"text"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (ProjectDecision) TableName() string {
	return "project_decisions"
}
