package models

import (
	"time"

	"github.com/lib/pq"
	"gorm.io/datatypes"
)

// ProjectPlan represents a structured plan document for a project
type ProjectPlan struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	ProjectID   uint           `gorm:"not null;index:idx_project_plans_project" json:"project_id"`
	Title       string         `gorm:"size:255;not null" json:"title"`
	Description string         `gorm:"type:text" json:"description"`
	PlanType    string         `gorm:"size:50;index:idx_project_plans_type" json:"plan_type"` // roadmap, curriculum, sprint, custom
	Content     datatypes.JSON `gorm:"type:jsonb;not null" json:"content"`
	Source      string         `gorm:"size:50" json:"source"`       // ai-generated, manual, imported
	CreatedBy   *uint          `json:"created_by"`
	OrderIndex  int            `gorm:"default:0" json:"order_index"`
	Status      string         `gorm:"size:50;default:'draft';index:idx_project_plans_status" json:"status"` // draft, active, completed, archived

	// Organization fields
	Tags     pq.StringArray `gorm:"type:text[];index:idx_project_plans_tags,type:gin" json:"tags"`
	Category *string        `gorm:"size:100;index:idx_project_plans_category" json:"category,omitempty"`

	// Relationships stored as arrays
	LinkedTaskIDs pq.Int64Array `gorm:"type:integer[]" json:"linked_task_ids"`
	LinkedIdeaIDs pq.Int64Array `gorm:"type:integer[]" json:"linked_idea_ids"`
	LinkedPlanIDs pq.Int64Array `gorm:"type:integer[]" json:"linked_plan_ids"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Relations
	Project Project `gorm:"foreignKey:ProjectID" json:"-"`
	Creator *User   `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
}

// PlanContent represents the structure of plan content
type PlanContent struct {
	Sections []PlanSection `json:"sections"`
}

// PlanSection represents a section within a plan
type PlanSection struct {
	ID          string                 `json:"id"`
	Type        string                 `json:"type"` // roadmap-step, skill, goal, text, checklist, category-breakdown, skills-list, goals-list
	Title       string                 `json:"title"`
	Content     string                 `json:"content"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
	SubSections []PlanSection          `json:"subsections,omitempty"`
}

// TableName specifies the table name for ProjectPlan
func (ProjectPlan) TableName() string {
	return "project_plans"
}
