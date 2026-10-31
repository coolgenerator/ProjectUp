package models

import (
	"gorm.io/datatypes"
	"gorm.io/gorm"
	"time"
)

type LearningPath struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	ShortID        string         `gorm:"column:short_id;uniqueIndex" json:"shortId"` // Short ID for legacy compatibility
	UserID         uint           `gorm:"column:user_id" json:"userId"`
	User           User           `gorm:"foreignKey:UserID" json:"user,omitempty"`
	TopicID        string         `gorm:"column:topic_id;uniqueIndex" json:"topicId"` // AI service UUID, used for URLs
	TopicName      string         `gorm:"column:topic_name" json:"topicName"`
	Title          string         `json:"title"`
	Description    string         `json:"description"`
	Category       string         `json:"category"` // Programming, Design, Business, Marketing, Data Science, etc.
	IsPublic       bool           `gorm:"default:false" json:"isPublic"` // Whether course is publicly visible
	Duration       string         `json:"duration"`
	Difficulty     string         `json:"difficulty"`
	LearningGoals  string         `json:"learningGoals"`
	EstimatedWeeks int            `json:"estimatedWeeks"`
	Prerequisites  datatypes.JSON `json:"prerequisites"`
	Modules        []LearningModule `gorm:"foreignKey:LearningPathID" json:"modules"`
	Progress       float32        `json:"progress"`
	Status         string         `gorm:"default:'ready'" json:"status"` // generating, ready, failed

	// Stats and references
	OriginalCourseID *uint  `gorm:"column:original_course_id" json:"originalCourseId,omitempty"` // Reference to original if copied
	ViewCount        int    `gorm:"column:view_count;default:0" json:"viewCount"`
	CopyCount        int    `gorm:"column:copy_count;default:0" json:"copyCount"`
	LikeCount        int    `gorm:"column:like_count;default:0" json:"likeCount"`
	IsLiked          bool   `gorm:"-" json:"isLiked"` // Not stored in DB, computed per request

	StartedAt      *time.Time     `json:"startedAt"`
	CompletedAt    *time.Time     `json:"completedAt"`
	CreatedAt      time.Time      `json:"createdAt"`
	UpdatedAt      time.Time      `json:"updatedAt"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"deletedAt,omitempty"`
}

func (LearningPath) TableName() string {
	return "learning_paths"
}

type LearningModule struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	LearningPathID uint           `json:"learningPathId"`
	LearningPath   LearningPath   `gorm:"foreignKey:LearningPathID" json:"learningPath,omitempty"`
	Title          string         `json:"title"`
	Description    string         `json:"description"`
	Duration       string         `json:"duration"`
	OrderIndex     int            `json:"orderIndex"`
	Resources      datatypes.JSON `json:"resources"`
	Tasks          []LearningTask `gorm:"foreignKey:ModuleID" json:"tasks"`
	Completed      bool           `json:"completed"`
	CompletedAt    *time.Time     `json:"completedAt"`
	CreatedAt      time.Time      `json:"createdAt"`
	UpdatedAt      time.Time      `json:"updatedAt"`
}

func (LearningModule) TableName() string {
	return "learning_modules"
}

type LearningTask struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	ModuleID    uint           `json:"moduleId"`
	Module      LearningModule `gorm:"foreignKey:ModuleID" json:"module,omitempty"`
	Title       string         `json:"title"`
	Description string         `json:"description"`
	Difficulty  string         `json:"difficulty"`
	OrderIndex  int            `json:"orderIndex"`
	Completed   bool           `json:"completed"`
	CompletedAt *time.Time     `json:"completedAt"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
}

func (LearningTask) TableName() string {
	return "learning_tasks"
}

type LearningPathResource struct {
	Title       string  `json:"title"`
	URL         string  `json:"url"`
	Type        string  `json:"type"` // video, article, course, book, tutorial, documentation
	Provider    string  `json:"provider"` // coursera, udemy, youtube, medium, etc.
	Difficulty  string  `json:"difficulty"`
	Duration    string  `json:"duration,omitempty"`
	Cost        string  `json:"cost,omitempty"`
	Description string  `json:"description,omitempty"`
	Rating      float32 `json:"rating,omitempty"`
}

type LearningPathRequest struct {
	TopicID               string                 `json:"topicId" binding:"required"`
	TopicName             string                 `json:"topicName" binding:"required"`
	UserBackground        string                 `json:"userBackground"`
	LearningGoals         string                 `json:"learningGoals"`
	Difficulty            string                 `json:"difficulty"`
	EstimatedWeeks        int                    `json:"estimatedWeeks"`
	Description           string                 `json:"description"`
	Category              string                 `json:"category"`
	IsPublic              bool                   `json:"isPublic"`
	Topics                []string               `json:"topics"`
	Skills                []map[string]interface{} `json:"skills"`
	Interests             []map[string]interface{} `json:"interests"`
	PreferredLearningStyle string                 `json:"preferredLearningStyle"`
	TimeCommitment        int                    `json:"timeCommitment"`
	UserID                uint                   `json:"userId"`
}

type LearningPathResponse struct {
	LearningPath *LearningPath `json:"learning_path"`
	Message      string        `json:"message"`
}