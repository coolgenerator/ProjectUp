package models

import (
	"time"
	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"
)

// ResourceType represents the type of resource
type ResourceType string

const (
	ResourceTypeLink  ResourceType = "link"
	ResourceTypeFile  ResourceType = "file"
	ResourceTypePaper ResourceType = "paper"
)

// UserTier represents the user's subscription tier
type UserTier string

const (
	UserTierFree    UserTier = "free"
	UserTierPremium UserTier = "premium"
)

// Resource represents a user's saved resource (web link, uploaded file, or paper)
type Resource struct {
	ID           string       `gorm:"type:varchar(36);primaryKey" json:"id" example:"550e8400-e29b-41d4-a716-446655440000"`
	UserID       uint         `gorm:"not null;index" json:"user_id" example:"1"`
	Type         ResourceType `gorm:"type:varchar(20);not null" json:"type" example:"link"`
	Title        string       `gorm:"type:varchar(500);not null" json:"title" example:"My Resource"`
	Description  *string      `gorm:"type:text" json:"description" example:"A helpful resource for the project"`
	URL          *string      `gorm:"type:varchar(500)" json:"url" example:"https://example.com/resource"`
	FileName     *string      `gorm:"type:varchar(255)" json:"file_name" example:"document.pdf"`
	FileSize     *int64       `gorm:"type:bigint" json:"file_size" example:"1048576"`
	FileType     *string      `gorm:"type:varchar(100)" json:"file_type" example:"application/pdf"`
	S3Key        *string      `gorm:"type:varchar(500)" json:"s3_key" example:"resources/user-1/file-123.pdf"`
	ThumbnailURL *string      `gorm:"type:varchar(500)" json:"thumbnail_url" example:"https://example.com/thumb.jpg"`
	Tags         pq.StringArray     `gorm:"type:text[]" json:"tags" example:"[\"research\", \"documentation\"]"`
	IsPublic     bool         `gorm:"default:false" json:"is_public" example:"false"`
	IsTrashed    bool         `gorm:"default:false;index" json:"is_trashed" example:"false"`
	TrashedAt    *time.Time   `gorm:"type:timestamp" json:"trashed_at,omitempty" example:"2024-02-16T12:34:56Z"`
	ProjectID    *uint        `gorm:"index" json:"project_id" example:"1"`
	
	// Paper-specific fields (only used when Type == ResourceTypePaper)
	Authors      *string      `gorm:"type:text" json:"authors,omitempty" example:"[\"John Doe\", \"Jane Smith\"]"`  // JSON array of authors
	Venue        *string      `gorm:"type:varchar(255)" json:"venue,omitempty" example:"Nature"`
	Year         *int         `gorm:"index" json:"year,omitempty" example:"2024"`
	Abstract     *string      `gorm:"type:text" json:"abstract,omitempty"`
	Citations    *int         `gorm:"default:0" json:"citations,omitempty" example:"10"`
	Category     *string      `gorm:"type:varchar(100)" json:"category,omitempty" example:"AI/ML"`
	DOI          *string      `gorm:"type:varchar(255)" json:"doi,omitempty" example:"10.1234/example"`
	ArxivID      *string      `gorm:"type:varchar(50)" json:"arxiv_id,omitempty" example:"2024.12345"`
	Keywords     *string      `gorm:"type:text" json:"keywords,omitempty"`
	PageCount    *int         `gorm:"default:0" json:"page_count,omitempty" example:"12"`
	Language     *string      `gorm:"type:varchar(10);default:'en'" json:"language,omitempty" example:"en"`
	ReadStatus   *string      `gorm:"type:varchar(20);default:'unread'" json:"read_status,omitempty" example:"unread"` // unread, reading, read
	Notes        *string      `gorm:"type:text" json:"notes,omitempty"`
	Rating       *int         `gorm:"default:0" json:"rating,omitempty" example:"5"` // 0-5 stars
	LastReadAt   *time.Time   `json:"last_read_at,omitempty"`
	
	CreatedAt    time.Time    `gorm:"type:timestamp;default:current_timestamp" json:"created_at" example:"2024-02-16T12:34:56Z"`
	UpdatedAt    time.Time    `gorm:"type:timestamp;default:current_timestamp" json:"updated_at" example:"2024-02-16T12:34:56Z"`

	// Relationships
	User    *User    `gorm:"foreignKey:UserID;references:ID" json:"user,omitempty"`
	Project *Project `gorm:"foreignKey:ProjectID;references:ProjectID" json:"project,omitempty"`
}

func (Resource) TableName() string {
	return "resources"
}

// BeforeCreate hook to generate UUID for new resources
func (r *Resource) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.New().String()
	}
	return nil
}

// ResourceQuota represents the user's resource usage and limits
type ResourceQuota struct {
	UserID         uint      `gorm:"primaryKey;foreignKey:UserID;references:ID" json:"user_id" example:"1"`
	UserTier       UserTier  `gorm:"type:varchar(20);default:'free'" json:"user_tier" example:"free"`
	FileCount      int       `gorm:"default:0" json:"file_count" example:"5"`
	MaxFileCount   int       `gorm:"default:20" json:"max_file_count" example:"20"`
	MaxFileSize    int64     `gorm:"default:10485760" json:"max_file_size" example:"10485760"`  // 10MB for free users
	TotalStorage   int64     `gorm:"default:0" json:"total_storage" example:"52428800"`
	MaxStorage     int64     `gorm:"default:209715200" json:"max_storage" example:"209715200"` // 200MB for free users
	UpdatedAt      time.Time `gorm:"type:timestamp;default:current_timestamp" json:"updated_at" example:"2024-02-16T12:34:56Z"`

	// Relationships
	User *User `gorm:"foreignKey:UserID;references:ID" json:"user,omitempty"`
}

func (ResourceQuota) TableName() string {
	return "resource_quotas"
}

// GetMaxFileSize returns the maximum file size based on user tier
func GetMaxFileSize(tier UserTier) int64 {
	switch tier {
	case UserTierPremium:
		return 52428800 // 50MB
	default:
		return 10485760 // 10MB
	}
}

// GetMaxFileCount returns the maximum file count based on user tier
func GetMaxFileCount(tier UserTier) int {
	switch tier {
	case UserTierPremium:
		return 100
	default:
		return 20
	}
}

// GetMaxStorage returns the maximum total storage based on user tier
func GetMaxStorage(tier UserTier) int64 {
	switch tier {
	case UserTierPremium:
		return 5368709120 // 5GB
	default:
		return 209715200 // 200MB
	}
}