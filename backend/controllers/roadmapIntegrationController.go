package controllers

import (
	"log"
	"net/http"
	"projectup/database"
	"projectup/models"
	"projectup/services"
	"strconv"

	"github.com/gin-gonic/gin"
)

// StoreAIGeneratedRoadmapHandler stores AI-generated roadmap data
// @Summary Store AI-generated roadmap
// @Description Stores a complete AI-generated roadmap with sections, milestones, tasks, subtasks, dependencies, and proposals
// @Tags Project Roadmap
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param roadmap body services.AIGeneratedRoadmap true "AI-generated roadmap data"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /projects/{sid}/roadmap/store-ai-generated [post]
func StoreAIGeneratedRoadmapHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		db := database.DB
		sid := c.Param("sid")

		// Get project by short ID
		var project models.Project
		if err := db.Where("sid = ?", sid).First(&project).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "Project not found",
			})
			return
		}

		// Parse request body
		var roadmapData services.AIGeneratedRoadmap
		if err := c.ShouldBindJSON(&roadmapData); err != nil {
			log.Printf("Error parsing roadmap data: %v", err)
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "Invalid request body: " + err.Error(),
			})
			return
		}

		// Validate roadmap data
		if !roadmapData.Success {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "Roadmap generation was not successful",
			})
			return
		}

		if len(roadmapData.Sections) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "Roadmap must contain at least one section",
			})
			return
		}

		// Create service and store roadmap
		integrationService := services.NewRoadmapIntegrationService()
		result, err := integrationService.StoreAIGeneratedRoadmap(project.ProjectID, roadmapData)

		if err != nil {
			log.Printf("Error storing roadmap for project %s: %v", sid, err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "Failed to store roadmap: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success":             result.Success,
			"sections_created":    result.SectionsCreated,
			"milestones_created":  result.MilestonesCreated,
			"tasks_created":       result.TasksCreated,
			"subtasks_created":    result.SubtasksCreated,
			"dependencies_created": result.DependenciesCreated,
			"proposals_created":   result.ProposalsCreated,
			"message":             "Roadmap stored successfully",
		})
	}
}

// GetProjectRoadmapHandler retrieves the complete roadmap for a project
// @Summary Get project roadmap
// @Description Retrieves sections, milestones, tasks, and dependencies for a project
// @Tags Project Roadmap
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param include_tasks query bool false "Include tasks in response"
// @Param include_subtasks query bool false "Include subtasks in response"
// @Param include_dependencies query bool false "Include task dependencies"
// @Success 200 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /projects/{sid}/roadmap [get]
func GetProjectRoadmapHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		db := database.DB
		sid := c.Param("sid")

		// Query parameters
		includeTasks := c.Query("include_tasks") == "true"
		includeSubtasks := c.Query("include_subtasks") == "true"
		includeDependencies := c.Query("include_dependencies") == "true"

		// Get project
		var project models.Project
		if err := db.Where("sid = ?", sid).First(&project).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "Project not found",
			})
			return
		}

		// Get sections
		var sections []models.Section
		if err := db.Where("project_id = ?", project.ProjectID).
			Order("\"order\" ASC").
			Find(&sections).Error; err != nil {
			log.Printf("Error fetching sections: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "Failed to fetch sections",
			})
			return
		}

		// Get milestones
		var milestones []models.Milestone
		if err := db.Where("project_id = ?", project.ProjectID).
			Order("sort_order ASC").
			Find(&milestones).Error; err != nil {
			log.Printf("Error fetching milestones: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "Failed to fetch milestones",
			})
			return
		}

		// Organize milestones by ID for task lookup
		milestoneMap := make(map[uint]*models.Milestone)
		for i := range milestones {
			milestoneMap[milestones[i].MilestoneID] = &milestones[i]
		}

		// Get tasks if requested
		var tasks []models.Task
		if includeTasks {
			query := db.Where("project_id = ?", strconv.FormatUint(uint64(project.ProjectID), 10)).
				Order("section_order ASC")

			if includeSubtasks {
				query = query.Preload("Subtasks")
			}

			if err := query.Find(&tasks).Error; err != nil {
				log.Printf("Error fetching tasks: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"error":   "Failed to fetch tasks",
				})
				return
			}
		}

		// Get dependencies if requested
		var dependencies []models.TaskDependency
		if includeDependencies {
			// Get all tasks for the project to filter dependencies
			var taskIDs []string
			db.Model(&models.Task{}).
				Where("project_id = ?", strconv.FormatUint(uint64(project.ProjectID), 10)).
				Pluck("id", &taskIDs)

			if len(taskIDs) > 0 {
				db.Where("task_id IN ?", taskIDs).Find(&dependencies)
			}
		}

		// Organize response
		response := gin.H{
			"success":    true,
			"project_id": project.ProjectID,
			"sections":   sections,
			"milestones": milestones,
		}

		if includeTasks {
			response["tasks"] = tasks
		}

		if includeDependencies && len(dependencies) > 0 {
			response["dependencies"] = dependencies
		}

		// Calculate statistics
		totalTasks := len(tasks)
		totalEstimatedHours := 0.0
		for _, task := range tasks {
			if task.EstimatedHours != nil {
				totalEstimatedHours += *task.EstimatedHours
			}
		}

		response["statistics"] = gin.H{
			"total_sections":   len(sections),
			"total_milestones": len(milestones),
			"total_tasks":      totalTasks,
			"estimated_hours":  totalEstimatedHours,
		}

		c.JSON(http.StatusOK, response)
	}
}

// DeleteProjectRoadmapHandler deletes the entire roadmap for a project
// @Summary Delete project roadmap
// @Description Deletes all sections, milestones, tasks, subtasks, and dependencies for a project
// @Tags Project Roadmap
// @Produce json
// @Param sid path string true "Project Short ID"
// @Success 200 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /projects/{sid}/roadmap [delete]
func DeleteProjectRoadmapHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		db := database.DB
		sid := c.Param("sid")

		// Get project
		var project models.Project
		if err := db.Where("sid = ?", sid).First(&project).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "Project not found",
			})
			return
		}

		projectIDStr := strconv.FormatUint(uint64(project.ProjectID), 10)

		// Start transaction
		tx := db.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		// Delete task dependencies
		if err := tx.Where("task_id IN (SELECT id FROM tasks WHERE project_id = ?)", projectIDStr).
			Delete(&models.TaskDependency{}).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "Failed to delete task dependencies",
			})
			return
		}

		// Delete subtasks
		if err := tx.Where("parent_task_id IN (SELECT id FROM tasks WHERE project_id = ?)", projectIDStr).
			Delete(&models.Subtask{}).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "Failed to delete subtasks",
			})
			return
		}

		// Delete tasks
		if err := tx.Where("project_id = ?", projectIDStr).
			Delete(&models.Task{}).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "Failed to delete tasks",
			})
			return
		}

		// Delete milestones
		if err := tx.Where("project_id = ?", project.ProjectID).
			Delete(&models.Milestone{}).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "Failed to delete milestones",
			})
			return
		}

		// Delete sections
		if err := tx.Where("project_id = ?", projectIDStr).
			Delete(&models.Section{}).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "Failed to delete sections",
			})
			return
		}

		// Commit transaction
		if err := tx.Commit().Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "Failed to commit transaction",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Project roadmap deleted successfully",
		})
	}
}
