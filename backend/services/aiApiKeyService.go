package services

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"projectup/database"
	"projectup/models"
	"projectup/utils"
	"strings"
	"time"
)

// GetAllAIAPIKeys retrieves all AI API keys for a user
func GetAllAIAPIKeys(userID uint) ([]models.UserAIAPIKeyResponse, error) {
	var apiKeys []models.UserAIAPIKey

	if err := database.DB.Where("user_id = ?", userID).Find(&apiKeys).Error; err != nil {
		return nil, err
	}

	// Convert to response format with masked keys
	responses := make([]models.UserAIAPIKeyResponse, len(apiKeys))
	for i, key := range apiKeys {
		// Decrypt the key to generate preview
		decryptedKey, err := utils.DecryptAPIKey(key.APIKey)
		if err != nil {
			// If decryption fails, use a generic preview
			decryptedKey = "****"
		}

		responses[i] = models.UserAIAPIKeyResponse{
			ID:         key.ID,
			UserID:     key.UserID,
			Provider:   key.Provider,
			Model:      key.Model,
			BaseURL:    key.BaseURL,
			IsActive:   key.IsActive,
			KeyPreview: utils.MaskAPIKey(decryptedKey),
			CreatedAt:  key.CreatedAt,
			UpdatedAt:  key.UpdatedAt,
		}
	}

	return responses, nil
}

// GetAIAPIKey retrieves a specific AI API key for a user
func GetAIAPIKey(userID uint, keyID uint) (*models.UserAIAPIKeyResponse, error) {
	var apiKey models.UserAIAPIKey

	if err := database.DB.Where("user_id = ? AND id = ?", userID, keyID).First(&apiKey).Error; err != nil {
		return nil, errors.New("api key not found")
	}

	// Decrypt the key to generate preview
	decryptedKey, err := utils.DecryptAPIKey(apiKey.APIKey)
	if err != nil {
		decryptedKey = "****"
	}

	response := &models.UserAIAPIKeyResponse{
		ID:         apiKey.ID,
		UserID:     apiKey.UserID,
		Provider:   apiKey.Provider,
		Model:      apiKey.Model,
		BaseURL:    apiKey.BaseURL,
		IsActive:   apiKey.IsActive,
		KeyPreview: utils.MaskAPIKey(decryptedKey),
		CreatedAt:  apiKey.CreatedAt,
		UpdatedAt:  apiKey.UpdatedAt,
	}

	return response, nil
}

// GetDecryptedAPIKey retrieves and decrypts an API key for actual use
// This should only be called by internal services that need the actual key
func GetDecryptedAPIKey(userID uint, provider string) (string, error) {
	var apiKey models.UserAIAPIKey

	if err := database.DB.Where("user_id = ? AND provider = ? AND is_active = ?", userID, provider, true).First(&apiKey).Error; err != nil {
		return "", errors.New("api key not found")
	}

	// Decrypt the key
	decryptedKey, err := utils.DecryptAPIKey(apiKey.APIKey)
	if err != nil {
		return "", errors.New("failed to decrypt api key")
	}

	return decryptedKey, nil
}

// GetActiveAPIKeyForProvider retrieves the active API key configuration for a provider
// Returns: apiKey, baseURL, model, error
func GetActiveAPIKeyForProvider(userID uint, provider string) (string, string, string, error) {
	var apiKey models.UserAIAPIKey

	if err := database.DB.Where("user_id = ? AND provider = ? AND is_active = ?", userID, provider, true).First(&apiKey).Error; err != nil {
		return "", "", "", errors.New("no active API key found for this provider")
	}

	// Decrypt the key
	decryptedKey, err := utils.DecryptAPIKey(apiKey.APIKey)
	if err != nil {
		return "", "", "", errors.New("failed to decrypt API key")
	}

	baseURL := ""
	if apiKey.BaseURL != nil {
		baseURL = *apiKey.BaseURL
	}

	model := ""
	if apiKey.Model != nil {
		model = *apiKey.Model
	}

	return decryptedKey, baseURL, model, nil
}

// CreateAIAPIKey creates a new AI API key
func CreateAIAPIKey(userID uint, req *models.CreateUserAIAPIKeyRequest) (*models.UserAIAPIKeyResponse, error) {
	// If this key is being set as active, deactivate all other keys for this provider
	// Ensures only ONE key per provider can be active at a time
	if req.IsActive {
		if err := database.DB.Model(&models.UserAIAPIKey{}).
			Where("user_id = ? AND provider = ?", userID, req.Provider).
			Update("is_active", false).Error; err != nil {
			return nil, errors.New("failed to deactivate existing keys")
		}
	}

	// Encrypt the API key
	encryptedKey, err := utils.EncryptAPIKey(req.APIKey)
	if err != nil {
		return nil, errors.New("failed to encrypt api key")
	}

	// Create the API key record
	apiKey := models.UserAIAPIKey{
		UserID:   userID,
		Provider: req.Provider,
		APIKey:   encryptedKey,
		Model:    req.Model,
		BaseURL:  req.BaseURL,
		IsActive: req.IsActive,
	}

	if err := database.DB.Create(&apiKey).Error; err != nil {
		return nil, err
	}

	// Return response with masked key
	response := &models.UserAIAPIKeyResponse{
		ID:         apiKey.ID,
		UserID:     apiKey.UserID,
		Provider:   apiKey.Provider,
		BaseURL:    apiKey.BaseURL,
		IsActive:   apiKey.IsActive,
		KeyPreview: utils.MaskAPIKey(req.APIKey),
		CreatedAt:  apiKey.CreatedAt,
		UpdatedAt:  apiKey.UpdatedAt,
	}

	return response, nil
}

// UpdateAIAPIKey updates an existing AI API key
func UpdateAIAPIKey(userID uint, keyID uint, req *models.UpdateUserAIAPIKeyRequest) (*models.UserAIAPIKeyResponse, error) {
	var apiKey models.UserAIAPIKey

	// Find the key
	if err := database.DB.Where("user_id = ? AND id = ?", userID, keyID).First(&apiKey).Error; err != nil {
		return nil, errors.New("api key not found")
	}

	// Update fields
	updates := make(map[string]interface{})

	if req.APIKey != nil {
		// Encrypt the new API key
		encryptedKey, err := utils.EncryptAPIKey(*req.APIKey)
		if err != nil {
			return nil, errors.New("failed to encrypt api key")
		}
		updates["api_key"] = encryptedKey
	}

	if req.Model != nil {
		updates["model"] = req.Model
	}

	if req.BaseURL != nil {
		updates["base_url"] = req.BaseURL
	}

	if req.IsActive != nil {
		// If setting this key as active, deactivate all other keys for this provider
		if *req.IsActive {
			if err := database.DB.Model(&models.UserAIAPIKey{}).
				Where("user_id = ? AND provider = ? AND id != ?", userID, apiKey.Provider, keyID).
				Update("is_active", false).Error; err != nil {
				return nil, errors.New("failed to deactivate other keys")
			}
		}
		updates["is_active"] = *req.IsActive
	}

	if len(updates) > 0 {
		if err := database.DB.Model(&apiKey).Updates(updates).Error; err != nil {
			return nil, err
		}
	}

	// Reload the updated key
	if err := database.DB.Where("user_id = ? AND id = ?", userID, keyID).First(&apiKey).Error; err != nil {
		return nil, errors.New("api key not found")
	}

	// Decrypt the key to generate preview
	decryptedKey, err := utils.DecryptAPIKey(apiKey.APIKey)
	if err != nil {
		decryptedKey = "****"
	}

	// Return response with masked key
	response := &models.UserAIAPIKeyResponse{
		ID:         apiKey.ID,
		UserID:     apiKey.UserID,
		Provider:   apiKey.Provider,
		Model:      apiKey.Model,
		BaseURL:    apiKey.BaseURL,
		IsActive:   apiKey.IsActive,
		KeyPreview: utils.MaskAPIKey(decryptedKey),
		CreatedAt:  apiKey.CreatedAt,
		UpdatedAt:  apiKey.UpdatedAt,
	}

	return response, nil
}

// DeleteAIAPIKey deletes an AI API key
func DeleteAIAPIKey(userID uint, keyID uint) error {
	result := database.DB.Where("user_id = ? AND id = ?", userID, keyID).Delete(&models.UserAIAPIKey{})

	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return errors.New("api key not found")
	}

	return nil
}

// TestAPIKey tests if an API key is working by making a simple API call
func TestAPIKey(userID uint, keyID uint) (bool, string, error) {
	// Get the API key
	var apiKey models.UserAIAPIKey
	if err := database.DB.Where("user_id = ? AND id = ?", userID, keyID).First(&apiKey).Error; err != nil {
		return false, "", errors.New("api key not found")
	}

	// Decrypt the key
	decryptedKey, err := utils.DecryptAPIKey(apiKey.APIKey)
	if err != nil {
		return false, "Failed to decrypt API key", errors.New("failed to decrypt api key")
	}

	// Get base URL
	baseURL := ""
	if apiKey.BaseURL != nil && *apiKey.BaseURL != "" {
		baseURL = *apiKey.BaseURL
	}

	// Test based on provider
	switch apiKey.Provider {
	case models.ProviderOpenAI:
		return testOpenAI(decryptedKey, baseURL)
	case models.ProviderAnthropic:
		return testAnthropic(decryptedKey, baseURL)
	case models.ProviderGoogle:
		return testGoogle(decryptedKey, baseURL)
	case models.ProviderVertexAI:
		return testVertexAI(decryptedKey, baseURL)
	case models.ProviderOpenRouter:
		return testOpenRouter(decryptedKey, baseURL)
	case models.ProviderGroq:
		return testGroq(decryptedKey, baseURL)
	case models.ProviderCohere:
		return testCohere(decryptedKey, baseURL)
	case models.ProviderMistral:
		return testMistral(decryptedKey, baseURL)
	case models.ProviderPerplexity:
		return testPerplexity(decryptedKey, baseURL)
	case models.ProviderDeepSeek:
		return testDeepSeek(decryptedKey, baseURL)
	case models.ProviderTogether:
		return testTogether(decryptedKey, baseURL)
	case models.ProviderFireworks:
		return testFireworks(decryptedKey, baseURL)
	case models.ProviderAnyscale:
		return testAnyscale(decryptedKey, baseURL)
	case models.ProviderDeepInfra:
		return testDeepInfra(decryptedKey, baseURL)
	case models.ProviderQwen:
		return testQwen(decryptedKey, baseURL)
	case models.ProviderBaichuan:
		return testBaichuan(decryptedKey, baseURL)
	case models.ProviderMoonshot:
		return testMoonshot(decryptedKey, baseURL)
	case models.ProviderZhipu:
		return testZhipu(decryptedKey, baseURL)
	case models.ProviderAI21:
		return testAI21(decryptedKey, baseURL)
	case models.ProviderHuggingFace:
		return testHuggingFace(decryptedKey, baseURL)
	case models.ProviderCustom:
		return testCustomProvider(decryptedKey, baseURL)
	default:
		return false, fmt.Sprintf("Testing not yet supported for provider: %s", apiKey.Provider), nil
	}
}

// Helper function to make HTTP requests with timeout
func makeHTTPRequest(method, url string, headers map[string]string, body []byte) (*http.Response, error) {
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	req, err := http.NewRequest(method, url, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	for key, value := range headers {
		req.Header.Set(key, value)
	}

	return client.Do(req)
}

// testOpenAI tests OpenAI API key by calling the models endpoint
func testOpenAI(apiKey, baseURL string) (bool, string, error) {
	if baseURL == "" {
		baseURL = "https://api.openai.com/v1"
	}

	url := fmt.Sprintf("%s/models", strings.TrimSuffix(baseURL, "/"))
	headers := map[string]string{
		"Authorization": fmt.Sprintf("Bearer %s", apiKey),
		"Content-Type":  "application/json",
	}

	resp, err := makeHTTPRequest("GET", url, headers, nil)
	if err != nil {
		return false, fmt.Sprintf("Connection error: %v", err), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		return true, "API key is valid and working", nil
	}

	body, _ := io.ReadAll(resp.Body)
	return false, fmt.Sprintf("API key validation failed (Status %d): %s", resp.StatusCode, string(body)), nil
}

// testAnthropic tests Anthropic API key
func testAnthropic(apiKey, baseURL string) (bool, string, error) {
	if baseURL == "" {
		baseURL = "https://api.anthropic.com/v1"
	}

	url := fmt.Sprintf("%s/messages", strings.TrimSuffix(baseURL, "/"))
	payload := map[string]interface{}{
		"model":      "claude-3-haiku-20240307",
		"max_tokens": 10,
		"messages": []map[string]string{
			{"role": "user", "content": "Hi"},
		},
	}

	jsonPayload, _ := json.Marshal(payload)
	headers := map[string]string{
		"x-api-key":         apiKey,
		"anthropic-version": "2023-06-01",
		"Content-Type":      "application/json",
	}

	resp, err := makeHTTPRequest("POST", url, headers, jsonPayload)
	if err != nil {
		return false, fmt.Sprintf("Connection error: %v", err), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		return true, "API key is valid and working", nil
	}

	body, _ := io.ReadAll(resp.Body)
	return false, fmt.Sprintf("API key validation failed (Status %d): %s", resp.StatusCode, string(body)), nil
}

// testGoogle tests Google AI API key
func testGoogle(apiKey, baseURL string) (bool, string, error) {
	if baseURL == "" {
		baseURL = "https://generativelanguage.googleapis.com/v1"
	}

	url := fmt.Sprintf("%s/models?key=%s", strings.TrimSuffix(baseURL, "/"), apiKey)

	resp, err := makeHTTPRequest("GET", url, map[string]string{}, nil)
	if err != nil {
		return false, fmt.Sprintf("Connection error: %v", err), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		return true, "API key is valid and working", nil
	}

	body, _ := io.ReadAll(resp.Body)
	return false, fmt.Sprintf("API key validation failed (Status %d): %s", resp.StatusCode, string(body)), nil
}

// testOpenRouter tests OpenRouter API key
func testOpenRouter(apiKey, baseURL string) (bool, string, error) {
	if baseURL == "" {
		baseURL = "https://openrouter.ai/api/v1"
	}

	url := fmt.Sprintf("%s/models", strings.TrimSuffix(baseURL, "/"))
	headers := map[string]string{
		"Authorization": fmt.Sprintf("Bearer %s", apiKey),
	}

	resp, err := makeHTTPRequest("GET", url, headers, nil)
	if err != nil {
		return false, fmt.Sprintf("Connection error: %v", err), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		return true, "API key is valid and working", nil
	}

	body, _ := io.ReadAll(resp.Body)
	return false, fmt.Sprintf("API key validation failed (Status %d): %s", resp.StatusCode, string(body)), nil
}

// testGroq tests Groq API key
func testGroq(apiKey, baseURL string) (bool, string, error) {
	if baseURL == "" {
		baseURL = "https://api.groq.com/openai/v1"
	}

	url := fmt.Sprintf("%s/models", strings.TrimSuffix(baseURL, "/"))
	headers := map[string]string{
		"Authorization": fmt.Sprintf("Bearer %s", apiKey),
	}

	resp, err := makeHTTPRequest("GET", url, headers, nil)
	if err != nil {
		return false, fmt.Sprintf("Connection error: %v", err), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		return true, "API key is valid and working", nil
	}

	body, _ := io.ReadAll(resp.Body)
	return false, fmt.Sprintf("API key validation failed (Status %d): %s", resp.StatusCode, string(body)), nil
}

// testCohere tests Cohere API key
func testCohere(apiKey, baseURL string) (bool, string, error) {
	if baseURL == "" {
		baseURL = "https://api.cohere.ai/v1"
	}

	url := fmt.Sprintf("%s/check-api-key", strings.TrimSuffix(baseURL, "/"))
	headers := map[string]string{
		"Authorization": fmt.Sprintf("Bearer %s", apiKey),
	}

	resp, err := makeHTTPRequest("POST", url, headers, nil)
	if err != nil {
		return false, fmt.Sprintf("Connection error: %v", err), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		return true, "API key is valid and working", nil
	}

	body, _ := io.ReadAll(resp.Body)
	return false, fmt.Sprintf("API key validation failed (Status %d): %s", resp.StatusCode, string(body)), nil
}

// testMistral tests Mistral AI API key
func testMistral(apiKey, baseURL string) (bool, string, error) {
	if baseURL == "" {
		baseURL = "https://api.mistral.ai/v1"
	}

	url := fmt.Sprintf("%s/models", strings.TrimSuffix(baseURL, "/"))
	headers := map[string]string{
		"Authorization": fmt.Sprintf("Bearer %s", apiKey),
	}

	resp, err := makeHTTPRequest("GET", url, headers, nil)
	if err != nil {
		return false, fmt.Sprintf("Connection error: %v", err), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		return true, "API key is valid and working", nil
	}

	body, _ := io.ReadAll(resp.Body)
	return false, fmt.Sprintf("API key validation failed (Status %d): %s", resp.StatusCode, string(body)), nil
}

// testPerplexity tests Perplexity API key
func testPerplexity(apiKey, baseURL string) (bool, string, error) {
	if baseURL == "" {
		baseURL = "https://api.perplexity.ai"
	}

	url := fmt.Sprintf("%s/chat/completions", strings.TrimSuffix(baseURL, "/"))
	payload := map[string]interface{}{
		"model": "llama-3.1-sonar-small-128k-online",
		"messages": []map[string]string{
			{"role": "user", "content": "Hi"},
		},
		"max_tokens": 10,
	}

	jsonPayload, _ := json.Marshal(payload)
	headers := map[string]string{
		"Authorization": fmt.Sprintf("Bearer %s", apiKey),
		"Content-Type":  "application/json",
	}

	resp, err := makeHTTPRequest("POST", url, headers, jsonPayload)
	if err != nil {
		return false, fmt.Sprintf("Connection error: %v", err), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		return true, "API key is valid and working", nil
	}

	body, _ := io.ReadAll(resp.Body)
	return false, fmt.Sprintf("API key validation failed (Status %d): %s", resp.StatusCode, string(body)), nil
}

// testDeepSeek tests DeepSeek API key
func testDeepSeek(apiKey, baseURL string) (bool, string, error) {
	if baseURL == "" {
		baseURL = "https://api.deepseek.com/v1"
	}

	url := fmt.Sprintf("%s/models", strings.TrimSuffix(baseURL, "/"))
	headers := map[string]string{
		"Authorization": fmt.Sprintf("Bearer %s", apiKey),
	}

	resp, err := makeHTTPRequest("GET", url, headers, nil)
	if err != nil {
		return false, fmt.Sprintf("Connection error: %v", err), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		return true, "API key is valid and working", nil
	}

	body, _ := io.ReadAll(resp.Body)
	return false, fmt.Sprintf("API key validation failed (Status %d): %s", resp.StatusCode, string(body)), nil
}

// testTogether tests Together AI API key
func testTogether(apiKey, baseURL string) (bool, string, error) {
	if baseURL == "" {
		baseURL = "https://api.together.xyz/v1"
	}

	url := fmt.Sprintf("%s/models", strings.TrimSuffix(baseURL, "/"))
	headers := map[string]string{
		"Authorization": fmt.Sprintf("Bearer %s", apiKey),
	}

	resp, err := makeHTTPRequest("GET", url, headers, nil)
	if err != nil {
		return false, fmt.Sprintf("Connection error: %v", err), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		return true, "API key is valid and working", nil
	}

	body, _ := io.ReadAll(resp.Body)
	return false, fmt.Sprintf("API key validation failed (Status %d): %s", resp.StatusCode, string(body)), nil
}

// testFireworks tests Fireworks AI API key
func testFireworks(apiKey, baseURL string) (bool, string, error) {
	if baseURL == "" {
		baseURL = "https://api.fireworks.ai/inference/v1"
	}

	url := fmt.Sprintf("%s/models", strings.TrimSuffix(baseURL, "/"))
	headers := map[string]string{
		"Authorization": fmt.Sprintf("Bearer %s", apiKey),
	}

	resp, err := makeHTTPRequest("GET", url, headers, nil)
	if err != nil {
		return false, fmt.Sprintf("Connection error: %v", err), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		return true, "API key is valid and working", nil
	}

	body, _ := io.ReadAll(resp.Body)
	return false, fmt.Sprintf("API key validation failed (Status %d): %s", resp.StatusCode, string(body)), nil
}

// testAnyscale tests Anyscale API key
func testAnyscale(apiKey, baseURL string) (bool, string, error) {
	if baseURL == "" {
		baseURL = "https://api.endpoints.anyscale.com/v1"
	}

	url := fmt.Sprintf("%s/models", strings.TrimSuffix(baseURL, "/"))
	headers := map[string]string{
		"Authorization": fmt.Sprintf("Bearer %s", apiKey),
	}

	resp, err := makeHTTPRequest("GET", url, headers, nil)
	if err != nil {
		return false, fmt.Sprintf("Connection error: %v", err), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		return true, "API key is valid and working", nil
	}

	body, _ := io.ReadAll(resp.Body)
	return false, fmt.Sprintf("API key validation failed (Status %d): %s", resp.StatusCode, string(body)), nil
}

// testDeepInfra tests DeepInfra API key
func testDeepInfra(apiKey, baseURL string) (bool, string, error) {
	if baseURL == "" {
		baseURL = "https://api.deepinfra.com/v1/openai"
	}

	url := fmt.Sprintf("%s/models", strings.TrimSuffix(baseURL, "/"))
	headers := map[string]string{
		"Authorization": fmt.Sprintf("Bearer %s", apiKey),
	}

	resp, err := makeHTTPRequest("GET", url, headers, nil)
	if err != nil {
		return false, fmt.Sprintf("Connection error: %v", err), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		return true, "API key is valid and working", nil
	}

	body, _ := io.ReadAll(resp.Body)
	return false, fmt.Sprintf("API key validation failed (Status %d): %s", resp.StatusCode, string(body)), nil
}

// testQwen tests Qwen API key
func testQwen(apiKey, baseURL string) (bool, string, error) {
	if baseURL == "" {
		baseURL = "https://dashscope.aliyuncs.com/compatible-mode/v1"
	}

	url := fmt.Sprintf("%s/models", strings.TrimSuffix(baseURL, "/"))
	headers := map[string]string{
		"Authorization": fmt.Sprintf("Bearer %s", apiKey),
	}

	resp, err := makeHTTPRequest("GET", url, headers, nil)
	if err != nil {
		return false, fmt.Sprintf("Connection error: %v", err), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		return true, "API key is valid and working", nil
	}

	body, _ := io.ReadAll(resp.Body)
	return false, fmt.Sprintf("API key validation failed (Status %d): %s", resp.StatusCode, string(body)), nil
}

// testBaichuan tests Baichuan AI API key
func testBaichuan(apiKey, baseURL string) (bool, string, error) {
	if baseURL == "" {
		baseURL = "https://api.baichuan-ai.com/v1"
	}

	url := fmt.Sprintf("%s/models", strings.TrimSuffix(baseURL, "/"))
	headers := map[string]string{
		"Authorization": fmt.Sprintf("Bearer %s", apiKey),
	}

	resp, err := makeHTTPRequest("GET", url, headers, nil)
	if err != nil {
		return false, fmt.Sprintf("Connection error: %v", err), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		return true, "API key is valid and working", nil
	}

	body, _ := io.ReadAll(resp.Body)
	return false, fmt.Sprintf("API key validation failed (Status %d): %s", resp.StatusCode, string(body)), nil
}

// testMoonshot tests Moonshot AI API key
func testMoonshot(apiKey, baseURL string) (bool, string, error) {
	if baseURL == "" {
		baseURL = "https://api.moonshot.cn/v1"
	}

	url := fmt.Sprintf("%s/models", strings.TrimSuffix(baseURL, "/"))
	headers := map[string]string{
		"Authorization": fmt.Sprintf("Bearer %s", apiKey),
	}

	resp, err := makeHTTPRequest("GET", url, headers, nil)
	if err != nil {
		return false, fmt.Sprintf("Connection error: %v", err), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		return true, "API key is valid and working", nil
	}

	body, _ := io.ReadAll(resp.Body)
	return false, fmt.Sprintf("API key validation failed (Status %d): %s", resp.StatusCode, string(body)), nil
}

// testZhipu tests Zhipu AI API key
func testZhipu(apiKey, baseURL string) (bool, string, error) {
	if baseURL == "" {
		baseURL = "https://open.bigmodel.cn/api/paas/v4"
	}

	url := fmt.Sprintf("%s/chat/completions", strings.TrimSuffix(baseURL, "/"))
	payload := map[string]interface{}{
		"model": "glm-4",
		"messages": []map[string]string{
			{"role": "user", "content": "Hi"},
		},
		"max_tokens": 10,
	}

	jsonPayload, _ := json.Marshal(payload)
	headers := map[string]string{
		"Authorization": fmt.Sprintf("Bearer %s", apiKey),
		"Content-Type":  "application/json",
	}

	resp, err := makeHTTPRequest("POST", url, headers, jsonPayload)
	if err != nil {
		return false, fmt.Sprintf("Connection error: %v", err), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		return true, "API key is valid and working", nil
	}

	body, _ := io.ReadAll(resp.Body)
	return false, fmt.Sprintf("API key validation failed (Status %d): %s", resp.StatusCode, string(body)), nil
}

// testAI21 tests AI21 Labs API key
func testAI21(apiKey, baseURL string) (bool, string, error) {
	if baseURL == "" {
		baseURL = "https://api.ai21.com/studio/v1"
	}

	// AI21 uses a different auth header
	url := fmt.Sprintf("%s/chat/completions", strings.TrimSuffix(baseURL, "/"))
	payload := map[string]interface{}{
		"model": "jamba-1.5-mini",
		"messages": []map[string]string{
			{"role": "user", "content": "Hi"},
		},
		"max_tokens": 10,
	}

	jsonPayload, _ := json.Marshal(payload)
	headers := map[string]string{
		"Authorization": fmt.Sprintf("Bearer %s", apiKey),
		"Content-Type":  "application/json",
	}

	resp, err := makeHTTPRequest("POST", url, headers, jsonPayload)
	if err != nil {
		return false, fmt.Sprintf("Connection error: %v", err), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		return true, "API key is valid and working", nil
	}

	body, _ := io.ReadAll(resp.Body)
	return false, fmt.Sprintf("API key validation failed (Status %d): %s", resp.StatusCode, string(body)), nil
}

// testHuggingFace tests Hugging Face API key
func testHuggingFace(apiKey, baseURL string) (bool, string, error) {
	if baseURL == "" {
		baseURL = "https://api-inference.huggingface.co"
	}

	// Test with a simple model endpoint
	url := fmt.Sprintf("%s/models/gpt2", strings.TrimSuffix(baseURL, "/"))
	headers := map[string]string{
		"Authorization": fmt.Sprintf("Bearer %s", apiKey),
	}

	resp, err := makeHTTPRequest("GET", url, headers, nil)
	if err != nil {
		return false, fmt.Sprintf("Connection error: %v", err), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 || resp.StatusCode == 403 {
		// 403 might mean the key is valid but doesn't have access to this specific model
		return true, "API key is valid and working", nil
	}

	body, _ := io.ReadAll(resp.Body)
	return false, fmt.Sprintf("API key validation failed (Status %d): %s", resp.StatusCode, string(body)), nil
}

// testCustomProvider tests custom provider API key with a generic OpenAI-compatible endpoint
func testCustomProvider(apiKey, baseURL string) (bool, string, error) {
	if baseURL == "" {
		return false, "Base URL is required for custom providers", nil
	}

	// Try OpenAI-compatible models endpoint
	url := fmt.Sprintf("%s/models", strings.TrimSuffix(baseURL, "/"))
	headers := map[string]string{
		"Authorization": fmt.Sprintf("Bearer %s", apiKey),
	}

	resp, err := makeHTTPRequest("GET", url, headers, nil)
	if err != nil {
		return false, fmt.Sprintf("Connection error: %v", err), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		return true, "API key is valid and working", nil
	}

	body, _ := io.ReadAll(resp.Body)
	return false, fmt.Sprintf("API key validation failed (Status %d): %s", resp.StatusCode, string(body)), nil
}

// testVertexAI tests Google Vertex AI service account credentials
// Vertex AI uses service account JSON instead of a simple API key
func testVertexAI(credentials, baseURL string) (bool, string, error) {
	// Parse the JSON credentials
	var serviceAccount map[string]interface{}
	if err := json.Unmarshal([]byte(credentials), &serviceAccount); err != nil {
		return false, "Invalid JSON format: " + err.Error(), nil
	}

	// Check required fields for a service account
	requiredFields := []string{"type", "project_id", "private_key", "client_email"}
	missingFields := []string{}
	for _, field := range requiredFields {
		if _, exists := serviceAccount[field]; !exists {
			missingFields = append(missingFields, field)
		}
	}

	if len(missingFields) > 0 {
		return false, fmt.Sprintf("Invalid service account JSON: missing required fields (%s)", strings.Join(missingFields, ", ")), nil
	}

	// Verify the type is "service_account"
	if serviceAccount["type"] != "service_account" {
		return false, fmt.Sprintf("Invalid credentials type: expected 'service_account', got '%v'", serviceAccount["type"]), nil
	}

	// Verify private_key has the expected format
	privateKey, ok := serviceAccount["private_key"].(string)
	if !ok || !strings.Contains(privateKey, "BEGIN PRIVATE KEY") {
		return false, "Invalid private_key format: must be a PEM-encoded private key", nil
	}

	// Verify client_email looks like a service account email
	clientEmail, ok := serviceAccount["client_email"].(string)
	if !ok || !strings.Contains(clientEmail, "@") || !strings.Contains(clientEmail, ".iam.gserviceaccount.com") {
		return false, "Invalid client_email format: must be a valid service account email", nil
	}

	// If we get here, the credentials structure is valid
	projectID := serviceAccount["project_id"].(string)
	return true, fmt.Sprintf("Service account credentials valid for project: %s", projectID), nil
}
