package models

import (
	"encoding/json"
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// Task represents a project task
type Task struct {
	ID             string         `gorm:"type:varchar(50);primaryKey" json:"id"`
	ProjectID      string         `gorm:"type:varchar(50);not null;index" json:"project_id"`
	Title          string         `gorm:"type:varchar(255);not null" json:"title"`
	Description    string         `gorm:"type:text" json:"description"`
	TaskType       string         `gorm:"type:varchar(50)" json:"task_type"` // Optional, flexible field
	Status         string         `gorm:"type:varchar(50);not null;default:'todo'" json:"status"`
	Priority       int            `gorm:"type:int;default:3" json:"priority"`
	Progress       int            `gorm:"type:int;default:0" json:"progress"`
	IdeaNodeID     *string        `gorm:"type:varchar(50);index" json:"idea_node_id,omitempty"`
	MilestoneID    *uint          `gorm:"type:int;index" json:"milestone_id,omitempty"`
	SectionID      *int           `gorm:"type:int;index" json:"section_id,omitempty"`
	SectionOrder   int            `gorm:"type:int;default:0" json:"section_order"`
	ParentTaskID   *string        `gorm:"type:varchar(50);index" json:"parent_task_id,omitempty"`
	EstimatedHours *float64       `gorm:"type:decimal(10,2)" json:"estimated_hours,omitempty"`
	ActualHours    *float64       `gorm:"type:decimal(10,2)" json:"actual_hours,omitempty"`
	StartDate      *time.Time     `gorm:"type:timestamp" json:"start_date,omitempty"`
	DueDate        *time.Time     `gorm:"type:timestamp" json:"due_date,omitempty"`
	CompletedAt    *time.Time     `gorm:"type:timestamp" json:"completed_at,omitempty"`
	AssignedTo     datatypes.JSON `gorm:"type:jsonb" json:"assigned_to,omitempty"` // Array of usernames
	CreatedBy      string         `gorm:"type:varchar(50);not null" json:"created_by"`
	Tags           datatypes.JSON `gorm:"type:jsonb" json:"tags,omitempty"`
	Metadata       datatypes.JSON `gorm:"type:jsonb" json:"metadata,omitempty"`
	CreatedAt      time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt      time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Subtasks         []Subtask         `gorm:"foreignKey:ParentTaskID;constraint:OnDelete:CASCADE" json:"subtasks,omitempty"`
	LearningResources []LearningResource `gorm:"foreignKey:TaskID;constraint:OnDelete:CASCADE" json:"learning_resources,omitempty"`
}

// Subtask represents a sub-task within a main task
type Subtask struct {
	ID           string         `gorm:"type:varchar(50);primaryKey" json:"id"`
	ParentTaskID string         `gorm:"type:varchar(50);not null;index" json:"parent_task_id"`
	Title        string         `gorm:"type:varchar(255);not null" json:"title"`
	Description  string         `gorm:"type:text" json:"description"`
	Status       string         `gorm:"type:varchar(50);not null;default:'todo'" json:"status"`
	AssignedTo   datatypes.JSON `gorm:"type:jsonb" json:"assigned_to,omitempty"` // Array of usernames
	DueDate      *time.Time     `gorm:"type:timestamp" json:"due_date,omitempty"`
	CompletedAt  *time.Time     `gorm:"type:timestamp" json:"completed_at,omitempty"`
	CreatedAt    time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

// LearningResource represents a learning resource for a task
type LearningResource struct {
	ID                   string         `gorm:"type:varchar(50);primaryKey" json:"id"`
	TaskID               string         `gorm:"type:varchar(50);not null;index" json:"task_id"`
	Title                string         `gorm:"type:varchar(255);not null" json:"title"`
	Type                 string         `gorm:"type:varchar(50);not null" json:"type"` // video, article, book, course, documentation, practice
	URL                  string         `gorm:"type:text" json:"url,omitempty"`
	Description          string         `gorm:"type:text" json:"description,omitempty"`
	Status               string         `gorm:"type:varchar(50);not null;default:'not_started'" json:"status"`
	Progress             int            `gorm:"type:int;default:0" json:"progress"`
	EstimatedTimeMinutes *int           `gorm:"type:int" json:"estimated_time_minutes,omitempty"`
	ActualTimeMinutes    *int           `gorm:"type:int" json:"actual_time_minutes,omitempty"`
	Notes                string         `gorm:"type:text" json:"notes,omitempty"`
	KeyTakeaways         datatypes.JSON `gorm:"type:jsonb" json:"key_takeaways,omitempty"`
	CompletedAt          *time.Time     `gorm:"type:timestamp" json:"completed_at,omitempty"`
	CreatedAt            time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt            time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt            gorm.DeletedAt `gorm:"index" json:"-"`
}

// TaskDependency represents a dependency between tasks
type TaskDependency struct {
	ID              int            `gorm:"primaryKey;autoIncrement" json:"id"`
	TaskID          string         `gorm:"type:varchar(50);not null;index" json:"task_id"`
	DependsOnTaskID string         `gorm:"type:varchar(50);not null;index" json:"depends_on_task_id"`
	CreatedAt       time.Time      `gorm:"autoCreateTime" json:"created_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName specifies the table name for Task
func (Task) TableName() string {
	return "tasks"
}

// MarshalJSON customizes JSON marshaling for Task to properly handle JSONB fields
func (t Task) MarshalJSON() ([]byte, error) {
	// Build response manually to avoid JSONB marshaling errors
	taskMap := map[string]interface{}{
		"id":              t.ID,
		"project_id":      t.ProjectID,
		"title":           t.Title,
		"description":     t.Description,
		"task_type":       t.TaskType,
		"status":          t.Status,
		"priority":        t.Priority,
		"progress":        t.Progress,
		"idea_node_id":    t.IdeaNodeID,
		"milestone_id":    t.MilestoneID,
		"section_id":      t.SectionID,
		"section_order":   t.SectionOrder,
		"parent_task_id":  t.ParentTaskID,
		"estimated_hours": t.EstimatedHours,
		"actual_hours":    t.ActualHours,
		"start_date":      t.StartDate,
		"due_date":        t.DueDate,
		"completed_at":    t.CompletedAt,
		"created_by":      t.CreatedBy,
		"created_at":      t.CreatedAt,
		"updated_at":      t.UpdatedAt,
	}

	// Handle assigned_to field - convert from JSONB to actual array
	if t.AssignedTo != nil && len(t.AssignedTo) > 0 {
		var assignedTo []string
		if err := json.Unmarshal(t.AssignedTo, &assignedTo); err == nil {
			taskMap["assigned_to"] = assignedTo
		} else {
			// Try unmarshaling as a single string (legacy data with quotes)
			var singleAssignee string
			if err := json.Unmarshal(t.AssignedTo, &singleAssignee); err == nil && singleAssignee != "" {
				taskMap["assigned_to"] = []string{singleAssignee}
			} else {
				// Handle raw string without quotes (e.g., stored as plain text 'asdf')
				rawValue := string(t.AssignedTo)
				if rawValue != "" && rawValue != "null" {
					taskMap["assigned_to"] = []string{rawValue}
				} else {
					taskMap["assigned_to"] = nil
				}
			}
		}
	} else {
		taskMap["assigned_to"] = nil
	}

	// Handle tags field
	if t.Tags != nil && len(t.Tags) > 0 {
		var tags []string
		if err := json.Unmarshal(t.Tags, &tags); err == nil {
			taskMap["tags"] = tags
		} else {
			taskMap["tags"] = nil
		}
	} else {
		taskMap["tags"] = nil
	}

	// Handle metadata field
	if t.Metadata != nil && len(t.Metadata) > 0 {
		var metadata map[string]interface{}
		if err := json.Unmarshal(t.Metadata, &metadata); err == nil {
			taskMap["metadata"] = metadata
		} else {
			taskMap["metadata"] = nil
		}
	} else {
		taskMap["metadata"] = nil
	}

	return json.Marshal(taskMap)
}

// TableName specifies the table name for Subtask
func (Subtask) TableName() string {
	return "subtasks"
}

// MarshalJSON customizes JSON marshaling for Subtask to properly handle JSONB fields
func (s Subtask) MarshalJSON() ([]byte, error) {
	// Build response manually to avoid JSONB marshaling errors
	subtaskMap := map[string]interface{}{
		"id":             s.ID,
		"parent_task_id": s.ParentTaskID,
		"title":          s.Title,
		"description":    s.Description,
		"status":         s.Status,
		"due_date":       s.DueDate,
		"completed_at":   s.CompletedAt,
		"created_at":     s.CreatedAt,
		"updated_at":     s.UpdatedAt,
	}

	// Handle assigned_to field - convert from JSONB to actual array
	if s.AssignedTo != nil && len(s.AssignedTo) > 0 {
		var assignedTo []string
		if err := json.Unmarshal(s.AssignedTo, &assignedTo); err == nil {
			subtaskMap["assigned_to"] = assignedTo
		} else {
			// Try unmarshaling as a single string (legacy data with quotes)
			var singleAssignee string
			if err := json.Unmarshal(s.AssignedTo, &singleAssignee); err == nil && singleAssignee != "" {
				subtaskMap["assigned_to"] = []string{singleAssignee}
			} else {
				// Handle raw string without quotes (e.g., stored as plain text 'asdf')
				rawValue := string(s.AssignedTo)
				if rawValue != "" && rawValue != "null" {
					subtaskMap["assigned_to"] = []string{rawValue}
				} else {
					subtaskMap["assigned_to"] = nil
				}
			}
		}
	} else {
		subtaskMap["assigned_to"] = nil
	}

	return json.Marshal(subtaskMap)
}

// TableName specifies the table name for LearningResource
func (LearningResource) TableName() string {
	return "learning_resources"
}

// TableName specifies the table name for TaskDependency
func (TaskDependency) TableName() string {
	return "task_dependencies"
}
