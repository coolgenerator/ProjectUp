package controllers

import (
	"net/http"
	"projectup/database"
	"projectup/models"
	"projectup/repositories"
	"projectup/services"
	"projectup/utils"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Resource Controllers

// GetProjectResources retrieves all resources for a project
// @Summary Get project resources
// @Description Retrieves all resources for a specific project
// @Tags ProjectDashboard,Resources
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Success 200 {object} map[string]interface{} "Resources retrieved successfully"
// @Failure 400 {object} map[string]interface{} "Invalid project ID"
// @Failure 500 {object} map[string]interface{} "Failed to retrieve resources"
// @Router /project/{sid}/resources [get]
func GetResources(c *gin.Context) {
	sid := c.Param("sid")
	projectID, err := resolveSIDToProjectID(sid)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project SID"})
		return
	}

	var resources []models.ProjectResource
	if err := database.DB.Where("project_id = ?", projectID).Order("sort_order ASC, created_at DESC").Find(&resources).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve resources"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"resources": resources})
}

// CreateResource creates a new resource
// @Summary Create project resource
// @Description Creates a new resource for a specific project
// @Tags ProjectDashboard,Resources
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param resource body models.Resource true "Resource data"
// @Success 201 {object} map[string]interface{} "Resource created successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request payload"
// @Failure 500 {object} map[string]interface{} "Failed to create resource"
// @Router /project/{sid}/resources [post]
func CreateResourceHandler(c *gin.Context) {
	sid := c.Param("sid")
	projectID, err := resolveSIDToProjectID(sid)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project SID"})
		return
	}

	userID, err := utils.GetUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Check if user is project member
	if !isProjectMember(userID, projectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	var resource models.ProjectResource
	if err := c.ShouldBindJSON(&resource); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resource.ProjectID = projectID

	if err := database.DB.Create(&resource).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create resource"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Resource created successfully", "resource": resource})
}

// UpdateResource updates an existing resource
// @Summary Update project resource
// @Description Updates an existing resource
// @Tags ProjectDashboard,Resources
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param resourceId path int true "Resource ID"
// @Param resource body models.Resource true "Updated resource data"
// @Success 200 {object} map[string]interface{} "Resource updated successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request payload"
// @Failure 404 {object} map[string]interface{} "Resource not found"
// @Failure 500 {object} map[string]interface{} "Failed to update resource"
// @Router /project/{sid}/resources/{resourceId} [put]
func UpdateResourceHandler(c *gin.Context) {
	resourceIDStr := c.Param("resourceId")
	resourceID, err := strconv.ParseUint(resourceIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid resource ID"})
		return
	}

	sid := c.Param("sid")
	projectID, err := resolveSIDToProjectID(sid)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project SID"})
		return
	}

	userID, err := utils.GetUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if !isProjectMember(userID, projectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	var resource models.ProjectResource
	if err := database.DB.Where("resource_id = ? AND project_id = ?", resourceID, projectID).First(&resource).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Resource not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		}
		return
	}

	var updateData models.ProjectResource
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	resource.Title = updateData.Title
	resource.ResourceType = updateData.ResourceType
	resource.URL = updateData.URL
	resource.FilePath = updateData.FilePath
	resource.Description = updateData.Description
	resource.Category = updateData.Category
	resource.Tags = updateData.Tags
	resource.SortOrder = updateData.SortOrder

	if err := database.DB.Save(&resource).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update resource"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Resource updated successfully", "resource": resource})
}

// DeleteResource deletes a resource
// @Summary Delete project resource
// @Description Deletes an existing resource
// @Tags ProjectDashboard,Resources
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param resourceId path int true "Resource ID"
// @Success 200 {object} map[string]interface{} "Resource deleted successfully"
// @Failure 400 {object} map[string]interface{} "Invalid resource ID"
// @Failure 404 {object} map[string]interface{} "Resource not found"
// @Failure 500 {object} map[string]interface{} "Failed to delete resource"
// @Router /project/{sid}/resources/{resourceId} [delete]
func DeleteResourceHandler(c *gin.Context) {
	resourceIDStr := c.Param("resourceId")
	resourceID, err := strconv.ParseUint(resourceIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid resource ID"})
		return
	}

	sid := c.Param("sid")
	projectID, err := resolveSIDToProjectID(sid)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project SID"})
		return
	}

	userID, err := utils.GetUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if !isProjectMember(userID, projectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	if err := database.DB.Where("resource_id = ? AND project_id = ?", resourceID, projectID).Delete(&models.ProjectResource{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete resource"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Resource deleted successfully"})
}

// Workspace Controllers

// GetWorkspaces retrieves all workspaces for a project
// @Summary Get project workspaces
// @Description Retrieves all workspaces for a specific project
// @Tags ProjectDashboard,Workspaces
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Success 200 {object} map[string]interface{} "Workspaces retrieved successfully"
// @Failure 400 {object} map[string]interface{} "Invalid project ID"
// @Failure 500 {object} map[string]interface{} "Failed to retrieve workspaces"
// @Router /project/{sid}/workspaces [get]
func GetWorkspaces(c *gin.Context) {
	sid := c.Param("sid")
	projectID, err := resolveSIDToProjectID(sid)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project SID"})
		return
	}

	var workspaces []models.Workspace
	if err := database.DB.Where("project_id = ?", projectID).Order("sort_order ASC, created_at DESC").Find(&workspaces).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve workspaces"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"workspaces": workspaces})
}

// CreateWorkspaceHandler creates a new workspace
// @Summary Create project workspace
// @Description Creates a new workspace for a specific project
// @Tags ProjectDashboard,Workspaces
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param workspace body models.Workspace true "Workspace data"
// @Success 201 {object} map[string]interface{} "Workspace created successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request payload"
// @Failure 500 {object} map[string]interface{} "Failed to create workspace"
// @Router /project/{sid}/workspaces [post]
func CreateWorkspaceHandler(c *gin.Context) {
	sid := c.Param("sid")
	projectID, err := resolveSIDToProjectID(sid)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project SID"})
		return
	}

	userID, err := utils.GetUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if !isProjectMember(userID, projectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	var workspace models.Workspace
	if err := c.ShouldBindJSON(&workspace); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	workspace.ProjectID = projectID

	if err := database.DB.Create(&workspace).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create workspace"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Workspace created successfully", "workspace": workspace})
}

// UpdateWorkspaceHandler updates an existing workspace
// @Summary Update project workspace
// @Description Updates an existing workspace
// @Tags ProjectDashboard,Workspaces
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param workspaceId path int true "Workspace ID"
// @Param workspace body models.Workspace true "Updated workspace data"
// @Success 200 {object} map[string]interface{} "Workspace updated successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request payload"
// @Failure 404 {object} map[string]interface{} "Workspace not found"
// @Failure 500 {object} map[string]interface{} "Failed to update workspace"
// @Router /project/{sid}/workspaces/{workspaceId} [put]
func UpdateWorkspaceHandler(c *gin.Context) {
	workspaceIDStr := c.Param("workspaceId")
	workspaceID, err := strconv.ParseUint(workspaceIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
		return
	}

	sid := c.Param("sid")
	projectID, err := resolveSIDToProjectID(sid)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project SID"})
		return
	}

	userID, err := utils.GetUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if !isProjectMember(userID, projectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	var workspace models.Workspace
	if err := database.DB.Where("workspace_id = ? AND project_id = ?", workspaceID, projectID).First(&workspace).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Workspace not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		}
		return
	}

	var updateData models.Workspace
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	workspace.Title = updateData.Title
	workspace.Description = updateData.Description
	workspace.URL = updateData.URL
	workspace.Content = updateData.Content
	workspace.Category = updateData.Category
	workspace.Icon = updateData.Icon
	workspace.Color = updateData.Color
	workspace.SortOrder = updateData.SortOrder

	if err := database.DB.Save(&workspace).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update workspace"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Workspace updated successfully", "workspace": workspace})
}

// DeleteWorkspaceHandler deletes a workspace
// @Summary Delete project workspace
// @Description Deletes an existing workspace
// @Tags ProjectDashboard,Workspaces
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param workspaceId path int true "Workspace ID"
// @Success 200 {object} map[string]interface{} "Workspace deleted successfully"
// @Failure 400 {object} map[string]interface{} "Invalid workspace ID"
// @Failure 404 {object} map[string]interface{} "Workspace not found"
// @Failure 500 {object} map[string]interface{} "Failed to delete workspace"
// @Router /project/{sid}/workspaces/{workspaceId} [delete]
func DeleteWorkspaceHandler(c *gin.Context) {
	workspaceIDStr := c.Param("workspaceId")
	workspaceID, err := strconv.ParseUint(workspaceIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
		return
	}

	sid := c.Param("sid")
	projectID, err := resolveSIDToProjectID(sid)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project SID"})
		return
	}

	userID, err := utils.GetUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if !isProjectMember(userID, projectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	if err := database.DB.Where("workspace_id = ? AND project_id = ?", workspaceID, projectID).Delete(&models.Workspace{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete workspace"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Workspace deleted successfully"})
}

// Milestone Controllers

// GetMilestones retrieves all milestones for a project
// @Summary Get project milestones
// @Description Retrieves all milestones for a specific project
// @Tags ProjectDashboard,Milestones
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Success 200 {object} map[string]interface{} "Milestones retrieved successfully"
// @Failure 400 {object} map[string]interface{} "Invalid project ID"
// @Failure 500 {object} map[string]interface{} "Failed to retrieve milestones"
// @Router /project/{sid}/milestones [get]
func GetMilestones(c *gin.Context) {
	sid := c.Param("sid")
	projectID, err := resolveSIDToProjectID(sid)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project SID"})
		return
	}

	var milestones []models.Milestone
	if err := database.DB.Where("project_id = ?", projectID).Order("sort_order ASC, due_date ASC, created_at DESC").Find(&milestones).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve milestones"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"milestones": milestones})
}

// CreateMilestoneHandler creates a new milestone
// @Summary Create project milestone
// @Description Creates a new milestone for a specific project
// @Tags ProjectDashboard,Milestones
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param milestone body models.Milestone true "Milestone data"
// @Success 201 {object} map[string]interface{} "Milestone created successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request payload"
// @Failure 500 {object} map[string]interface{} "Failed to create milestone"
// @Router /project/{sid}/milestones [post]
func CreateMilestoneHandler(c *gin.Context) {
	sid := c.Param("sid")
	projectID, err := resolveSIDToProjectID(sid)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project SID"})
		return
	}

	userID, err := utils.GetUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if !isProjectMember(userID, projectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	var milestone models.Milestone
	if err := c.ShouldBindJSON(&milestone); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	milestone.ProjectID = projectID

	if err := database.DB.Create(&milestone).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create milestone"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Milestone created successfully", "milestone": milestone})
}

// UpdateMilestoneHandler updates an existing milestone
// @Summary Update project milestone
// @Description Updates an existing milestone
// @Tags ProjectDashboard,Milestones
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param milestoneId path int true "Milestone ID"
// @Param milestone body models.Milestone true "Updated milestone data"
// @Success 200 {object} map[string]interface{} "Milestone updated successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request payload"
// @Failure 404 {object} map[string]interface{} "Milestone not found"
// @Failure 500 {object} map[string]interface{} "Failed to update milestone"
// @Router /project/{sid}/milestones/{milestoneId} [put]
func UpdateMilestoneHandler(c *gin.Context) {
	milestoneIDStr := c.Param("milestoneId")
	milestoneID, err := strconv.ParseUint(milestoneIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid milestone ID"})
		return
	}

	sid := c.Param("sid")
	projectID, err := resolveSIDToProjectID(sid)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project SID"})
		return
	}

	userID, err := utils.GetUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if !isProjectMember(userID, projectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	var milestone models.Milestone
	if err := database.DB.Where("milestone_id = ? AND project_id = ?", milestoneID, projectID).First(&milestone).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Milestone not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		}
		return
	}

	// Parse the request body as a map to detect which fields were actually sent
	var updateData map[string]interface{}
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Only update fields that were provided in the request
	updates := make(map[string]interface{})

	if title, ok := updateData["title"]; ok {
		updates["title"] = title
	}
	if description, ok := updateData["description"]; ok {
		updates["description"] = description
	}
	if startDate, ok := updateData["start_date"]; ok {
		updates["start_date"] = startDate
	}
	if dueDate, ok := updateData["due_date"]; ok {
		updates["due_date"] = dueDate
	}
	if status, ok := updateData["status"]; ok {
		updates["status"] = status
	}
	if priority, ok := updateData["priority"]; ok {
		updates["priority"] = priority
	}
	if category, ok := updateData["category"]; ok {
		updates["category"] = category
	}
	if completed, ok := updateData["completed"]; ok {
		updates["completed"] = completed
	}
	if sectionID, ok := updateData["section_id"]; ok {
		updates["section_id"] = sectionID
	}
	if sectionOrder, ok := updateData["section_order"]; ok {
		updates["section_order"] = sectionOrder
	}
	if sortOrder, ok := updateData["sort_order"]; ok {
		updates["sort_order"] = sortOrder
	}
	if parentID, ok := updateData["parent_id"]; ok {
		updates["parent_id"] = parentID
	}
	if customAttributes, ok := updateData["custom_attributes"]; ok {
		updates["custom_attributes"] = customAttributes
	}

	// Use GORM's Updates to only update provided fields
	if err := database.DB.Model(&milestone).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update milestone"})
		return
	}

	// Reload the milestone to get the updated data
	if err := database.DB.Where("milestone_id = ?", milestoneID).First(&milestone).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reload milestone"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Milestone updated successfully", "milestone": milestone})
}

// DeleteMilestoneHandler deletes a milestone
// @Summary Delete project milestone
// @Description Deletes an existing milestone
// @Tags ProjectDashboard,Milestones
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param milestoneId path int true "Milestone ID"
// @Success 200 {object} map[string]interface{} "Milestone deleted successfully"
// @Failure 400 {object} map[string]interface{} "Invalid milestone ID"
// @Failure 404 {object} map[string]interface{} "Milestone not found"
// @Failure 500 {object} map[string]interface{} "Failed to delete milestone"
// @Router /project/{sid}/milestones/{milestoneId} [delete]
func DeleteMilestoneHandler(c *gin.Context) {
	milestoneIDStr := c.Param("milestoneId")
	milestoneID, err := strconv.ParseUint(milestoneIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid milestone ID"})
		return
	}

	sid := c.Param("sid")
	projectID, err := resolveSIDToProjectID(sid)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project SID"})
		return
	}

	userID, err := utils.GetUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if !isProjectMember(userID, projectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	if err := database.DB.Where("milestone_id = ? AND project_id = ?", milestoneID, projectID).Delete(&models.Milestone{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete milestone"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Milestone deleted successfully"})
}

// ConvertMilestoneToTask converts a milestone to a task
func ConvertMilestoneToTask(c *gin.Context) {
	milestoneIDStr := c.Param("milestoneId")
	milestoneID, err := strconv.ParseUint(milestoneIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid milestone ID"})
		return
	}

	sid := c.Param("sid")
	projectID, err := resolveSIDToProjectID(sid)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project SID"})
		return
	}

	userID, err := utils.GetUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if !isProjectMember(userID, projectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	// Create task repository and service
	taskRepo := repositories.NewTaskRepository(database.DB)
	taskService := services.NewTaskService(taskRepo)
	task, err := taskService.ConvertMilestoneToTask(uint(milestoneID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Milestone converted to task successfully",
		"task":    task,
	})
}

// Helper functions

// isProjectMember checks if a user is a member of a project
func isProjectMember(userID, projectID uint) bool {
	var count int64
	database.DB.Model(&models.ProjectMember{}).Where("user_id = ? AND project_id = ?", userID, projectID).Count(&count)
	if count > 0 {
		return true
	}

	// Also check if user is the project owner
	var project models.Project
	if err := database.DB.Where("project_id = ? AND owner_id = ?", projectID, userID).First(&project).Error; err == nil {
		return true
	}

	return false
}
