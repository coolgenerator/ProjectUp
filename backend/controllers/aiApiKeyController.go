package controllers

import (
	"net/http"
	"projectup/models"
	"projectup/services"
	"strconv"

	"github.com/gin-gonic/gin"
)

// GetActiveAPIKeyForProvider gets the active API key for a specific provider
// @Summary Get active API key for provider
// @Description Gets the active API key configuration for a specific provider (for AI service use)
// @Tags AI API Keys
// @Produce json
// @Security BearerAuth
// @Param provider path string true "Provider name"
// @Success 200 {object} map[string]interface{} "Active API key configuration"
// @Failure 400 {object} map[string]interface{} "Invalid provider"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 404 {object} map[string]interface{} "No active API key found"
// @Router /ai-api-keys/active/{provider} [get]
func GetActiveAPIKeyForProvider() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authorized"})
			return
		}

		provider := c.Param("provider")
		if provider == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Provider is required"})
			return
		}

		apiKey, baseURL, model, err := services.GetActiveAPIKeyForProvider(userID.(uint), provider)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"api_key":  apiKey,
			"base_url": baseURL,
			"model":    model,
			"provider": provider,
		})
	}
}

// GetAllAIAPIKeys retrieves all AI API keys for the authenticated user
// @Summary Get all AI API keys
// @Description Gets all AI API keys for the authenticated user (keys are masked for security)
// @Tags AI API Keys
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "List of API keys"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /ai-api-keys [get]
func GetAllAIAPIKeys() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authorized"})
			return
		}

		apiKeys, err := services.GetAllAIAPIKeys(userID.(uint))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve API keys"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"api_keys": apiKeys,
		})
	}
}

// GetAIAPIKey retrieves a specific AI API key by ID
// @Summary Get AI API key by ID
// @Description Gets a specific AI API key for the authenticated user (key is masked for security)
// @Tags AI API Keys
// @Produce json
// @Security BearerAuth
// @Param id path int true "API Key ID"
// @Success 200 {object} map[string]interface{} "API key details"
// @Failure 400 {object} map[string]interface{} "Invalid key ID"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 404 {object} map[string]interface{} "API key not found"
// @Router /ai-api-keys/{id} [get]
func GetAIAPIKey() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authorized"})
			return
		}

		keyID, err := strconv.ParseUint(c.Param("id"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid key ID"})
			return
		}

		apiKey, err := services.GetAIAPIKey(userID.(uint), uint(keyID))
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "API key not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"api_key": apiKey,
		})
	}
}

// CreateAIAPIKey creates a new AI API key
// @Summary Create new AI API key
// @Description Creates a new AI API key for the authenticated user
// @Tags AI API Keys
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param apiKey body models.CreateUserAIAPIKeyRequest true "API key details"
// @Success 201 {object} map[string]interface{} "Created API key"
// @Failure 400 {object} map[string]interface{} "Invalid request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /ai-api-keys [post]
func CreateAIAPIKey() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authorized"})
			return
		}

		var req models.CreateUserAIAPIKeyRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		// Validate provider
		validProviders := map[string]bool{
			models.ProviderOpenAI:      true,
			models.ProviderAnthropic:   true,
			models.ProviderGoogle:      true,
			models.ProviderVertexAI:    true,
			models.ProviderOpenRouter:  true,
			models.ProviderTogether:    true,
			models.ProviderReplicate:   true,
			models.ProviderCohere:      true,
			models.ProviderGroq:        true,
			models.ProviderMistral:     true,
			models.ProviderPerplexity:  true,
			models.ProviderAI21:        true,
			models.ProviderHuggingFace: true,
			models.ProviderAzureOpenAI: true,
			models.ProviderAWSBedrock:  true,
			models.ProviderFireworks:   true,
			models.ProviderAnyscale:    true,
			models.ProviderDeepSeek:    true,
			models.ProviderDeepInfra:   true,
			models.ProviderQwen:        true,
			models.ProviderBaichuan:    true,
			models.ProviderMoonshot:    true,
			models.ProviderZhipu:       true,
			models.ProviderCustom:      true,
		}
		if !validProviders[req.Provider] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid provider. Please select a valid AI provider"})
			return
		}

		apiKey, err := services.CreateAIAPIKey(userID.(uint), &req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create API key"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"message": "API key created successfully",
			"api_key": apiKey,
		})
	}
}

// UpdateAIAPIKey updates an existing AI API key
// @Summary Update AI API key
// @Description Updates an existing AI API key for the authenticated user
// @Tags AI API Keys
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "API Key ID"
// @Param apiKey body models.UpdateUserAIAPIKeyRequest true "Updated API key details"
// @Success 200 {object} map[string]interface{} "Updated API key"
// @Failure 400 {object} map[string]interface{} "Invalid request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 404 {object} map[string]interface{} "API key not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /ai-api-keys/{id} [put]
func UpdateAIAPIKey() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authorized"})
			return
		}

		keyID, err := strconv.ParseUint(c.Param("id"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid key ID"})
			return
		}

		var req models.UpdateUserAIAPIKeyRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		apiKey, err := services.UpdateAIAPIKey(userID.(uint), uint(keyID), &req)
		if err != nil {
			if err.Error() == "api key not found" {
				c.JSON(http.StatusNotFound, gin.H{"error": "API key not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update API key"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "API key updated successfully",
			"api_key": apiKey,
		})
	}
}

// DeleteAIAPIKey deletes an AI API key
// @Summary Delete AI API key
// @Description Deletes an AI API key for the authenticated user
// @Tags AI API Keys
// @Produce json
// @Security BearerAuth
// @Param id path int true "API Key ID"
// @Success 200 {object} map[string]interface{} "Success message"
// @Failure 400 {object} map[string]interface{} "Invalid key ID"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 404 {object} map[string]interface{} "API key not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /ai-api-keys/{id} [delete]
func DeleteAIAPIKey() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authorized"})
			return
		}

		keyID, err := strconv.ParseUint(c.Param("id"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid key ID"})
			return
		}

		err = services.DeleteAIAPIKey(userID.(uint), uint(keyID))
		if err != nil {
			if err.Error() == "api key not found" {
				c.JSON(http.StatusNotFound, gin.H{"error": "API key not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete API key"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "API key deleted successfully",
		})
	}
}

// TestAIAPIKey tests if an API key is working
// @Summary Test AI API key
// @Description Tests if an AI API key is valid and working by making a simple API call to the provider
// @Tags AI API Keys
// @Produce json
// @Security BearerAuth
// @Param id path int true "API Key ID"
// @Success 200 {object} map[string]interface{} "Test result"
// @Failure 400 {object} map[string]interface{} "Invalid key ID"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 404 {object} map[string]interface{} "API key not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /ai-api-keys/{id}/test [post]
func TestAIAPIKey() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authorized"})
			return
		}

		keyID, err := strconv.ParseUint(c.Param("id"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid key ID"})
			return
		}

		isValid, message, err := services.TestAPIKey(userID.(uint), uint(keyID))
		if err != nil {
			if err.Error() == "api key not found" {
				c.JSON(http.StatusNotFound, gin.H{"error": "API key not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"valid":   isValid,
			"message": message,
		})
	}
}
