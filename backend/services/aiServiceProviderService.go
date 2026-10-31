package services

import (
	"projectup/database"
	"projectup/models"
)

// ProviderInfo contains information about an available AI provider
type ProviderInfo struct {
	Value       string   `json:"value"`        // Provider identifier (e.g., "openai")
	Label       string   `json:"label"`        // Display name (e.g., "OpenAI")
	Models      []string `json:"models"`       // Available models
	Description string   `json:"description"`  // Provider description
	DefaultURL  string   `json:"default_url"`  // Default base URL
}

// GetAvailableProvidersForUser returns available providers based on user's tier
func GetAvailableProvidersForUser(userID uint) ([]ProviderInfo, error) {
	// Get user's subscription tier
	subscriptionService := NewSubscriptionService(database.DB)
	tier, err := subscriptionService.GetUserTier(userID)
	if err != nil {
		return nil, err
	}

	// Check if user is on free tier
	isFree := tier == models.TierFree

	if isFree {
		// Free users: return providers they have API keys for
		return getProvidersFromUserAPIKeys(userID)
	} else {
		// Paid users: return service-configured providers
		return getServiceConfiguredProviders(), nil
	}
}

// getProvidersFromUserAPIKeys gets providers that the user has configured API keys for
func getProvidersFromUserAPIKeys(userID uint) ([]ProviderInfo, error) {
	var apiKeys []models.UserAIAPIKey

	// Get all active API keys for user
	if err := database.DB.Where("user_id = ? AND is_active = ?", userID, true).
		Find(&apiKeys).Error; err != nil {
		return nil, err
	}

	// Build provider info from user's API keys
	providerMap := make(map[string]ProviderInfo)
	allProviders := getAllProviderDefinitions()

	for _, key := range apiKeys {
		// Find the provider definition
		for _, provider := range allProviders {
			if provider.Value == key.Provider {
				providerMap[key.Provider] = provider
				break
			}
		}
	}

	// Convert map to slice
	providers := make([]ProviderInfo, 0, len(providerMap))
	for _, provider := range providerMap {
		providers = append(providers, provider)
	}

	return providers, nil
}

// getServiceConfiguredProviders returns providers that the service has configured
// Currently only Gemini (via Vertex AI) is available
func getServiceConfiguredProviders() []ProviderInfo {
	return []ProviderInfo{
		{
			Value:       "google",
			Label:       "Google AI (Gemini)",
			Description: "Service-managed Gemini models via Vertex AI",
			DefaultURL:  "https://generativelanguage.googleapis.com/v1",
			Models: []string{
				"gemini-2.5-pro-preview",
				"gemini-2.5-flash-preview",
				"gemini-2.0-flash-exp",
				"gemini-1.5-pro",
				"gemini-1.5-flash",
			},
		},
		// Add more service-configured providers here as they become available
	}
}

// getAllProviderDefinitions returns all possible provider definitions
func getAllProviderDefinitions() []ProviderInfo {
	return []ProviderInfo{
		{
			Value:       "openai",
			Label:       "OpenAI",
			DefaultURL:  "https://api.openai.com/v1",
			Description: "GPT-4, GPT-3.5, and more",
			Models:      []string{"gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo", "o1-preview", "o1-mini"},
		},
		{
			Value:       "anthropic",
			Label:       "Anthropic",
			DefaultURL:  "https://api.anthropic.com/v1",
			Description: "Claude models",
			Models:      []string{"claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"},
		},
		{
			Value:       "google",
			Label:       "Google AI",
			DefaultURL:  "https://generativelanguage.googleapis.com/v1",
			Description: "Gemini models",
			Models:      []string{"gemini-2.5-pro-preview", "gemini-2.5-flash-preview", "gemini-2.0-flash-exp", "gemini-1.5-pro", "gemini-1.5-flash"},
		},
		{
			Value:       "groq",
			Label:       "Groq",
			DefaultURL:  "https://api.groq.com/openai/v1",
			Description: "Fast inference with Llama models",
			Models:      []string{"llama-3.3-70b-versatile", "llama-3.1-70b-versatile", "mixtral-8x7b-32768"},
		},
		{
			Value:       "deepseek",
			Label:       "DeepSeek",
			DefaultURL:  "https://api.deepseek.com/v1",
			Description: "DeepSeek reasoning models",
			Models:      []string{"deepseek-chat", "deepseek-reasoner"},
		},
		{
			Value:       "mistral",
			Label:       "Mistral AI",
			DefaultURL:  "https://api.mistral.ai/v1",
			Description: "Mistral models",
			Models:      []string{"mistral-large-latest", "mistral-medium-latest", "mistral-small-latest"},
		},
	}
}
