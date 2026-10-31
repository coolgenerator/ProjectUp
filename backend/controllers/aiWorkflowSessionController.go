package controllers

import (
	"encoding/json"
	"net/http"
	"projectup/models"
	"projectup/services"

	"github.com/gin-gonic/gin"
)

// GetWorkflowSession retrieves the user's workflow session
// @Summary Get AI workflow session
// @Description Gets the current AI Project Assistant workflow session for the authenticated user
// @Tags AI Workflow
// @Produce json
// @Security BearerAuth
// @Success 200 {object} models.AIWorkflowSession "Workflow session data"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 404 {object} map[string]interface{} "Session not found"
// @Router /ai-workflow-session [get]
func GetWorkflowSession() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authorized"})
			return
		}

		session, err := services.GetWorkflowSessionService(userID.(uint))
		if err != nil {
			// If no session found, return empty session with analyze step
			c.JSON(http.StatusOK, gin.H{
				"session": gin.H{
					"step":       models.StepAnalyze,
					"state_data": models.StateData{},
				},
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"session": session,
		})
	}
}

// SaveWorkflowSessionRequest represents the request body for saving workflow session
type SaveWorkflowSessionRequest struct {
	Step              string          `json:"step" binding:"required"`
	ProjectIdeas      json.RawMessage `json:"project_ideas,omitempty"`
	SelectedIdea      json.RawMessage `json:"selected_idea,omitempty"`
	EnhancedRoadmap   json.RawMessage `json:"enhanced_roadmap,omitempty"`
	HasGeneratedIdeas bool            `json:"has_generated_ideas"`
}

// SaveWorkflowSession saves or updates the user's workflow session
// @Summary Save AI workflow session
// @Description Saves the current AI Project Assistant workflow session state
// @Tags AI Workflow
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param session body SaveWorkflowSessionRequest true "Workflow session data"
// @Success 200 {object} map[string]interface{} "Success response"
// @Failure 400 {object} map[string]interface{} "Invalid request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /ai-workflow-session [post]
func SaveWorkflowSession() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authorized"})
			return
		}

		var req SaveWorkflowSessionRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		// Validate step
		if req.Step != models.StepAnalyze && req.Step != models.StepIdeas && req.Step != models.StepRoadmap {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid step value"})
			return
		}

		// Build state data
		stateData := models.StateData{
			ProjectIdeas:      req.ProjectIdeas,
			SelectedIdea:      req.SelectedIdea,
			EnhancedRoadmap:   req.EnhancedRoadmap,
			HasGeneratedIdeas: req.HasGeneratedIdeas,
		}

		// Save session
		if err := services.SaveWorkflowSessionService(userID.(uint), req.Step, stateData); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save workflow session"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Workflow session saved successfully",
		})
	}
}

// ClearWorkflowSession deletes the user's workflow session
// @Summary Clear AI workflow session
// @Description Clears the AI Project Assistant workflow session for the authenticated user
// @Tags AI Workflow
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Success response"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /ai-workflow-session [delete]
func ClearWorkflowSession() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authorized"})
			return
		}

		if err := services.ClearWorkflowSessionService(userID.(uint)); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clear workflow session"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Workflow session cleared successfully",
		})
	}
}
