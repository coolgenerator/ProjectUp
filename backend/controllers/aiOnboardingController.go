package controllers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

// getAIServiceURL returns the AI service URL from environment or defaults to localhost
func getAIServiceURL() string {
	aiServiceURL := os.Getenv("AI_SERVICE_URL")
	if aiServiceURL == "" {
		aiServiceURL = "http://localhost:8888" // AI service default port
	}
	return aiServiceURL
}

// proxyToAIService forwards a request to the AI service and returns the response
func proxyToAIService(c *gin.Context, endpoint string, requestBody interface{}) {
	aiServiceURL := getAIServiceURL()
	fullURL := fmt.Sprintf("%s%s", aiServiceURL, endpoint)

	// Marshal request body
	requestJSON, err := json.Marshal(requestBody)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Make request to AI service
	resp, err := http.Post(fullURL, "application/json", bytes.NewBuffer(requestJSON))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to connect to AI service",
			"details": err.Error(),
		})
		return
	}
	defer resp.Body.Close()

	// Read response body
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to read AI service response",
			"details": err.Error(),
		})
		return
	}

	// Parse JSON response
	var jsonResponse interface{}
	if err := json.Unmarshal(responseBody, &jsonResponse); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to parse AI service response",
			"details": err.Error(),
		})
		return
	}

	// Forward response with same status code
	c.JSON(resp.StatusCode, jsonResponse)
}

// GetSupportedProjectTypes returns list of supported project types
// @Summary Get supported project types
// @Description Returns list of all supported project types for AI-guided onboarding
// @Tags AI Onboarding
// @Produce json
// @Success 200 {object} map[string]interface{} "List of project types"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /api/projects/onboarding/types [get]
func GetSupportedProjectTypes() gin.HandlerFunc {
	return func(c *gin.Context) {
		aiServiceURL := getAIServiceURL()
		fullURL := fmt.Sprintf("%s/onboarding/supported-types", aiServiceURL)

		// Make GET request to AI service
		resp, err := http.Get(fullURL)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to connect to AI service",
				"details": err.Error(),
			})
			return
		}
		defer resp.Body.Close()

		// Read response body
		responseBody, err := io.ReadAll(resp.Body)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to read AI service response",
				"details": err.Error(),
			})
			return
		}

		// Parse JSON response
		var jsonResponse interface{}
		if err := json.Unmarshal(responseBody, &jsonResponse); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to parse AI service response",
				"details": err.Error(),
			})
			return
		}

		// Forward response
		c.JSON(resp.StatusCode, jsonResponse)
	}
}

// SuggestOnboardingTopics generates project topic suggestions
// @Summary Suggest project topics
// @Description Generate AI-powered project topic suggestions based on project context
// @Tags AI Onboarding
// @Accept json
// @Produce json
// @Param type path string true "Project type (course, hackathon, capstone, research, competition, internship, opensource, portfolio, coursenote, examprep)"
// @Param request body map[string]interface{} true "Project context"
// @Success 200 {object} map[string]interface{} "Topic suggestions"
// @Failure 400 {object} map[string]string "Invalid request"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /api/projects/onboarding/{type}/topics [post]
func SuggestOnboardingTopics() gin.HandlerFunc {
	return func(c *gin.Context) {
		projectType := c.Param("type")
		if projectType == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Project type is required"})
			return
		}

		// Parse request body
		var requestBody map[string]interface{}
		if err := c.ShouldBindJSON(&requestBody); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		// Forward to AI service
		endpoint := fmt.Sprintf("/onboarding/%s/suggest-topics", projectType)
		proxyToAIService(c, endpoint, requestBody)
	}
}

// ElaborateOnboardingTopic elaborates on a selected topic
// @Summary Elaborate project topic
// @Description Generate detailed planning for selected project topic
// @Tags AI Onboarding
// @Accept json
// @Produce json
// @Param type path string true "Project type"
// @Param request body map[string]interface{} true "Selected topic and context"
// @Success 200 {object} map[string]interface{} "Detailed elaboration"
// @Failure 400 {object} map[string]string "Invalid request"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /api/projects/onboarding/{type}/elaborate [post]
func ElaborateOnboardingTopic() gin.HandlerFunc {
	return func(c *gin.Context) {
		projectType := c.Param("type")
		if projectType == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Project type is required"})
			return
		}

		// Parse request body
		var requestBody map[string]interface{}
		if err := c.ShouldBindJSON(&requestBody); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		// Forward to AI service
		endpoint := fmt.Sprintf("/onboarding/%s/elaborate-topic", projectType)
		proxyToAIService(c, endpoint, requestBody)
	}
}

// GenerateOnboardingDetails generates project details
// @Summary Generate project details
// @Description Generate project name options, description, and tags
// @Tags AI Onboarding
// @Accept json
// @Produce json
// @Param type path string true "Project type"
// @Param request body map[string]interface{} true "Elaboration from previous step"
// @Success 200 {object} map[string]interface{} "Project details"
// @Failure 400 {object} map[string]string "Invalid request"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /api/projects/onboarding/{type}/details [post]
func GenerateOnboardingDetails() gin.HandlerFunc {
	return func(c *gin.Context) {
		projectType := c.Param("type")
		if projectType == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Project type is required"})
			return
		}

		// Parse request body
		var requestBody map[string]interface{}
		if err := c.ShouldBindJSON(&requestBody); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		// Forward to AI service
		endpoint := fmt.Sprintf("/onboarding/%s/generate-details", projectType)
		proxyToAIService(c, endpoint, requestBody)
	}
}
