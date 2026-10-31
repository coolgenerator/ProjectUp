package controllers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"projectup/database"
	"projectup/helper"
	"projectup/models"
	"projectup/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// UpdateProjectMemberWorkspace updates a member's workspace assignment
// @Summary Update member workspace
// @Description Adds or updates a member's workspace assignment
// @Tags Project Members
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param userID path int true "User ID"
// @Param body body object true "Workspace update"
// @Success 200 {object} map[string]interface{} "Workspace updated successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request"
// @Failure 403 {object} map[string]interface{} "Permission denied"
// @Failure 404 {object} map[string]interface{} "Member or workspace not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /project/{sid}/members/{userID}/workspace [put]
func UpdateProjectMemberWorkspace() gin.HandlerFunc {
	return func(c *gin.Context) {
		sid := c.Param("sid")
		if sid == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Project SID is required"})
			return
		}

		memberUserID, err := strconv.ParseUint(c.Param("userID"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
			return
		}

		// Get authenticated user ID
		userID := c.GetUint("userID")

		// Get the project
		var project models.Project
		if err := database.DB.Where("sid = ?", sid).First(&project).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch project"})
			}
			return
		}

		// Check if user has admin role
		if err := services.CheckAdminRole(project.ProjectID, userID); err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}

		// Parse request body
		type WorkspaceUpdate struct {
			GroupID uint   `json:"group_id" binding:"required"`
			Role    string `json:"role"`
		}
		var req WorkspaceUpdate
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		// Validate workspace exists and belongs to this project
		var workspace models.ProjectGroup
		if err := database.DB.Where("group_id = ? AND project_id = ?", req.GroupID, project.ProjectID).First(&workspace).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, gin.H{"error": "Workspace not found"})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch workspace"})
			}
			return
		}

		// Default role to member if not specified
		if req.Role == "" {
			req.Role = "member"
		}

		// Check if user is already in this workspace
		var existing models.ProjectGroupMember
		err = database.DB.Where("user_id = ? AND group_id = ? AND project_id = ?",
			uint(memberUserID), req.GroupID, project.ProjectID).First(&existing).Error

		if err == nil {
			// Update existing membership
			result := database.DB.Model(&existing).Update("role", req.Role)
			if result.Error != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update workspace membership"})
				return
			}
		} else if err == gorm.ErrRecordNotFound {
			// Create new workspace membership
			groupMember := &models.ProjectGroupMember{
				ProjectID: project.ProjectID,
				UserID:    uint(memberUserID),
				GroupID:   req.GroupID,
				Role:      req.Role,
			}
			if err := database.DB.Create(groupMember).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add member to workspace"})
				return
			}
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message":    "Workspace assignment updated successfully",
			"group_id":   req.GroupID,
			"group_name": workspace.Name,
			"role":       req.Role,
		})
	}
}

// RemoveProjectMemberFromWorkspace removes a member from a specific workspace
// @Summary Remove member from workspace
// @Description Removes a member from a specific workspace
// @Tags Project Members
// @Security BearerAuth
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param userID path int true "User ID"
// @Param groupID path int true "Group ID"
// @Success 200 {object} map[string]interface{} "Member removed from workspace successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request"
// @Failure 403 {object} map[string]interface{} "Permission denied"
// @Failure 404 {object} map[string]interface{} "Member or workspace not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /project/{sid}/members/{userID}/workspace/{groupID} [delete]
func RemoveProjectMemberFromWorkspace() gin.HandlerFunc {
	return func(c *gin.Context) {
		sid := c.Param("sid")
		if sid == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Project SID is required"})
			return
		}

		memberUserID, err := strconv.ParseUint(c.Param("userID"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
			return
		}

		groupID, err := strconv.ParseUint(c.Param("groupID"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
			return
		}

		// Get authenticated user ID
		userID := c.GetUint("userID")

		// Get the project
		var project models.Project
		if err := database.DB.Where("sid = ?", sid).First(&project).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch project"})
			}
			return
		}

		// Check if user has admin role
		if err := services.CheckAdminRole(project.ProjectID, userID); err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}

		// Don't allow removing Main workspace membership
		var workspace models.ProjectGroup
		if err := database.DB.Where("group_id = ? AND project_id = ?", uint(groupID), project.ProjectID).First(&workspace).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Workspace not found"})
			return
		}

		if workspace.IsMain {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot remove member from Main workspace"})
			return
		}

		// Remove from workspace
		result := database.DB.Where("user_id = ? AND group_id = ? AND project_id = ?",
			uint(memberUserID), uint(groupID), project.ProjectID).
			Delete(&models.ProjectGroupMember{})

		if result.Error != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove member from workspace"})
			return
		}

		if result.RowsAffected == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Member not found in workspace"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Member removed from workspace successfully",
		})
	}
}

// GetMemberWorkspaces returns all workspaces a member belongs to
// @Summary Get member workspaces
// @Description Retrieves all workspaces a member is part of
// @Tags Project Members
// @Security BearerAuth
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param userID path int true "User ID"
// @Success 200 {object} map[string]interface{} "Workspaces retrieved successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request"
// @Failure 403 {object} map[string]interface{} "Permission denied"
// @Failure 404 {object} map[string]interface{} "Project not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /project/{sid}/members/{userID}/workspaces [get]
func GetMemberWorkspaces() gin.HandlerFunc {
	return func(c *gin.Context) {
		sid := c.Param("sid")
		if sid == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Project SID is required"})
			return
		}

		memberUserID, err := strconv.ParseUint(c.Param("userID"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
			return
		}

		// Get authenticated user ID
		userID := c.GetUint("userID")

		// Get the project
		var project models.Project
		if err := database.DB.Where("sid = ?", sid).First(&project).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch project"})
			}
			return
		}

		// Check if user has view permission
		_, _, err = services.CheckProjectAccessOrOwnership(project.ProjectID, userID, helper.PermissionView)
		if err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}

		// Get member's workspaces
		type WorkspaceInfo struct {
			GroupID       uint   `json:"group_id"`
			GroupName     string `json:"group_name"`
			WorkspaceType string `json:"workspace_type"`
			IsMain        bool   `json:"is_main"`
			Role          string `json:"role"`
		}

		var workspaces []WorkspaceInfo
		err = database.DB.Table("project_group_members").
			Select("project_groups.group_id, project_groups.name as group_name, project_groups.workspace_type, project_groups.is_main, project_group_members.role").
			Joins("JOIN project_groups ON project_group_members.group_id = project_groups.group_id").
			Where("project_group_members.user_id = ? AND project_group_members.project_id = ?", uint(memberUserID), project.ProjectID).
			Scan(&workspaces).Error

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch member workspaces"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"workspaces": workspaces,
			"count":      len(workspaces),
		})
	}
}

// RemoveProjectMember removes a member from a project
// @Summary Remove a member from a project
// @Description Removes a member from the project (admin only)
// @Tags Project Members
// @Security BearerAuth
// @Param sid path string true "Project SID"
// @Param userId path int true "User ID to remove"
// @Success 200 {object} map[string]interface{} "Member removed successfully"
// @Failure 400 {object} map[string]interface{} "Invalid input"
// @Failure 403 {object} map[string]interface{} "Insufficient permissions"
// @Failure 404 {object} map[string]interface{} "Project or member not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /projects/{sid}/members/{userId} [delete]
func RemoveProjectMember() gin.HandlerFunc {
	return func(c *gin.Context) {
		sid := c.Param("sid")
		if sid == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Project SID is required"})
			return
		}

		memberUserID, err := strconv.ParseUint(c.Param("userId"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
			return
		}

		// Get authenticated user ID
		userID := c.GetUint("userID")

		// Get the project
		var project models.Project
		if err := database.DB.Where("sid = ?", sid).First(&project).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch project"})
			}
			return
		}

		// Check if user has admin role
		if err := services.CheckAdminRole(project.ProjectID, userID); err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}

		// Prevent removing the project owner
		if project.GetUserID() == uint(memberUserID) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot remove the project owner"})
			return
		}

		// Soft delete: Set removed_at timestamp instead of hard delete
		now := time.Now()
		result := database.DB.Model(&models.ProjectMember{}).
			Where("project_id = ? AND user_id = ? AND removed_at IS NULL", project.ProjectID, uint(memberUserID)).
			Update("removed_at", now)

		if result.Error != nil {
			fmt.Printf("RemoveProjectMember: Error updating removed_at for user %d in project %d: %v\n", memberUserID, project.ProjectID, result.Error)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove member"})
			return
		}

		if result.RowsAffected == 0 {
			fmt.Printf("RemoveProjectMember: No rows affected when removing user %d from project %d\n", memberUserID, project.ProjectID)
			c.JSON(http.StatusNotFound, gin.H{"error": "Member not found in project or already removed"})
			return
		}

		fmt.Printf("RemoveProjectMember: Successfully set removed_at for user %d in project %d (rows affected: %d)\n", memberUserID, project.ProjectID, result.RowsAffected)

		// Also remove from all project groups (hard delete for group memberships)
		database.DB.Where("project_id = ? AND user_id = ?", project.ProjectID, uint(memberUserID)).
			Delete(&models.ProjectGroupMember{})

		c.JSON(http.StatusOK, gin.H{"message": "Member removed successfully"})
	}
}
