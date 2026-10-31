package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

// WorkflowStep represents the current step in the AI Project Assistant workflow
const (
	StepAnalyze  = "analyze"
	StepIdeas    = "ideas"
	StepRoadmap  = "roadmap"
)

// AIWorkflowSession stores the state of a user's AI Project Assistant workflow
type AIWorkflowSession struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	Step      string    `gorm:"type:varchar(50);not null;default:'analyze'" json:"step"` // Current step: analyze, ideas, roadmap
	StateData StateData `gorm:"type:jsonb" json:"state_data"` // JSONB column for flexible state storage
	CreatedAt time.Time `gorm:"type:timestamp;default:current_timestamp" json:"created_at"`
	UpdatedAt time.Time `gorm:"type:timestamp;default:current_timestamp" json:"updated_at"`
}

// StateData represents the workflow state data stored as JSONB
type StateData struct {
	ProjectIdeas      json.RawMessage `json:"project_ideas,omitempty"`
	SelectedIdea      json.RawMessage `json:"selected_idea,omitempty"`
	EnhancedRoadmap   json.RawMessage `json:"enhanced_roadmap,omitempty"`
	HasGeneratedIdeas bool            `json:"has_generated_ideas"`
}

// Scan implements the sql.Scanner interface for JSONB
func (s *StateData) Scan(value interface{}) error {
	if value == nil {
		*s = StateData{}
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, s)
}

// Value implements the driver.Valuer interface for JSONB
func (s StateData) Value() (driver.Value, error) {
	if s.ProjectIdeas == nil && s.SelectedIdea == nil && s.EnhancedRoadmap == nil {
		return "{}", nil
	}
	return json.Marshal(s)
}

func (AIWorkflowSession) TableName() string {
	return "ai_workflow_sessions"
}
