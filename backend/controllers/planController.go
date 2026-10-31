package controllers

import (
	"encoding/json"
	"log"
	"projectup/database"
	"projectup/models"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"gorm.io/datatypes"
)

// GetProjectPlansHandler returns all plans for a project
// @Summary Get all plans for a project
// @Description Get all plans associated with a project
// @Tags Plans
// @Produce json
// @Param sid path string true "Project Short ID"
// @Success 200 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Router /projects/{sid}/plans [get]
func GetProjectPlansHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		db := database.DB
		sid := c.Param("sid")

		var project models.Project
		if err := db.Where("sid = ?", sid).First(&project).Error; err != nil {
			c.JSON(404, gin.H{"error": "Project not found"})
			return
		}

		var plans []models.ProjectPlan
		if err := db.Where("project_id = ?", project.ProjectID).
			Order("order_index ASC, created_at DESC").
			Preload("Creator").
			Find(&plans).Error; err != nil {
			c.JSON(500, gin.H{"error": "Failed to fetch plans"})
			return
		}

		c.JSON(200, gin.H{
			"success": true,
			"plans":   plans,
		})
	}
}

// GetPlanHandler returns a single plan by ID
// @Summary Get a plan by ID
// @Description Get detailed information about a specific plan
// @Tags Plans
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param planId path int true "Plan ID"
// @Success 200 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Router /projects/{sid}/plans/{planId} [get]
func GetPlanHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		db := database.DB
		sid := c.Param("sid")
		planId := c.Param("planId")

		var project models.Project
		if err := db.Where("sid = ?", sid).First(&project).Error; err != nil {
			c.JSON(404, gin.H{"error": "Project not found"})
			return
		}

		var plan models.ProjectPlan
		if err := db.Where("id = ? AND project_id = ?", planId, project.ProjectID).
			Preload("Creator").
			First(&plan).Error; err != nil {
			c.JSON(404, gin.H{"error": "Plan not found"})
			return
		}

		c.JSON(200, gin.H{
			"success": true,
			"plan":    plan,
		})
	}
}

// CreatePlanHandler creates a new plan
// @Summary Create a new plan
// @Description Create a new plan for a project
// @Tags Plans
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param plan body map[string]interface{} true "Plan data"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Router /projects/{sid}/plans [post]
func CreatePlanHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		db := database.DB
		sid := c.Param("sid")

		var project models.Project
		if err := db.Where("sid = ?", sid).First(&project).Error; err != nil {
			c.JSON(404, gin.H{"error": "Project not found"})
			return
		}

		var request struct {
			Title         string                 `json:"title" binding:"required"`
			Description   string                 `json:"description"`
			PlanType      string                 `json:"plan_type"`
			Content       map[string]interface{} `json:"content" binding:"required"`
			Source        string                 `json:"source"`
			Status        string                 `json:"status"`
			Tags          []string               `json:"tags"`
			Category      *string                `json:"category"`
			LinkedTaskIDs []int64                `json:"linked_task_ids"`
			LinkedIdeaIDs []int64                `json:"linked_idea_ids"`
			LinkedPlanIDs []int64                `json:"linked_plan_ids"`
		}

		if err := c.BindJSON(&request); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		// Get user ID from context (set by auth middleware)
		userIDInterface, exists := c.Get("user_id")
		var userID *uint
		if exists {
			if uid, ok := userIDInterface.(uint); ok {
				userID = &uid
			}
		}

		contentJSON, err := json.Marshal(request.Content)
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid content format"})
			return
		}

		status := request.Status
		if status == "" {
			status = "draft"
		}

		planType := request.PlanType
		if planType == "" {
			planType = "custom"
		}

		source := request.Source
		if source == "" {
			source = "manual"
		}

		plan := models.ProjectPlan{
			ProjectID:     project.ProjectID,
			Title:         request.Title,
			Description:   request.Description,
			PlanType:      planType,
			Content:       datatypes.JSON(contentJSON),
			Source:        source,
			CreatedBy:     userID,
			Tags:          pq.StringArray(request.Tags),
			Category:      request.Category,
			LinkedTaskIDs: pq.Int64Array(request.LinkedTaskIDs),
			LinkedIdeaIDs: pq.Int64Array(request.LinkedIdeaIDs),
			LinkedPlanIDs: pq.Int64Array(request.LinkedPlanIDs),
			Status:        status,
		}

		if err := db.Create(&plan).Error; err != nil {
			log.Printf("Failed to create plan: %v", err)
			c.JSON(500, gin.H{"error": "Failed to create plan"})
			return
		}

		c.JSON(200, gin.H{
			"success": true,
			"plan":    plan,
		})
	}
}

// UpdatePlanHandler updates an existing plan
// @Summary Update a plan
// @Description Update an existing plan
// @Tags Plans
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param planId path int true "Plan ID"
// @Param plan body map[string]interface{} true "Plan data"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Router /projects/{sid}/plans/{planId} [put]
func UpdatePlanHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		db := database.DB
		sid := c.Param("sid")
		planId := c.Param("planId")

		var project models.Project
		if err := db.Where("sid = ?", sid).First(&project).Error; err != nil {
			c.JSON(404, gin.H{"error": "Project not found"})
			return
		}

		var plan models.ProjectPlan
		if err := db.Where("id = ? AND project_id = ?", planId, project.ProjectID).
			First(&plan).Error; err != nil {
			c.JSON(404, gin.H{"error": "Plan not found"})
			return
		}

		var request struct {
			Title         string                 `json:"title"`
			Description   string                 `json:"description"`
			Content       map[string]interface{} `json:"content"`
			Status        string                 `json:"status"`
			PlanType      string                 `json:"plan_type"`
			OrderIndex    *int                   `json:"order_index"`
			Tags          []string               `json:"tags"`
			Category      *string                `json:"category"`
			LinkedTaskIDs []int64                `json:"linked_task_ids"`
			LinkedIdeaIDs []int64                `json:"linked_idea_ids"`
			LinkedPlanIDs []int64                `json:"linked_plan_ids"`
		}

		if err := c.BindJSON(&request); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		updates := map[string]interface{}{}

		if request.Title != "" {
			updates["title"] = request.Title
		}
		if request.Description != "" {
			updates["description"] = request.Description
		}
		if request.Content != nil {
			contentJSON, err := json.Marshal(request.Content)
			if err != nil {
				c.JSON(400, gin.H{"error": "Invalid content format"})
				return
			}
			updates["content"] = datatypes.JSON(contentJSON)
		}
		if request.Status != "" {
			updates["status"] = request.Status
		}
		if request.PlanType != "" {
			updates["plan_type"] = request.PlanType
		}
		if request.OrderIndex != nil {
			updates["order_index"] = *request.OrderIndex
		}
		if request.Tags != nil {
			updates["tags"] = pq.StringArray(request.Tags)
		}
		if request.Category != nil {
			updates["category"] = request.Category
		}
		if request.LinkedTaskIDs != nil {
			updates["linked_task_ids"] = pq.Int64Array(request.LinkedTaskIDs)
		}
		if request.LinkedIdeaIDs != nil {
			updates["linked_idea_ids"] = pq.Int64Array(request.LinkedIdeaIDs)
		}
		if request.LinkedPlanIDs != nil {
			updates["linked_plan_ids"] = pq.Int64Array(request.LinkedPlanIDs)
		}

		if err := db.Model(&plan).Updates(updates).Error; err != nil {
			log.Printf("Failed to update plan: %v", err)
			c.JSON(500, gin.H{"error": "Failed to update plan"})
			return
		}

		// Reload plan to get updated data
		db.Where("id = ?", plan.ID).Preload("Creator").First(&plan)

		c.JSON(200, gin.H{
			"success": true,
			"plan":    plan,
		})
	}
}

// DeletePlanHandler deletes a plan
// @Summary Delete a plan
// @Description Delete a plan from a project
// @Tags Plans
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param planId path int true "Plan ID"
// @Success 200 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Router /projects/{sid}/plans/{planId} [delete]
func DeletePlanHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		db := database.DB
		sid := c.Param("sid")
		planId := c.Param("planId")

		var project models.Project
		if err := db.Where("sid = ?", sid).First(&project).Error; err != nil {
			c.JSON(404, gin.H{"error": "Project not found"})
			return
		}

		if err := db.Where("id = ? AND project_id = ?", planId, project.ProjectID).
			Delete(&models.ProjectPlan{}).Error; err != nil {
			log.Printf("Failed to delete plan: %v", err)
			c.JSON(500, gin.H{"error": "Failed to delete plan"})
			return
		}

		c.JSON(200, gin.H{"success": true})
	}
}

// Helper function to convert string to int64
func parseInt64(s string) (int64, error) {
	return strconv.ParseInt(s, 10, 64)
}
