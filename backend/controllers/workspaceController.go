package controllers

import (
	"net/http"
	"projectup/models"
	"projectup/services"
	"strconv"

	"github.com/gin-gonic/gin"
)

// GetUserWorkspaces returns all workspaces user can access
// @Summary Get user's accessible workspaces
// @Description Returns all workspaces the user is a member of, plus child workspaces if user is in Main workspace
// @Tags Workspaces
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Success 200 {object} map[string]interface{} "List of workspaces"
// @Failure 500 {object} map[string]interface{} "Error message"
// @Router /api/projects/{sid}/workspaces [get]
func GetUserWorkspaces() gin.HandlerFunc {
	return func(c *gin.Context) {
		workspaceService := services.NewWorkspaceService()

		userID := c.GetUint("userID")
		projectSid := c.Param("sid")
		projectID, err := resolveSIDToProjectID(projectSid)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
			return
		}

		workspaces, err := workspaceService.GetUserAccessibleWorkspaces(userID, projectID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Check if user is in main workspace
		inMain, mainWorkspace, _ := workspaceService.IsUserInMainWorkspace(userID, projectID)

		c.JSON(http.StatusOK, gin.H{
			"workspaces":       workspaces,
			"is_in_main":       inMain,
			"main_workspace":   mainWorkspace,
		})
	}
}

// GetWorkspaceDetails returns details of a specific workspace
// @Summary Get workspace details
// @Description Returns detailed information about a specific workspace
// @Tags Workspaces
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param workspaceId path int true "Workspace ID"
// @Success 200 {object} models.ProjectGroup "Workspace details"
// @Failure 403 {object} map[string]interface{} "No access to workspace"
// @Failure 404 {object} map[string]interface{} "Workspace not found"
// @Router /api/projects/{sid}/workspaces/{workspaceId} [get]
func GetWorkspaceDetails() gin.HandlerFunc {
	return func(c *gin.Context) {
		workspaceService := services.NewWorkspaceService()

		userID := c.GetUint("userID")
		projectSid := c.Param("sid")
		projectID, err := resolveSIDToProjectID(projectSid)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
			return
		}
		workspaceID, err := strconv.ParseUint(c.Param("workspaceId"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
			return
		}

		// Check access
		canAccess, role, err := workspaceService.CanUserAccessWorkspace(userID, projectID, uint(workspaceID))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		if !canAccess {
			c.JSON(http.StatusForbidden, gin.H{"error": "No access to this workspace"})
			return
		}

		// Get workspace details
		var workspace models.ProjectGroup
		if err := workspaceService.GetWorkspaceByID(uint(workspaceID), &workspace); err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Workspace not found"})
			return
		}

		// Get member count
		memberCount, _ := workspaceService.CountMembers(uint(workspaceID))

		c.JSON(http.StatusOK, gin.H{
			"workspace":    workspace,
			"user_role":    role,
			"member_count": memberCount,
		})
	}
}

// CreateChildWorkspace creates a new child workspace
// @Summary Create child workspace
// @Description Creates a new child workspace under a parent
// @Tags Workspaces
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param workspaceId path int true "Parent Workspace ID"
// @Param workspace body CreateWorkspaceRequest true "Workspace details"
// @Success 201 {object} models.ProjectGroup "Created workspace"
// @Failure 400 {object} map[string]interface{} "Invalid request"
// @Failure 403 {object} map[string]interface{} "No permission to create workspace"
// @Router /api/projects/{sid}/workspaces/{workspaceId}/children [post]
func CreateChildWorkspace() gin.HandlerFunc {
	return func(c *gin.Context) {
		workspaceService := services.NewWorkspaceService()

		userID := c.GetUint("userID")
		projectSid := c.Param("sid")
		projectID, err := resolveSIDToProjectID(projectSid)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
			return
		}
		parentID, err := strconv.ParseUint(c.Param("workspaceId"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid parent workspace ID"})
			return
		}

		var req CreateWorkspaceRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Check if user can create workspaces in parent (must be admin of parent)
		role, err := workspaceService.GetUserRole(userID, uint(parentID))
		if err != nil || role != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Only admin can create child workspaces"})
			return
		}

		// Create workspace
		parentIDUint := uint(parentID)
		workspace := &models.ProjectGroup{
			ProjectID:     projectID,
			ParentID:      &parentIDUint,
			Name:          req.Name,
			Description:   req.Description,
			WorkspaceType: req.WorkspaceType,
			Color:         req.Color,
			Icon:          req.Icon,
		}

		if err := workspaceService.CreateWorkspace(workspace); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"message":   "Workspace created successfully",
			"workspace": workspace,
		})
	}
}

// UpdateHierarchicalWorkspace updates workspace details
// @Summary Update workspace
// @Description Updates workspace name, description, color, icon
// @Tags Workspaces
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param workspaceId path int true "Workspace ID"
// @Param workspace body UpdateWorkspaceRequest true "Updated workspace details"
// @Success 200 {object} models.ProjectGroup "Updated workspace"
// @Failure 403 {object} map[string]interface{} "No permission to update workspace"
// @Router /api/projects/{sid}/workspaces/{workspaceId} [put]
func UpdateHierarchicalWorkspace() gin.HandlerFunc {
	return func(c *gin.Context) {
		workspaceService := services.NewWorkspaceService()

		userID := c.GetUint("userID")
		workspaceID, err := strconv.ParseUint(c.Param("workspaceId"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
			return
		}

		var req UpdateWorkspaceRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Check if user is admin of workspace
		role, err := workspaceService.GetUserRole(userID, uint(workspaceID))
		if err != nil || role != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Only admin can update workspace"})
			return
		}

		// Get workspace
		var workspace models.ProjectGroup
		if err := workspaceService.GetWorkspaceByID(uint(workspaceID), &workspace); err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Workspace not found"})
			return
		}

		// Update fields
		if req.Name != nil {
			workspace.Name = *req.Name
		}
		if req.Description != nil {
			workspace.Description = req.Description
		}
		if req.Color != nil {
			workspace.Color = req.Color
		}
		if req.Icon != nil {
			workspace.Icon = req.Icon
		}

		if err := workspaceService.UpdateWorkspace(&workspace); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message":   "Workspace updated successfully",
			"workspace": workspace,
		})
	}
}

// DeleteHierarchicalWorkspace deletes a workspace
// @Summary Delete workspace
// @Description Deletes a child workspace (cannot delete Main workspace)
// @Tags Workspaces
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param workspaceId path int true "Workspace ID"
// @Success 200 {object} map[string]interface{} "Success message"
// @Failure 403 {object} map[string]interface{} "No permission or cannot delete Main workspace"
// @Router /api/projects/{sid}/workspaces/{workspaceId} [delete]
func DeleteHierarchicalWorkspace() gin.HandlerFunc {
	return func(c *gin.Context) {
		workspaceService := services.NewWorkspaceService()

		userID := c.GetUint("userID")
		workspaceID, err := strconv.ParseUint(c.Param("workspaceId"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
			return
		}

		// Check if user is admin of workspace
		role, err := workspaceService.GetUserRole(userID, uint(workspaceID))
		if err != nil || role != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Only admin can delete workspace"})
			return
		}

		if err := workspaceService.DeleteWorkspace(uint(workspaceID)); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Workspace deleted successfully"})
	}
}

// GetWorkspaceMembers returns all members of a workspace
// @Summary Get workspace members
// @Description Returns list of users who are members of this workspace
// @Tags Workspaces
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param workspaceId path int true "Workspace ID"
// @Success 200 {object} map[string]interface{} "List of members with roles"
// @Failure 403 {object} map[string]interface{} "No access to workspace"
// @Router /api/projects/{sid}/workspaces/{workspaceId}/members [get]
func GetWorkspaceMembers() gin.HandlerFunc {
	return func(c *gin.Context) {
		workspaceService := services.NewWorkspaceService()

		userID := c.GetUint("userID")
		projectSid := c.Param("sid")
		projectID, err := resolveSIDToProjectID(projectSid)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
			return
		}
		workspaceID, err := strconv.ParseUint(c.Param("workspaceId"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
			return
		}

		// Check if user can access workspace
		canAccess, _, err := workspaceService.CanUserAccessWorkspace(userID, projectID, uint(workspaceID))
		if err != nil || !canAccess {
			c.JSON(http.StatusForbidden, gin.H{"error": "No access to this workspace"})
			return
		}

		// Get members with their roles
		members, err := workspaceService.GetWorkspaceMembersWithRoles(uint(workspaceID))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"members": members})
	}
}

// AddWorkspaceMember adds a user to a workspace
// @Summary Add workspace member
// @Description Adds a user to a workspace with a specific role
// @Tags Workspaces
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param workspaceId path int true "Workspace ID"
// @Param member body AddMemberRequest true "Member details"
// @Success 201 {object} map[string]interface{} "Success message"
// @Failure 403 {object} map[string]interface{} "No permission to add members"
// @Router /api/projects/{sid}/workspaces/{workspaceId}/members [post]
func AddWorkspaceMember() gin.HandlerFunc {
	return func(c *gin.Context) {
		workspaceService := services.NewWorkspaceService()

		userID := c.GetUint("userID")
		projectSid := c.Param("sid")
		projectID, err := resolveSIDToProjectID(projectSid)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
			return
		}
		workspaceID, err := strconv.ParseUint(c.Param("workspaceId"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
			return
		}

		var req AddMemberRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Check if user is admin of workspace
		role, err := workspaceService.GetUserRole(userID, uint(workspaceID))
		if err != nil || role != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Only admin can add members"})
			return
		}

		// Add member
		if err := workspaceService.AddWorkspaceMember(projectID, req.UserID, uint(workspaceID), req.Role); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"message": "Member added successfully"})
	}
}

// UpdateWorkspaceMemberRole updates a member's role in a workspace
// @Summary Update member role
// @Description Updates a workspace member's role
// @Tags Workspaces
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param workspaceId path int true "Workspace ID"
// @Param userId path int true "User ID"
// @Param role body UpdateRoleRequest true "New role"
// @Success 200 {object} map[string]interface{} "Success message"
// @Failure 403 {object} map[string]interface{} "No permission to update roles"
// @Router /api/projects/{sid}/workspaces/{workspaceId}/members/{userId} [put]
func UpdateWorkspaceMemberRole() gin.HandlerFunc {
	return func(c *gin.Context) {
		workspaceService := services.NewWorkspaceService()

		userID := c.GetUint("userID")
		workspaceID, _ := strconv.ParseUint(c.Param("workspaceId"), 10, 32)
		targetUserID, _ := strconv.ParseUint(c.Param("userId"), 10, 32)

		var req UpdateRoleRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Check if user is admin of workspace
		role, err := workspaceService.GetUserRole(userID, uint(workspaceID))
		if err != nil || role != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Only admin can update member roles"})
			return
		}

		// Update role
		if err := workspaceService.UpdateMemberRole(uint(targetUserID), uint(workspaceID), req.Role); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Member role updated successfully"})
	}
}

// RemoveWorkspaceMember removes a user from a workspace
// @Summary Remove workspace member
// @Description Removes a user from a workspace
// @Tags Workspaces
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param workspaceId path int true "Workspace ID"
// @Param userId path int true "User ID"
// @Success 200 {object} map[string]interface{} "Success message"
// @Failure 403 {object} map[string]interface{} "No permission to remove members"
// @Router /api/projects/{sid}/workspaces/{workspaceId}/members/{userId} [delete]
func RemoveWorkspaceMember() gin.HandlerFunc {
	return func(c *gin.Context) {
		workspaceService := services.NewWorkspaceService()

		userID := c.GetUint("userID")
		projectSid := c.Param("sid")
		projectID, err := resolveSIDToProjectID(projectSid)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
			return
		}
		workspaceID, _ := strconv.ParseUint(c.Param("workspaceId"), 10, 32)
		targetUserID, _ := strconv.ParseUint(c.Param("userId"), 10, 32)

		// Check if user is admin of workspace
		role, err := workspaceService.GetUserRole(userID, uint(workspaceID))
		if err != nil || role != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Only admin can remove members"})
			return
		}

		if err := workspaceService.RemoveWorkspaceMember(projectID, uint(targetUserID), uint(workspaceID)); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Member removed successfully"})
	}
}

// GetWorkspaceMilestones returns milestones for a workspace
// @Summary Get workspace milestones
// @Description Returns all milestones in a specific workspace
// @Tags Workspaces
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param workspaceId path int true "Workspace ID"
// @Success 200 {object} map[string]interface{} "List of milestones"
// @Failure 403 {object} map[string]interface{} "No access to workspace"
// @Router /api/projects/{sid}/workspaces/{workspaceId}/milestones [get]
func GetWorkspaceMilestones() gin.HandlerFunc {
	return func(c *gin.Context) {
		contentService := services.NewContentService()

		userID := c.GetUint("userID")
		projectSid := c.Param("sid")
		projectID, err := resolveSIDToProjectID(projectSid)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
			return
		}
		workspaceID, _ := strconv.ParseUint(c.Param("workspaceId"), 10, 32)

		milestones, err := contentService.GetWorkspaceMilestones(userID, projectID, uint(workspaceID))
		if err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"milestones": milestones})
	}
}

// GetWorkspaceIdeaTrees returns idea trees for a workspace
// @Summary Get workspace idea trees
// @Description Returns all idea trees in a specific workspace
// @Tags Workspaces
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param workspaceId path int true "Workspace ID"
// @Success 200 {object} map[string]interface{} "List of idea trees"
// @Failure 403 {object} map[string]interface{} "No access to workspace"
// @Router /api/projects/{sid}/workspaces/{workspaceId}/idea-trees [get]
func GetWorkspaceIdeaTrees() gin.HandlerFunc {
	return func(c *gin.Context) {
		contentService := services.NewContentService()

		userID := c.GetUint("userID")
		projectSid := c.Param("sid")
		projectID, err := resolveSIDToProjectID(projectSid)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
			return
		}
		workspaceID, _ := strconv.ParseUint(c.Param("workspaceId"), 10, 32)

		trees, err := contentService.GetWorkspaceIdeaTrees(userID, projectID, uint(workspaceID))
		if err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"idea_trees": trees})
	}
}

// GetWorkspaceResources returns resources for a workspace
// @Summary Get workspace resources
// @Description Returns all resources in a specific workspace
// @Tags Workspaces
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param workspaceId path int true "Workspace ID"
// @Success 200 {object} map[string]interface{} "List of resources"
// @Failure 403 {object} map[string]interface{} "No access to workspace"
// @Router /api/projects/{sid}/workspaces/{workspaceId}/resources [get]
func GetWorkspaceResources() gin.HandlerFunc {
	return func(c *gin.Context) {
		contentService := services.NewContentService()

		userID := c.GetUint("userID")
		projectSid := c.Param("sid")
		projectID, err := resolveSIDToProjectID(projectSid)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
			return
		}
		workspaceID, _ := strconv.ParseUint(c.Param("workspaceId"), 10, 32)

		resources, err := contentService.GetWorkspaceResources(userID, projectID, uint(workspaceID))
		if err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"resources": resources})
	}
}

// GetProjectDashboard returns dashboard data with workspace summaries
// @Summary Get project dashboard
// @Description Returns overview of all accessible workspaces with stats
// @Tags Workspaces
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Success 200 {object} map[string]interface{} "Dashboard data"
// @Router /api/projects/{sid}/dashboard [get]
func GetProjectDashboard() gin.HandlerFunc {
	return func(c *gin.Context) {
		workspaceService := services.NewWorkspaceService()
		contentService := services.NewContentService()

		userID := c.GetUint("userID")
		projectSid := c.Param("sid")
		projectID, err := resolveSIDToProjectID(projectSid)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
			return
		}

		// Get accessible workspaces
		workspaces, err := workspaceService.GetUserAccessibleWorkspaces(userID, projectID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Get stats for each workspace
		type WorkspaceSummary struct {
			Workspace      *models.ProjectGroup `json:"workspace"`
			MilestoneCount int64                `json:"milestone_count"`
			IdeaTreeCount  int64                `json:"idea_tree_count"`
			ResourceCount  int64                `json:"resource_count"`
			MemberCount    int64                `json:"member_count"`
		}

		summaries := make([]WorkspaceSummary, 0, len(workspaces))
		for _, ws := range workspaces {
			milestoneCount, _ := contentService.CountWorkspaceMilestones(ws.GroupID)
			ideaTreeCount, _ := contentService.CountWorkspaceIdeaTrees(ws.GroupID)
			resourceCount, _ := contentService.CountWorkspaceResources(ws.GroupID)
			memberCount, _ := workspaceService.CountMembers(ws.GroupID)

			summaries = append(summaries, WorkspaceSummary{
				Workspace:      ws,
				MilestoneCount: milestoneCount,
				IdeaTreeCount:  ideaTreeCount,
				ResourceCount:  resourceCount,
				MemberCount:    memberCount,
			})
		}

		c.JSON(http.StatusOK, gin.H{
			"workspace_summaries": summaries,
		})
	}
}

// Request/Response structs
type CreateWorkspaceRequest struct {
	Name          string  `json:"name" binding:"required"`
	Description   *string `json:"description"`
	WorkspaceType string  `json:"workspace_type" binding:"required"`
	Color         *string `json:"color"`
	Icon          *string `json:"icon"`
}

type UpdateWorkspaceRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	Color       *string `json:"color"`
	Icon        *string `json:"icon"`
}

type AddMemberRequest struct {
	UserID uint   `json:"user_id" binding:"required"`
	Role   string `json:"role" binding:"required"`
}

type UpdateRoleRequest struct {
	Role string `json:"role" binding:"required"`
}
