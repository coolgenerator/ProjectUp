package models

import "time"

// AI Provider Constants
const (
	ProviderOpenAI       = "openai"
	ProviderAnthropic    = "anthropic"
	ProviderGoogle       = "google"
	ProviderVertexAI     = "vertex-ai"
	ProviderOpenRouter   = "openrouter"
	ProviderTogether     = "together"
	ProviderReplicate    = "replicate"
	ProviderCohere       = "cohere"
	ProviderGroq         = "groq"
	ProviderMistral      = "mistral"
	ProviderPerplexity   = "perplexity"
	ProviderAI21         = "ai21"
	ProviderHuggingFace  = "huggingface"
	ProviderAzureOpenAI  = "azure-openai"
	ProviderAWSBedrock   = "aws-bedrock"
	ProviderFireworks    = "fireworks"
	ProviderAnyscale     = "anyscale"
	ProviderDeepSeek     = "deepseek"
	ProviderDeepInfra    = "deepinfra"
	ProviderQwen         = "qwen"
	ProviderBaichuan     = "baichuan"
	ProviderMoonshot     = "moonshot"
	ProviderZhipu        = "zhipu"
	ProviderCustom       = "custom"
)

// UserAIAPIKey stores encrypted API keys for different AI providers
type UserAIAPIKey struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id" example:"1"`
	UserID    uint      `gorm:"not null;index" json:"user_id" example:"1"`                                                     // Foreign key to User
	Provider  string    `gorm:"type:varchar(50);not null" json:"provider" example:"openai"`                                    // AI provider: openai, anthropic, google, etc.
	APIKey    string    `gorm:"type:text;not null" json:"api_key,omitempty"`                                                   // Encrypted API key (omitted from JSON response for security)
	Model     *string   `gorm:"type:varchar(255)" json:"model,omitempty" example:"gpt-4"`                                      // Preferred model to use with this provider
	BaseURL   *string   `gorm:"type:varchar(255)" json:"base_url,omitempty" example:"https://api.openai.com"`                  // Optional custom base URL for the provider
	IsActive  bool      `gorm:"default:true" json:"is_active" example:"true"`                                                  // Whether this key is currently active
	CreatedAt time.Time `gorm:"type:timestamp;default:current_timestamp" json:"created_at" example:"2024-02-16T12:34:56Z"`     // Creation timestamp
	UpdatedAt time.Time `gorm:"type:timestamp;default:current_timestamp" json:"updated_at" example:"2024-02-16T12:34:56Z"`     // Update timestamp

	// Reference to User
	User *User `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
}

func (UserAIAPIKey) TableName() string {
	return "user_ai_api_keys"
}

// UserAIAPIKeyResponse is used for API responses to avoid exposing full API keys
type UserAIAPIKeyResponse struct {
	ID         uint      `json:"id" example:"1"`
	UserID     uint      `json:"user_id" example:"1"`
	Provider   string    `json:"provider" example:"openai"`
	Model      *string   `json:"model,omitempty" example:"gpt-4"`
	BaseURL    *string   `json:"base_url,omitempty" example:"https://api.openai.com"`
	IsActive   bool      `json:"is_active" example:"true"`
	KeyPreview string    `json:"key_preview" example:"sk-...xyz"`  // First few and last few characters of the key
	CreatedAt  time.Time `json:"created_at" example:"2024-02-16T12:34:56Z"`
	UpdatedAt  time.Time `json:"updated_at" example:"2024-02-16T12:34:56Z"`
}

// CreateUserAIAPIKeyRequest is used for creating a new API key
type CreateUserAIAPIKeyRequest struct {
	Provider string  `json:"provider" binding:"required" example:"openai"`
	APIKey   string  `json:"api_key" binding:"required" example:"sk-1234567890abcdef"`
	Model    *string `json:"model,omitempty" example:"gpt-4"`
	BaseURL  *string `json:"base_url,omitempty" example:"https://api.openai.com"`
	IsActive bool    `json:"is_active" example:"true"`
}

// UpdateUserAIAPIKeyRequest is used for updating an existing API key
type UpdateUserAIAPIKeyRequest struct {
	APIKey   *string `json:"api_key,omitempty" example:"sk-1234567890abcdef"`
	Model    *string `json:"model,omitempty" example:"gpt-4"`
	BaseURL  *string `json:"base_url,omitempty" example:"https://api.openai.com"`
	IsActive *bool   `json:"is_active,omitempty" example:"true"`
}
