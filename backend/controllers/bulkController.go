package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"projectup/database"
	"projectup/models"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/datatypes"
)

// BulkCreateRequest represents the request for bulk creating items
type BulkCreateRequest struct {
	ProjectID  string              `json:"project_id" binding:"required"`
	Tasks      []BulkTask          `json:"tasks,omitempty"`
	Milestones []BulkMilestone     `json:"milestones,omitempty"`
	Plans      []BulkPlan          `json:"plans,omitempty"`
}

// BulkTask represents a task to be created
type BulkTask struct {
	Title          string   `json:"title" binding:"required"`
	Description    string   `json:"description"`
	Status         string   `json:"status"`
	Priority       string   `json:"priority"` // "low", "medium", "high" - will be converted to int
	EstimatedHours *float64 `json:"estimated_hours,omitempty"`
	MilestoneID    *string  `json:"milestone_id,omitempty"` // Temporary milestone ID
	Dependencies   []string `json:"dependencies,omitempty"`
}

// BulkMilestone represents a milestone to be created
type BulkMilestone struct {
	ID          *string  `json:"id,omitempty"` // Temporary ID for relationships
	Title       string   `json:"title" binding:"required"`
	Description string   `json:"description"`
	DueDate     *string  `json:"due_date,omitempty"`
	Status      string   `json:"status"`
	TaskIDs     []string `json:"task_ids,omitempty"`
}

// BulkPlan represents a plan to be created
type BulkPlan struct {
	ID           *string  `json:"id,omitempty"` // Temporary ID for relationships
	Title        string   `json:"title" binding:"required"`
	Description  string   `json:"description"`
	PlanType     string   `json:"plan_type"`
	MilestoneIDs []string `json:"milestone_ids,omitempty"`
}

// BulkCreateResponse represents the response after bulk creation
type BulkCreateResponse struct {
	Success bool                   `json:"success"`
	Created map[string]int         `json:"created"`
	IDs     map[string][]string    `json:"ids"`
	Message string                 `json:"message,omitempty"`
}

// BulkCreateHandler handles bulk creation of tasks, milestones, and plans
func BulkCreateHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req BulkCreateRequest

		// Bind JSON request
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Get user ID from context (set by auth middleware)
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		// Validate project access and get numeric project ID
		var project models.Project
		if err := database.DB.Where("sid = ?", req.ProjectID).First(&project).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}

		// Start transaction
		tx := database.DB.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		response := BulkCreateResponse{
			Success: true,
			Created: make(map[string]int),
			IDs:     make(map[string][]string),
		}

		// Map of temporary IDs to actual IDs
		milestoneIDMap := make(map[string]uint)

		// Helper function to map priority string to int
		mapPriority := func(priority string) int {
			switch priority {
			case "low":
				return 1
			case "high":
				return 5
			default: // "medium" or empty
				return 3
			}
		}

		// Create Milestones first (so tasks can reference them)
		if len(req.Milestones) > 0 {
			createdMilestones := []string{}

			for _, ms := range req.Milestones {
				// Convert description string to *string
				var description *string
				if ms.Description != "" {
					description = &ms.Description
				}

				milestone := models.Milestone{
					Title:       ms.Title,
					Description: description,
					ProjectID:   project.ProjectID, // Use numeric ProjectID
					Status:      ms.Status,
				}

				// Set default status if empty
				if milestone.Status == "" {
					milestone.Status = "not_started"
				}

				// Parse due date if provided
				if ms.DueDate != nil && *ms.DueDate != "" {
					if dueDate, err := time.Parse("2006-01-02", *ms.DueDate); err == nil {
						milestone.DueDate = &dueDate
					}
				}

				// Create milestone
				if err := tx.Create(&milestone).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to create milestone: %s", err.Error())})
					return
				}

				// Map temporary ID to actual ID
				if ms.ID != nil && *ms.ID != "" {
					milestoneIDMap[*ms.ID] = milestone.MilestoneID
				}

				createdMilestones = append(createdMilestones, fmt.Sprintf("%d", milestone.MilestoneID))
			}

			response.Created["milestones"] = len(createdMilestones)
			response.IDs["milestones"] = createdMilestones
		}

		// Create Tasks
		if len(req.Tasks) > 0 {
			createdTasks := []string{}

			for _, t := range req.Tasks {
				taskID := uuid.New().String()

				task := models.Task{
					ID:          taskID,
					ProjectID:   req.ProjectID, // Task uses SID directly
					Title:       t.Title,
					Description: t.Description,
					Status:      t.Status,
					Priority:    mapPriority(t.Priority),
					CreatedBy:   fmt.Sprintf("%d", userID.(uint)), // Convert uint to string
				}

				// Set default status if empty
				if task.Status == "" {
					task.Status = "todo"
				}

				// Set estimated hours
				if t.EstimatedHours != nil {
					task.EstimatedHours = t.EstimatedHours
				}

				// Map milestone ID from temporary to actual
				if t.MilestoneID != nil && *t.MilestoneID != "" {
					if actualID, exists := milestoneIDMap[*t.MilestoneID]; exists {
						task.MilestoneID = &actualID
					}
				}

				// Create task
				if err := tx.Create(&task).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to create task: %s", err.Error())})
					return
				}

				createdTasks = append(createdTasks, taskID)
			}

			response.Created["tasks"] = len(createdTasks)
			response.IDs["tasks"] = createdTasks
		}

		// Create Plans
		if len(req.Plans) > 0 {
			createdPlans := []string{}

			for _, p := range req.Plans {
				// Create empty content structure
				contentMap := map[string]interface{}{
					"sections": []map[string]interface{}{
						{
							"id":      "section-1",
							"type":    "text",
							"title":   p.Title,
							"content": p.Description,
						},
					},
				}
				contentJSON, _ := json.Marshal(contentMap)

				createdByUserID := userID.(uint)
				plan := models.ProjectPlan{
					ProjectID:   project.ProjectID, // Use numeric ProjectID
					Title:       p.Title,
					Description: p.Description,
					PlanType:    p.PlanType,
					Content:     datatypes.JSON(contentJSON),
					CreatedBy:   &createdByUserID,
					Status:      "draft",
					Source:      "ai-generated",
				}

				// Set default plan type if empty
				if plan.PlanType == "" {
					plan.PlanType = "action"
				}

				// Create plan
				if err := tx.Create(&plan).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to create plan: %s", err.Error())})
					return
				}

				createdPlans = append(createdPlans, strconv.FormatUint(uint64(plan.ID), 10))
			}

			response.Created["plans"] = len(createdPlans)
			response.IDs["plans"] = createdPlans
		}

		// Commit transaction
		if err := tx.Commit().Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
			return
		}

		// Build success message
		totalCreated := response.Created["tasks"] + response.Created["milestones"] + response.Created["plans"]
		response.Message = fmt.Sprintf("Successfully created %d item(s)", totalCreated)

		c.JSON(http.StatusOK, response)
	}
}
