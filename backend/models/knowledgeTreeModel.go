package models

import (
	"gorm.io/datatypes"
	"time"
)

// Domain represents the highest level of knowledge organization
type Domain struct {
	ID          int            `gorm:"primaryKey;autoIncrement" json:"id"`
	Name        string         `gorm:"uniqueIndex;not null;size:100" json:"name"`
	Description string         `gorm:"type:text" json:"description"`
	Topics      []Topic        `gorm:"foreignKey:DomainID;constraint:OnDelete:CASCADE" json:"topics,omitempty"`
	CreatedAt   time.Time      `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt   time.Time      `gorm:"autoUpdateTime" json:"updatedAt"`
}

func (Domain) TableName() string {
	return "domains"
}

// Topic represents a subject area within a domain (can be hierarchical)
type Topic struct {
	ID           int            `gorm:"primaryKey;autoIncrement" json:"id"`
	DomainID     int            `gorm:"not null;index;uniqueIndex:idx_domain_topic_name" json:"domainId"`
	Domain       *Domain        `gorm:"foreignKey:DomainID;constraint:OnDelete:CASCADE" json:"domain,omitempty"`
	Name         string         `gorm:"not null;size:200;uniqueIndex:idx_domain_topic_name" json:"name"`
	Description  string         `gorm:"type:text" json:"description"`
	ParentTopicID *int          `gorm:"index" json:"parentTopicId,omitempty"`
	ParentTopic  *Topic         `gorm:"foreignKey:ParentTopicID" json:"parentTopic,omitempty"`
	Children     []Topic        `gorm:"foreignKey:ParentTopicID" json:"children,omitempty"`
	Level        int            `gorm:"default:0" json:"level"`
	OrderIndex   *int           `json:"orderIndex,omitempty"`
	MetaData     datatypes.JSON `json:"metaData,omitempty"`
	Concepts     []KnowledgeConcept      `gorm:"foreignKey:TopicID;constraint:OnDelete:CASCADE" json:"concepts,omitempty"`
	CreatedAt    time.Time      `json:"createdAt"`
	UpdatedAt    time.Time      `json:"updatedAt"`
}

func (Topic) TableName() string {
	return "topics"
}

// KnowledgeConcept represents an atomic piece of knowledge within a topic
type KnowledgeConcept struct {
	ID               int                 `gorm:"primaryKey;autoIncrement" json:"id"`
	Name             string              `gorm:"not null;size:500" json:"name"`
	TopicID          *int                `gorm:"index" json:"topicId,omitempty"`
	Topic            *Topic              `gorm:"foreignKey:TopicID;constraint:OnDelete:CASCADE" json:"topic,omitempty"`
	Description      string              `gorm:"type:text" json:"description"`
	Summary          string              `gorm:"type:text" json:"summary"`
	IsAtomic         bool                `gorm:"default:true" json:"isAtomic"`
	ResourceCount    int                 `gorm:"default:0" json:"resourceCount"`
	Keywords         datatypes.JSON      `json:"keywords,omitempty"`
	Prerequisites    datatypes.JSON      `json:"prerequisites,omitempty"`
	LearningOutcomes datatypes.JSON      `json:"learningOutcomes,omitempty"`
	MetaData         datatypes.JSON      `json:"metaData,omitempty"`
	Verified         bool                `gorm:"default:false" json:"verified"`
	ConceptResources []ConceptResource   `gorm:"foreignKey:ConceptID;constraint:OnDelete:CASCADE" json:"resources,omitempty"`
	CreatedAt        time.Time           `json:"createdAt"`
	UpdatedAt        time.Time           `json:"updatedAt"`
}

func (KnowledgeConcept) TableName() string {
	return "concepts"
}

// ConceptResource represents resources linked to concepts
type ConceptResource struct {
	ID                   string         `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ConceptID            int            `gorm:"not null;index" json:"conceptId"`
	Concept              *KnowledgeConcept       `gorm:"foreignKey:ConceptID;constraint:OnDelete:CASCADE" json:"concept,omitempty"`
	Title                string         `gorm:"not null;size:500" json:"title"`
	Description          string         `gorm:"type:text" json:"description"`
	Content              string         `gorm:"type:text" json:"content,omitempty"`
	URL                  string         `gorm:"type:text" json:"url,omitempty"`
	ResourceType         string         `gorm:"size:50" json:"resourceType"` // video, article, tutorial, documentation, course, book, tool, example, exercise, reference
	ContentFormat        string         `gorm:"size:50" json:"contentFormat"` // url, inline, markdown, pdf, html
	MediaType            string         `gorm:"size:50" json:"mediaType"` // text, video, audio, interactive, mixed
	Language             string         `gorm:"size:10;default:'en'" json:"language"`
	IsFree               bool           `gorm:"default:true" json:"isFree"`
	RequiresRegistration bool           `gorm:"default:false" json:"requiresRegistration"`
	DifficultyLevel      string         `gorm:"size:20" json:"difficultyLevel"` // beginner, intermediate, advanced, all
	EstimatedMinutes     *int           `json:"estimatedMinutes,omitempty"`
	TargetAudience       string         `gorm:"size:100" json:"targetAudience,omitempty"`
	IsValid              bool           `gorm:"default:true" json:"isValid"`
	LastValidated        *time.Time     `json:"lastValidated,omitempty"`
	ValidationError      string         `gorm:"type:text" json:"validationError,omitempty"`
	QualityScore         *float32       `gorm:"type:decimal(3,2)" json:"qualityScore,omitempty"`
	RelevanceScore       *float32       `gorm:"type:decimal(3,2)" json:"relevanceScore,omitempty"`
	PopularityScore      *float32       `gorm:"type:decimal(3,2)" json:"popularityScore,omitempty"`
	SourcePlatform       string         `gorm:"size:50" json:"sourcePlatform,omitempty"`
	SourceRepo           string         `gorm:"size:255" json:"sourceRepo,omitempty"`
	SourceFile           string         `gorm:"size:500" json:"sourceFile,omitempty"`
	SourceLine           *int           `json:"sourceLine,omitempty"`
	Author               string         `gorm:"size:255" json:"author,omitempty"`
	ExtractedAt          time.Time      `json:"extractedAt"`
	ExtractionMethod     string         `gorm:"size:50" json:"extractionMethod,omitempty"` // manual, auto, llm, scraper
	LearningOutcomes     datatypes.JSON `json:"learningOutcomes,omitempty"`
	Prerequisites        datatypes.JSON `json:"prerequisites,omitempty"`
	MetaData             datatypes.JSON `json:"metaData,omitempty"`
	CreatedAt            time.Time      `json:"createdAt"`
	UpdatedAt            time.Time      `json:"updatedAt"`
}

func (ConceptResource) TableName() string {
	return "concept_resources"
}

// ConceptRelationship represents relationships between concepts
type ConceptRelationship struct {
	ID               int      `gorm:"primaryKey;autoIncrement" json:"id"`
	FromConceptID    int      `gorm:"not null;index" json:"fromConceptId"`
	ToConceptID      int      `gorm:"not null;index" json:"toConceptId"`
	RelationshipType string   `gorm:"size:50" json:"relationshipType"` // prerequisite, related, extends, implements
	Strength         *float32 `gorm:"type:decimal(3,2)" json:"strength,omitempty"`
	CreatedAt        time.Time `json:"createdAt"`
}

func (ConceptRelationship) TableName() string {
	return "concept_relationships"
}

// Request/Response models
type KnowledgeTreeRequest struct {
	DomainID  int    `json:"domainId,omitempty"`
	TopicID   int    `json:"topicId,omitempty"`
	ConceptID int    `json:"conceptId,omitempty"`
	Level     string `json:"level,omitempty"` // domain, topic, concept
}

type KnowledgeTreeResponse struct {
	Domain    *Domain           `json:"domain,omitempty"`
	Topics    []Topic           `json:"topics,omitempty"`
	Concepts  []KnowledgeConcept         `json:"concepts,omitempty"`
	Resources []ConceptResource `json:"resources,omitempty"`
	Message   string            `json:"message,omitempty"`
}