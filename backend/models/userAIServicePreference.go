package models

import (
	"time"
)

// AI Service Types - All AI-powered features in the application
const (
	ServiceCourseGeneration    = "course_generation"     // Learning path and course creation
	ServiceIdeaExpansion       = "idea_expansion"        // IdeaTree node expansion
	ServiceTaskGeneration      = "task_generation"       // Task suggestions and generation
	ServiceResearch            = "research"              // Research and web search
	ServiceAssistant           = "assistant"             // General AI assistant chat
	ServiceProjectDashboard    = "project_dashboard"     // Project insights and analytics
	ServiceNodeChat            = "node_chat"             // Chat with specific nodes
	ServiceCodeGeneration      = "code_generation"       // Code generation and review
	ServiceContentSuggestions  = "content_suggestions"   // Content and writing suggestions
	ServiceQuizGeneration      = "quiz_generation"       // Quiz and assessment creation
	ServiceSummarization       = "summarization"         // Document summarization
	ServiceTranslation         = "translation"           // Language translation
	ServicePersonalizedSuggestions = "personalized_suggestions" // Personalized recommendations
	ServiceActionExpansion     = "action_expansion"      // Action item expansion
	ServicePaperAnalysis       = "paper_analysis"        // Research paper analysis
)

// UserAIServicePreference stores user's preferred AI provider and model for each service
type UserAIServicePreference struct {
	ID          uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID      uint      `gorm:"not null;index:idx_user_service,unique" json:"user_id"`
	ServiceType string    `gorm:"type:varchar(50);not null;index:idx_user_service,unique" json:"service_type"`
	Provider    string    `gorm:"type:varchar(50);not null" json:"provider"`    // openai, anthropic, google, etc.
	Model       string    `gorm:"type:varchar(255);not null" json:"model"`      // gpt-4o, claude-3-5-sonnet, etc.
	IsEnabled   bool      `gorm:"default:true;not null" json:"is_enabled"`      // Whether this service is enabled for the user
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	User *User `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
}

// TableName specifies the table name
func (UserAIServicePreference) TableName() string {
	return "user_ai_service_preferences"
}

// AIServiceDefinition describes an AI service/feature
type AIServiceDefinition struct {
	ServiceType string `json:"service_type"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Category    string `json:"category"` // learning, project, content, code, etc.
	Icon        string `json:"icon"`     // Icon name for UI
}

// Available AI Services
var AIServices = []AIServiceDefinition{
	{
		ServiceType: ServiceCourseGeneration,
		Name:        "Course Generation",
		Description: "Generate comprehensive learning paths and courses with modules and lessons",
		Category:    "learning",
		Icon:        "school",
	},
	{
		ServiceType: ServiceIdeaExpansion,
		Name:        "Idea Expansion",
		Description: "Expand ideas into detailed plans and actionable components using IdeaTree",
		Category:    "project",
		Icon:        "lightbulb",
	},
	{
		ServiceType: ServiceTaskGeneration,
		Name:        "Task Generation",
		Description: "Generate specific, actionable tasks with deliverables and resources",
		Category:    "project",
		Icon:        "task",
	},
	{
		ServiceType: ServiceResearch,
		Name:        "Research Tools",
		Description: "Web search, information gathering, and research synthesis",
		Category:    "research",
		Icon:        "search",
	},
	{
		ServiceType: ServiceAssistant,
		Name:        "AI Assistant",
		Description: "General-purpose AI assistant for questions and conversations",
		Category:    "general",
		Icon:        "chat",
	},
	{
		ServiceType: ServiceProjectDashboard,
		Name:        "Project Dashboard",
		Description: "AI-powered insights, analytics, and recommendations for projects",
		Category:    "project",
		Icon:        "dashboard",
	},
	{
		ServiceType: ServiceNodeChat,
		Name:        "Node Chat",
		Description: "Chat with specific nodes to refine content and get suggestions",
		Category:    "content",
		Icon:        "forum",
	},
	{
		ServiceType: ServiceCodeGeneration,
		Name:        "Code Generation",
		Description: "Generate, review, and optimize code across languages",
		Category:    "code",
		Icon:        "code",
	},
	{
		ServiceType: ServiceContentSuggestions,
		Name:        "Content Suggestions",
		Description: "Smart suggestions for writing, editing, and content improvement",
		Category:    "content",
		Icon:        "auto_fix",
	},
	{
		ServiceType: ServiceQuizGeneration,
		Name:        "Quiz Generation",
		Description: "Create quizzes and assessments with questions and answers",
		Category:    "learning",
		Icon:        "quiz",
	},
	{
		ServiceType: ServiceSummarization,
		Name:        "Summarization",
		Description: "Summarize documents, articles, and long-form content",
		Category:    "content",
		Icon:        "summarize",
	},
	{
		ServiceType: ServiceTranslation,
		Name:        "Translation",
		Description: "Translate content between languages with context awareness",
		Category:    "general",
		Icon:        "translate",
	},
	{
		ServiceType: ServicePersonalizedSuggestions,
		Name:        "Personalized Suggestions",
		Description: "Get personalized recommendations based on your projects and preferences",
		Category:    "general",
		Icon:        "recommend",
	},
	{
		ServiceType: ServiceActionExpansion,
		Name:        "Action Expansion",
		Description: "Expand action items into detailed steps and sub-tasks",
		Category:    "project",
		Icon:        "checklist",
	},
	{
		ServiceType: ServicePaperAnalysis,
		Name:        "Paper Analysis",
		Description: "Analyze research papers and extract key insights",
		Category:    "research",
		Icon:        "article",
	},
}

// Request/Response DTOs

type UpdateAIServicePreferencesRequest struct {
	Preferences []AIServicePreferenceItem `json:"preferences" binding:"required"`
}

type AIServicePreferenceItem struct {
	ServiceType string `json:"service_type" binding:"required"`
	Provider    string `json:"provider" binding:"required"`
	Model       string `json:"model" binding:"required"`
	IsEnabled   bool   `json:"is_enabled"` // Optional, defaults to true if not provided
}

type AIServicePreferenceResponse struct {
	ServiceType string `json:"service_type"`
	Provider    string `json:"provider"`
	Model       string `json:"model"`
	IsEnabled   bool   `json:"is_enabled"`  // Whether service is enabled
	Name        string `json:"name"`        // Service display name
	Description string `json:"description"` // Service description
	Category    string `json:"category"`    // Service category
	Icon        string `json:"icon"`        // Icon name
}

type AIServicesListResponse struct {
	Services []AIServiceDefinition `json:"services"`
}

// Helper function to get service definition
func GetServiceDefinition(serviceType string) *AIServiceDefinition {
	for _, service := range AIServices {
		if service.ServiceType == serviceType {
			return &service
		}
	}
	return nil
}

// Default AI service preferences (used when user hasn't set preferences)
func GetDefaultServicePreferences() map[string]struct {
	Provider string
	Model    string
} {
	return map[string]struct {
		Provider string
		Model    string
	}{
		ServiceCourseGeneration:    {Provider: "openai", Model: "gpt-4o"},
		ServiceIdeaExpansion:       {Provider: "openai", Model: "gpt-4o"},
		ServiceTaskGeneration:      {Provider: "openai", Model: "gpt-4o-mini"},
		ServiceResearch:            {Provider: "anthropic", Model: "claude-3-5-sonnet-20241022"},
		ServiceAssistant:           {Provider: "openai", Model: "gpt-4o"},
		ServiceProjectDashboard:    {Provider: "openai", Model: "gpt-4o-mini"},
		ServiceNodeChat:            {Provider: "anthropic", Model: "claude-3-5-sonnet-20241022"},
		ServiceCodeGeneration:      {Provider: "anthropic", Model: "claude-3-5-sonnet-20241022"},
		ServiceContentSuggestions:  {Provider: "openai", Model: "gpt-4o"},
		ServiceQuizGeneration:      {Provider: "openai", Model: "gpt-4o-mini"},
		ServiceSummarization:       {Provider: "anthropic", Model: "claude-3-5-sonnet-20241022"},
		ServiceTranslation:         {Provider: "openai", Model: "gpt-4o"},
		ServicePersonalizedSuggestions: {Provider: "openai", Model: "gpt-4o"},
		ServiceActionExpansion:     {Provider: "openai", Model: "gpt-4o-mini"},
		ServicePaperAnalysis:       {Provider: "anthropic", Model: "claude-3-5-sonnet-20241022"},
	}
}
