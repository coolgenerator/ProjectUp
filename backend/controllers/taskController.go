package controllers

import (
	"encoding/json"
	"net/http"
	"projectup/models"
	"projectup/services"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// TaskController handles HTTP requests for tasks
type TaskController struct {
	service *services.TaskService
}

// NewTaskController creates a new TaskController
func NewTaskController(service *services.TaskService) *TaskController {
	return &TaskController{service: service}
}

// ========== Task Endpoints ==========

// CreateTask creates a new task
// @Summary Create a new task
// @Tags tasks
// @Accept json
// @Produce json
// @Param task body models.Task true "Task data"
// @Success 200 {object} map[string]interface{}
// @Router /api/tasks [post]
func (c *TaskController) CreateTask(ctx *gin.Context) {
	var task models.Task
	if err := ctx.ShouldBindJSON(&task); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request body: " + err.Error(),
		})
		return
	}

	if err := c.service.CreateTask(&task); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"task":    task,
	})
}

// GetTask retrieves a task by ID
// @Summary Get task by ID
// @Tags tasks
// @Produce json
// @Param id path string true "Task ID"
// @Param include_resources query bool false "Include learning resources"
// @Param include_subtasks query bool false "Include subtasks"
// @Success 200 {object} map[string]interface{}
// @Router /api/tasks/{id} [get]
func (c *TaskController) GetTask(ctx *gin.Context) {
	id := ctx.Param("id")
	includeResources := ctx.Query("include_resources") == "true"
	includeSubtasks := ctx.Query("include_subtasks") == "true"
	includeRelations := includeResources || includeSubtasks

	task, err := c.service.GetTask(id, includeRelations)
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Task not found",
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"task":    task,
	})
}

// GetProjectTasks retrieves all tasks for a project
// @Summary Get project tasks
// @Tags tasks
// @Produce json
// @Param project_id path string true "Project ID"
// @Param status query string false "Filter by status"
// @Param task_type query string false "Filter by task type"
// @Param assigned_to query string false "Filter by assigned user"
// @Param priority query int false "Filter by priority"
// @Param milestone_id query int false "Filter by milestone"
// @Param limit query int false "Limit results" default(100)
// @Param offset query int false "Offset results" default(0)
// @Success 200 {object} map[string]interface{}
// @Router /api/tasks/project/{project_id} [get]
func (c *TaskController) GetProjectTasks(ctx *gin.Context) {
	projectID := ctx.Param("project_id")

	// Parse filters
	filters := make(map[string]interface{})
	if status := ctx.Query("status"); status != "" {
		filters["status"] = status
	}
	if taskType := ctx.Query("task_type"); taskType != "" {
		filters["task_type"] = taskType
	}
	if assignedTo := ctx.Query("assigned_to"); assignedTo != "" {
		filters["assigned_to"] = assignedTo
	}
	if priorityStr := ctx.Query("priority"); priorityStr != "" {
		if priority, err := strconv.Atoi(priorityStr); err == nil {
			filters["priority"] = priority
		}
	}
	if milestoneIDStr := ctx.Query("milestone_id"); milestoneIDStr != "" {
		if milestoneID, err := strconv.Atoi(milestoneIDStr); err == nil {
			filters["milestone_id"] = milestoneID
		}
	}

	// Parse pagination
	limit := 100
	offset := 0
	if limitStr := ctx.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil {
			limit = l
		}
	}
	if offsetStr := ctx.Query("offset"); offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil {
			offset = o
		}
	}

	tasks, err := c.service.GetTasksByProject(projectID, filters, limit, offset)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"tasks":   tasks,
		"count":   len(tasks),
	})
}

// GetProjectTaskStats retrieves task statistics for a project
// @Summary Get project task statistics
// @Tags tasks
// @Produce json
// @Param project_id path string true "Project ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/tasks/project/{project_id}/stats [get]
func (c *TaskController) GetProjectTaskStats(ctx *gin.Context) {
	projectID := ctx.Param("project_id")

	stats, err := c.service.GetTaskStats(projectID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"stats":   stats,
	})
}

// GetTasksByIdeaNode retrieves all tasks linked to an idea node
// @Summary Get tasks by idea node
// @Tags tasks
// @Produce json
// @Param idea_node_id path string true "Idea Node ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/tasks/idea-node/{idea_node_id} [get]
func (c *TaskController) GetTasksByIdeaNode(ctx *gin.Context) {
	ideaNodeID := ctx.Param("idea_node_id")

	tasks, err := c.service.GetTasksByIdeaNode(ideaNodeID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"tasks":   tasks,
		"count":   len(tasks),
	})
}

// UpdateTask updates a task
// @Summary Update task
// @Tags tasks
// @Accept json
// @Produce json
// @Param id path string true "Task ID"
// @Param updates body map[string]interface{} true "Task updates"
// @Success 200 {object} map[string]interface{}
// @Router /api/tasks/{id} [put]
func (c *TaskController) UpdateTask(ctx *gin.Context) {
	id := ctx.Param("id")

	var updates map[string]interface{}
	if err := ctx.ShouldBindJSON(&updates); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request body: " + err.Error(),
		})
		return
	}

	// Parse date fields if present
	if startDateStr, ok := updates["start_date"].(string); ok && startDateStr != "" {
		if startDate, err := time.Parse(time.RFC3339, startDateStr); err == nil {
			updates["start_date"] = startDate
		}
	}
	if dueDateStr, ok := updates["due_date"].(string); ok && dueDateStr != "" {
		if dueDate, err := time.Parse(time.RFC3339, dueDateStr); err == nil {
			updates["due_date"] = dueDate
		}
	}
	if completedAtStr, ok := updates["completed_at"].(string); ok && completedAtStr != "" {
		if completedAt, err := time.Parse(time.RFC3339, completedAtStr); err == nil {
			updates["completed_at"] = completedAt
		}
	}

	// Handle assigned_to array - convert to JSONB
	if assignedTo, ok := updates["assigned_to"]; ok {
		if assignedTo == nil {
			// If nil or undefined, set to empty JSONB array
			updates["assigned_to"] = []byte("[]")
		} else if assignees, ok := assignedTo.([]interface{}); ok {
			// Convert array to JSON
			if len(assignees) == 0 {
				updates["assigned_to"] = []byte("[]")
			} else {
				if jsonData, err := json.Marshal(assignees); err == nil {
					updates["assigned_to"] = jsonData
				}
			}
		}
	}

	if err := c.service.UpdateTask(id, updates); err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Fetch updated task
	task, _ := c.service.GetTask(id, false)

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"task":    task,
	})
}

// UpdateTaskStatus updates task status
// @Summary Update task status
// @Tags tasks
// @Produce json
// @Param id path string true "Task ID"
// @Param status query string true "New status"
// @Success 200 {object} map[string]interface{}
// @Router /api/tasks/{id}/status [patch]
func (c *TaskController) UpdateTaskStatus(ctx *gin.Context) {
	id := ctx.Param("id")
	status := ctx.Query("status")

	if status == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "status query parameter is required",
		})
		return
	}

	if err := c.service.UpdateTaskStatus(id, status); err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Fetch updated task
	task, _ := c.service.GetTask(id, false)

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"task":    task,
	})
}

// UpdateTaskProgress updates task progress
// @Summary Update task progress
// @Tags tasks
// @Produce json
// @Param id path string true "Task ID"
// @Param progress query int true "Progress percentage (0-100)"
// @Success 200 {object} map[string]interface{}
// @Router /api/tasks/{id}/progress [patch]
func (c *TaskController) UpdateTaskProgress(ctx *gin.Context) {
	id := ctx.Param("id")
	progressStr := ctx.Query("progress")

	if progressStr == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "progress query parameter is required",
		})
		return
	}

	progress, err := strconv.Atoi(progressStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "progress must be an integer",
		})
		return
	}

	if err := c.service.UpdateTaskProgress(id, progress); err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Fetch updated task
	task, _ := c.service.GetTask(id, false)

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"task":    task,
	})
}

// DeleteTask deletes a task
// @Summary Delete task
// @Tags tasks
// @Produce json
// @Param id path string true "Task ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/tasks/{id} [delete]
func (c *TaskController) DeleteTask(ctx *gin.Context) {
	id := ctx.Param("id")

	if err := c.service.DeleteTask(id); err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Task deleted successfully",
	})
}

// ========== Subtask Endpoints ==========

// CreateSubtask creates a new subtask
// @Summary Create a new subtask
// @Tags tasks
// @Accept json
// @Produce json
// @Param id path string true "Parent Task ID"
// @Param subtask body models.Subtask true "Subtask data"
// @Success 200 {object} map[string]interface{}
// @Router /api/tasks/{id}/subtasks [post]
func (c *TaskController) CreateSubtask(ctx *gin.Context) {
	taskID := ctx.Param("id")

	var subtask models.Subtask
	if err := ctx.ShouldBindJSON(&subtask); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request body: " + err.Error(),
		})
		return
	}

	subtask.ParentTaskID = taskID

	if err := c.service.CreateSubtask(&subtask); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"subtask": subtask,
	})
}

// GetSubtasks retrieves all subtasks for a task
// @Summary Get subtasks
// @Tags tasks
// @Produce json
// @Param id path string true "Parent Task ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/tasks/{id}/subtasks [get]
func (c *TaskController) GetSubtasks(ctx *gin.Context) {
	taskID := ctx.Param("id")

	subtasks, err := c.service.GetSubtasksByTask(taskID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success":  true,
		"subtasks": subtasks,
		"count":    len(subtasks),
	})
}

// UpdateSubtask updates a subtask
// @Summary Update subtask
// @Tags tasks
// @Accept json
// @Produce json
// @Param id path string true "Parent Task ID"
// @Param subtask_id path string true "Subtask ID"
// @Param updates body map[string]interface{} true "Subtask updates"
// @Success 200 {object} map[string]interface{}
// @Router /api/tasks/{id}/subtasks/{subtask_id} [put]
func (c *TaskController) UpdateSubtask(ctx *gin.Context) {
	subtaskID := ctx.Param("subtask_id")

	var updates map[string]interface{}
	if err := ctx.ShouldBindJSON(&updates); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request body: " + err.Error(),
		})
		return
	}

	// Parse date fields if present
	if dueDateStr, ok := updates["due_date"].(string); ok && dueDateStr != "" {
		if dueDate, err := time.Parse(time.RFC3339, dueDateStr); err == nil {
			updates["due_date"] = dueDate
		}
	}

	if err := c.service.UpdateSubtask(subtaskID, updates); err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Fetch updated subtask
	subtask, _ := c.service.GetSubtask(subtaskID)

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"subtask": subtask,
	})
}

// DeleteSubtask deletes a subtask
// @Summary Delete subtask
// @Tags tasks
// @Produce json
// @Param id path string true "Parent Task ID"
// @Param subtask_id path string true "Subtask ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/tasks/{id}/subtasks/{subtask_id} [delete]
func (c *TaskController) DeleteSubtask(ctx *gin.Context) {
	subtaskID := ctx.Param("subtask_id")

	if err := c.service.DeleteSubtask(subtaskID); err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Subtask deleted successfully",
	})
}

// ========== Learning Resource Endpoints ==========

// CreateLearningResource creates a new learning resource
// @Summary Create a new learning resource
// @Tags tasks
// @Accept json
// @Produce json
// @Param id path string true "Task ID"
// @Param resource body models.LearningResource true "Learning resource data"
// @Success 200 {object} map[string]interface{}
// @Router /api/tasks/{id}/resources [post]
func (c *TaskController) CreateLearningResource(ctx *gin.Context) {
	taskID := ctx.Param("id")

	var resource models.LearningResource
	if err := ctx.ShouldBindJSON(&resource); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request body: " + err.Error(),
		})
		return
	}

	resource.TaskID = taskID

	if err := c.service.CreateLearningResource(&resource); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success":  true,
		"resource": resource,
	})
}

// GetLearningResources retrieves all learning resources for a task
// @Summary Get learning resources
// @Tags tasks
// @Produce json
// @Param id path string true "Task ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/tasks/{id}/resources [get]
func (c *TaskController) GetLearningResources(ctx *gin.Context) {
	taskID := ctx.Param("id")

	resources, err := c.service.GetLearningResourcesByTask(taskID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success":   true,
		"resources": resources,
		"count":     len(resources),
	})
}

// GetLearningResource retrieves a specific learning resource
// @Summary Get a learning resource
// @Tags tasks
// @Produce json
// @Param id path string true "Task ID"
// @Param resource_id path string true "Resource ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/tasks/{id}/resources/{resource_id} [get]
func (c *TaskController) GetLearningResource(ctx *gin.Context) {
	resourceID := ctx.Param("resource_id")

	resource, err := c.service.GetLearningResource(resourceID)
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Learning resource not found",
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success":  true,
		"resource": resource,
	})
}

// UpdateLearningResource updates a learning resource
// @Summary Update learning resource
// @Tags tasks
// @Accept json
// @Produce json
// @Param id path string true "Task ID"
// @Param resource_id path string true "Resource ID"
// @Param updates body map[string]interface{} true "Resource updates"
// @Success 200 {object} map[string]interface{}
// @Router /api/tasks/{id}/resources/{resource_id} [put]
func (c *TaskController) UpdateLearningResource(ctx *gin.Context) {
	resourceID := ctx.Param("resource_id")

	var updates map[string]interface{}
	if err := ctx.ShouldBindJSON(&updates); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request body: " + err.Error(),
		})
		return
	}

	if err := c.service.UpdateLearningResource(resourceID, updates); err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Fetch updated resource
	resource, _ := c.service.GetLearningResource(resourceID)

	ctx.JSON(http.StatusOK, gin.H{
		"success":  true,
		"resource": resource,
	})
}

// MarkResourceComplete marks a learning resource as complete
// @Summary Mark resource as complete
// @Tags tasks
// @Accept json
// @Produce json
// @Param id path string true "Task ID"
// @Param resource_id path string true "Resource ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/tasks/{id}/resources/{resource_id}/complete [post]
func (c *TaskController) MarkResourceComplete(ctx *gin.Context) {
	resourceID := ctx.Param("resource_id")

	var body struct {
		Notes        string   `json:"notes"`
		KeyTakeaways []string `json:"key_takeaways"`
	}
	ctx.ShouldBindJSON(&body)

	if err := c.service.MarkResourceComplete(resourceID, body.Notes, body.KeyTakeaways); err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Fetch updated resource
	resource, _ := c.service.GetLearningResource(resourceID)

	ctx.JSON(http.StatusOK, gin.H{
		"success":  true,
		"resource": resource,
	})
}

// DeleteLearningResource deletes a learning resource
// @Summary Delete learning resource
// @Tags tasks
// @Produce json
// @Param id path string true "Task ID"
// @Param resource_id path string true "Resource ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/tasks/{id}/resources/{resource_id} [delete]
func (c *TaskController) DeleteLearningResource(ctx *gin.Context) {
	resourceID := ctx.Param("resource_id")

	if err := c.service.DeleteLearningResource(resourceID); err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Learning resource deleted successfully",
	})
}

// ========== Task Dependency Endpoints ==========

// AddTaskDependency adds a dependency between tasks
// @Summary Add task dependency
// @Tags tasks
// @Accept json
// @Produce json
// @Param id path string true "Task ID"
// @Param body body map[string]string true "Dependency data"
// @Success 200 {object} map[string]interface{}
// @Router /api/tasks/{id}/dependencies [post]
func (c *TaskController) AddTaskDependency(ctx *gin.Context) {
	taskID := ctx.Param("id")

	var body struct {
		DependsOnTaskID string `json:"depends_on_task_id" binding:"required"`
	}

	if err := ctx.ShouldBindJSON(&body); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "depends_on_task_id is required",
		})
		return
	}

	if err := c.service.AddTaskDependency(taskID, body.DependsOnTaskID); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	dependencies, _ := c.service.GetTaskDependencies(taskID)

	ctx.JSON(http.StatusOK, gin.H{
		"success":      true,
		"dependencies": dependencies,
	})
}

// GetTaskDependencies retrieves all dependencies for a task
// @Summary Get task dependencies
// @Tags tasks
// @Produce json
// @Param id path string true "Task ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/tasks/{id}/dependencies [get]
func (c *TaskController) GetTaskDependencies(ctx *gin.Context) {
	taskID := ctx.Param("id")

	dependencies, err := c.service.GetTaskDependencies(taskID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success":      true,
		"dependencies": dependencies,
		"count":        len(dependencies),
	})
}

// GetDependentTasks retrieves all tasks that depend on this task
// @Summary Get dependent tasks
// @Tags tasks
// @Produce json
// @Param id path string true "Task ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/tasks/{id}/dependent-tasks [get]
func (c *TaskController) GetDependentTasks(ctx *gin.Context) {
	taskID := ctx.Param("id")

	dependencies, err := c.service.GetDependentTasks(taskID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success":        true,
		"dependent_tasks": dependencies,
		"count":          len(dependencies),
	})
}

// RemoveTaskDependency removes a task dependency
// @Summary Remove task dependency
// @Tags tasks
// @Produce json
// @Param dependency_id path int true "Dependency ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/tasks/dependencies/{dependency_id} [delete]
func (c *TaskController) RemoveTaskDependency(ctx *gin.Context) {
	dependencyIDStr := ctx.Param("dependency_id")
	dependencyID, err := strconv.Atoi(dependencyIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid dependency ID",
		})
		return
	}

	if err := c.service.RemoveTaskDependency(dependencyID); err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Dependency removed successfully",
	})
}

// GetProjectDependencies retrieves all task dependencies for a project
// @Summary Get project dependencies
// @Tags tasks
// @Produce json
// @Param project_id path string true "Project ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/tasks/project/{project_id}/dependencies [get]
func (c *TaskController) GetProjectDependencies(ctx *gin.Context) {
	projectID := ctx.Param("project_id")

	dependencies, err := c.service.GetProjectDependencies(projectID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success":      true,
		"dependencies": dependencies,
		"count":        len(dependencies),
	})
}

// BulkUpdateTasks updates multiple tasks at once
// @Summary Bulk update tasks
// @Tags tasks
// @Accept json
// @Produce json
// @Param body body map[string]interface{} true "Bulk update data"
// @Success 200 {object} map[string]interface{}
// @Router /api/tasks/bulk-update [patch]
func (c *TaskController) BulkUpdateTasks(ctx *gin.Context) {
	var body struct {
		TaskIDs []string               `json:"task_ids" binding:"required"`
		Updates map[string]interface{} `json:"updates" binding:"required"`
	}

	if err := ctx.ShouldBindJSON(&body); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request body: " + err.Error(),
		})
		return
	}

	if len(body.TaskIDs) == 0 {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "task_ids cannot be empty",
		})
		return
	}

	// Parse date fields if present
	if startDateStr, ok := body.Updates["start_date"].(string); ok && startDateStr != "" {
		if startDate, err := time.Parse(time.RFC3339, startDateStr); err == nil {
			body.Updates["start_date"] = startDate
		}
	}
	if dueDateStr, ok := body.Updates["due_date"].(string); ok && dueDateStr != "" {
		if dueDate, err := time.Parse(time.RFC3339, dueDateStr); err == nil {
			body.Updates["due_date"] = dueDate
		}
	}

	updatedCount, err := c.service.BulkUpdateTasks(body.TaskIDs, body.Updates)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Tasks updated successfully",
		"updated": updatedCount,
	})
}

// BulkDeleteTasks deletes multiple tasks at once
// @Summary Bulk delete tasks
// @Tags tasks
// @Accept json
// @Produce json
// @Param body body map[string]interface{} true "Task IDs to delete"
// @Success 200 {object} map[string]interface{}
// @Router /api/tasks/bulk-delete [delete]
func (c *TaskController) BulkDeleteTasks(ctx *gin.Context) {
	var body struct {
		TaskIDs []string `json:"task_ids" binding:"required"`
	}

	if err := ctx.ShouldBindJSON(&body); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request body: " + err.Error(),
		})
		return
	}

	if len(body.TaskIDs) == 0 {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "task_ids cannot be empty",
		})
		return
	}

	deletedCount, err := c.service.BulkDeleteTasks(body.TaskIDs)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Tasks deleted successfully",
		"deleted": deletedCount,
	})
}

// ConvertTaskToMilestone converts a task to a milestone
// @Summary Convert task to milestone
// @Tags tasks
// @Accept json
// @Produce json
// @Param id path string true "Task ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/tasks/{id}/convert-to-milestone [post]
func (c *TaskController) ConvertTaskToMilestone(ctx *gin.Context) {
	taskID := ctx.Param("id")

	milestone, err := c.service.ConvertTaskToMilestone(taskID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success":   true,
		"message":   "Task converted to milestone successfully",
		"milestone": milestone,
	})
}
