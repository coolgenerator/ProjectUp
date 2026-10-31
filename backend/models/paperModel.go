package models

import (
	"time"

	"gorm.io/gorm"
)

// Paper represents an academic paper
type Paper struct {
	ID          string         `gorm:"primaryKey;type:varchar(36)" json:"id"`
	UserID      uint           `gorm:"not null;index" json:"user_id"`
	Title       string         `gorm:"type:varchar(500);not null" json:"title"`
	Authors     string         `gorm:"type:text" json:"authors"` // JSON array of authors
	Venue       string         `gorm:"type:varchar(255)" json:"venue"`
	Year        int            `gorm:"index" json:"year"`
	Abstract    string         `gorm:"type:text" json:"abstract"`
	FileURL     string         `gorm:"type:text" json:"file_url"`
	FileSize    int64          `gorm:"type:bigint;default:0" json:"file_size"`
	S3Key       string         `gorm:"type:varchar(500)" json:"s3_key"`
	ThumbnailURL string        `gorm:"type:text" json:"thumbnail_url"`
	Citations   int            `gorm:"default:0" json:"citations"`
	Tags        string         `gorm:"type:text" json:"tags"` // Comma-separated tags
	Category    string         `gorm:"type:varchar(100)" json:"category"`
	DOI         string         `gorm:"type:varchar(255)" json:"doi"`
	ArxivID     string         `gorm:"type:varchar(50)" json:"arxiv_id"`
	Keywords    string         `gorm:"type:text" json:"keywords"`
	PageCount   int            `gorm:"default:0" json:"page_count"`
	Language    string         `gorm:"type:varchar(10);default:'en'" json:"language"`
	IsPublic    bool           `gorm:"default:false" json:"is_public"`
	ReadStatus  string         `gorm:"type:varchar(20);default:'unread'" json:"read_status"` // unread, reading, read
	Notes       string         `gorm:"type:text" json:"notes"`
	Rating      int            `gorm:"default:0" json:"rating"` // 0-5 stars
	LastReadAt  *time.Time     `json:"last_read_at"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	User        *User               `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Annotations []PaperAnnotation   `gorm:"foreignKey:PaperID" json:"annotations,omitempty"`
	Analysis    *PaperAnalysis      `gorm:"foreignKey:PaperID" json:"analysis,omitempty"`
}

// TableName overrides the table name
func (Paper) TableName() string {
	return "papers"
}

// PaperAnnotation represents annotations on a paper
type PaperAnnotation struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	PaperID   string         `gorm:"type:varchar(36);not null;index" json:"paper_id"`
	UserID    uint           `gorm:"not null;index" json:"user_id"`
	Type      string         `gorm:"type:varchar(20);not null" json:"type"` // highlight, note, question
	Page      int            `gorm:"not null" json:"page"`
	Position  string         `gorm:"type:json" json:"position"` // JSON with x, y, width, height
	Content   string         `gorm:"type:text" json:"content"`
	Color     string         `gorm:"type:varchar(20)" json:"color"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Paper *Paper `gorm:"foreignKey:PaperID" json:"paper,omitempty"`
	User  *User  `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// TableName overrides the table name
func (PaperAnnotation) TableName() string {
	return "paper_annotations"
}


// PaperChatMessage represents chat messages about a paper
type PaperChatMessage struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	PaperID   string         `gorm:"type:varchar(36);not null;index" json:"paper_id"`
	UserID    uint           `gorm:"not null;index" json:"user_id"`
	Role      string         `gorm:"type:varchar(20);not null" json:"role"` // user, assistant
	Content   string         `gorm:"type:text;not null" json:"content"`
	Context   string         `gorm:"type:text" json:"context"` // Selected text or other context
	CreatedAt time.Time      `json:"created_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Paper *Paper `gorm:"foreignKey:PaperID" json:"paper,omitempty"`
	User  *User  `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// TableName overrides the table name
func (PaperChatMessage) TableName() string {
	return "paper_chat_messages"
}

// PaperCollection represents a collection of papers
type PaperCollection struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	UserID      uint           `gorm:"not null;index" json:"user_id"`
	Name        string         `gorm:"type:varchar(255);not null" json:"name"`
	Description string         `gorm:"type:text" json:"description"`
	Icon        string         `gorm:"type:varchar(50)" json:"icon"`
	Color       string         `gorm:"type:varchar(20)" json:"color"`
	IsPublic    bool           `gorm:"default:false" json:"is_public"`
	PaperCount  int            `gorm:"default:0" json:"paper_count"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	User   *User                    `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Papers []PaperCollectionMapping `gorm:"foreignKey:CollectionID" json:"papers,omitempty"`
}

// TableName overrides the table name
func (PaperCollection) TableName() string {
	return "paper_collections"
}

// PaperCollectionMapping represents the many-to-many relationship between papers and collections
type PaperCollectionMapping struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	CollectionID uint      `gorm:"not null;index" json:"collection_id"`
	PaperID      string    `gorm:"type:varchar(36);not null;index" json:"paper_id"`
	AddedAt      time.Time `json:"added_at"`

	// Relations
	Collection *PaperCollection `gorm:"foreignKey:CollectionID" json:"collection,omitempty"`
	Paper      *Paper          `gorm:"foreignKey:PaperID" json:"paper,omitempty"`
}

// TableName overrides the table name
func (PaperCollectionMapping) TableName() string {
	return "paper_collection_mappings"
}

// PaperRequest represents the request to upload/create a paper
type PaperRequest struct {
	Title    string   `json:"title" binding:"required"`
	Authors  []string `json:"authors"`
	Venue    string   `json:"venue"`
	Year     int      `json:"year"`
	Abstract string   `json:"abstract"`
	FileURL  string   `json:"file_url"`
	Tags     []string `json:"tags"`
	Category string   `json:"category"`
	DOI      string   `json:"doi"`
	ArxivID  string   `json:"arxiv_id"`
}

// PaperChatRequest represents a chat request about a paper
type PaperChatRequest struct {
	Message string `json:"message" binding:"required"`
	Context string `json:"context"` // Optional selected text or other context
}

// PaperAnalysisResponse represents the analysis response
type PaperAnalysisResponse struct {
	Summary           string   `json:"summary"`
	KeyInsights       []string `json:"key_insights"`
	Contributions     []string `json:"contributions"`
	TechnicalApproach string   `json:"technical_approach"`
	ResultsSummary    string   `json:"results_summary"`
	Limitations       []string `json:"limitations"`
	Prerequisites     []string `json:"prerequisites"`
	InnovationScore   float64  `json:"innovation_score"`
	Difficulty        string   `json:"difficulty"`
	Reproducibility   string   `json:"reproducibility"`
	Impact            string   `json:"impact"`
}

// ChatHistory stores paper chat history
type ChatHistory struct {
	ID        string    `json:"id" gorm:"type:uuid;primary_key"`
	UserID    uint      `json:"user_id" gorm:"not null"`
	PaperID   string    `json:"paper_id" gorm:"type:uuid;not null"`
	Message   string    `json:"message" gorm:"type:text"`
	Response  string    `json:"response" gorm:"type:text"`
	Context   string    `json:"context" gorm:"type:text"`
	CreatedAt time.Time `json:"created_at"`
}

// TableName specifies table name for ChatHistory
func (ChatHistory) TableName() string {
	return "chat_histories"
}

// PaperAnalysis stores AI analysis results
type PaperAnalysis struct {
	ID           string    `json:"id" gorm:"type:uuid;primary_key"`
	PaperID      string    `json:"paper_id" gorm:"type:uuid;not null;uniqueIndex"`
	UserID       uint      `json:"user_id" gorm:"not null"`
	AnalysisData string    `json:"analysis_data" gorm:"type:jsonb"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// TableName specifies table name for PaperAnalysis
func (PaperAnalysis) TableName() string {
	return "paper_analyses"
}

// PaperNote stores user notes on papers
type PaperNote struct {
	ID        string         `json:"id" gorm:"type:uuid;primary_key"`
	PaperID   string         `json:"paper_id" gorm:"type:uuid;not null;index"`
	UserID    uint           `json:"user_id" gorm:"not null;index"`
	Page      int            `json:"page"`
	Content   string         `json:"content" gorm:"type:text"`
	Type      string         `json:"type"` // general, highlight, question
	Position  string         `json:"position" gorm:"type:jsonb"` // Store position data as JSON
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"deleted_at" gorm:"index"`
}

// TableName specifies table name for PaperNote
func (PaperNote) TableName() string {
	return "paper_notes"
}

// PaperOutlineCache caches extracted outlines
type PaperOutlineCache struct {
	ID          string    `json:"id" gorm:"type:uuid;primary_key"`
	PaperID     string    `json:"paper_id" gorm:"type:uuid;not null;uniqueIndex"`
	OutlineData string    `json:"outline_data" gorm:"type:jsonb"`
	CreatedAt   time.Time `json:"created_at"`
	ExpiresAt   time.Time `json:"expires_at"`
}

// TableName specifies table name for PaperOutlineCache
func (PaperOutlineCache) TableName() string {
	return "paper_outline_cache"
}

// PaperReferencesCache caches extracted references
type PaperReferencesCache struct {
	ID             string    `json:"id" gorm:"type:uuid;primary_key"`
	PaperID        string    `json:"paper_id" gorm:"type:uuid;not null;uniqueIndex"`
	ReferencesData string    `json:"references_data" gorm:"type:jsonb"`
	CreatedAt      time.Time `json:"created_at"`
	ExpiresAt      time.Time `json:"expires_at"`
}

// TableName specifies table name for PaperReferencesCache
func (PaperReferencesCache) TableName() string {
	return "paper_references_cache"
}