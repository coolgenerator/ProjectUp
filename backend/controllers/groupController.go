package controllers

import (
	"net/http"
	"strconv"

	"projectup/models"
	"projectup/repositories"
	"projectup/services"

	"github.com/gin-gonic/gin"
)

// GetProjectGroups handles retrieving all groups for a project
func GetProjectGroups() gin.HandlerFunc {
	return func(c *gin.Context) {
		projectSid := c.Param("sid")
		projectID, err := resolveSIDToProjectID(projectSid)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
			return
		}

		groupRepo := repositories.NewGroupRepository()
		groupService := services.NewGroupService(groupRepo)

		groups, err := groupService.GetProjectGroups(projectID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch groups"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"groups": groups})
	}
}

// CreateGroup handles creating a new group
func CreateGroup() gin.HandlerFunc {
	return func(c *gin.Context) {
		projectSid := c.Param("sid")
		projectID, err := resolveSIDToProjectID(projectSid)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
			return
		}

		// Get authenticated user ID
		userID := c.GetUint("userID")

		// Check if user has admin role
		if err := services.CheckAdminRole(projectID, userID); err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}

		var request struct {
			Name        string `json:"name" binding:"required"`
			Description string `json:"description"`
			Permissions uint   `json:"permissions" binding:"required"`
		}

		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		groupRepo := repositories.NewGroupRepository()
		groupService := services.NewGroupService(groupRepo)

		group, err := groupService.CreateGroup(projectID, request.Name, request.Description)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create group"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"group": group})
	}
}

// UpdateGroup handles updating an existing group
func UpdateGroup() gin.HandlerFunc {
	return func(c *gin.Context) {
		projectSid := c.Param("sid")
		projectID, err := resolveSIDToProjectID(projectSid)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
			return
		}

		groupID, err := strconv.ParseUint(c.Param("groupId"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
			return
		}

		// Get authenticated user ID
		userID := c.GetUint("userID")

		// Check if user has admin role
		if err := services.CheckAdminRole(projectID, userID); err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}

		var request struct {
			Name        string `json:"name" binding:"required"`
			Permissions uint   `json:"permissions" binding:"required"`
		}

		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		groupRepo := repositories.NewGroupRepository()
		groupService := services.NewGroupService(groupRepo)

		group, err := groupService.UpdateGroup(uint(groupID), request.Name)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update group"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"group": group})
	}
}

// DeleteGroup handles deleting a group
func DeleteGroup() gin.HandlerFunc {
	return func(c *gin.Context) {
		projectSid := c.Param("sid")
		projectID, err := resolveSIDToProjectID(projectSid)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
			return
		}

		groupID, err := strconv.ParseUint(c.Param("groupId"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
			return
		}

		// Get authenticated user ID
		userID := c.GetUint("userID")

		// Check if user has admin role
		if err := services.CheckAdminRole(projectID, userID); err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}

		groupRepo := repositories.NewGroupRepository()
		groupService := services.NewGroupService(groupRepo)

		if err := groupService.DeleteGroup(uint(groupID)); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete group"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Group deleted successfully"})
	}
}

// UpdateMemberGroup handles updating a member's group
func UpdateMemberGroup() gin.HandlerFunc {
	return func(c *gin.Context) {
		projectSid := c.Param("sid")
		projectID, err := resolveSIDToProjectID(projectSid)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
			return
		}

		// Get authenticated user ID
		authUserID := c.GetUint("userID")

		// Check if user has admin role
		if err := services.CheckAdminRole(projectID, authUserID); err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}

		userID, err := strconv.ParseUint(c.Param("userId"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
			return
		}

		var request struct {
			GroupID uint `json:"group_id" binding:"required"`
		}

		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		groupRepo := repositories.NewGroupRepository()
		groupService := services.NewGroupService(groupRepo)

		if err := groupService.UpdateMemberGroup(projectID, uint(userID), request.GroupID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update member's group"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Member's group updated successfully"})
	}
}

// UpdateBlockGroupVisibility handles updating which groups can view a block
func UpdateBlockGroupVisibility() gin.HandlerFunc {
	return func(c *gin.Context) {
		blockID, err := strconv.ParseUint(c.Param("blockId"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid block ID"})
			return
		}

		var request struct {
			GroupIDs []uint `json:"group_ids" binding:"required"`
		}

		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		groupRepo := repositories.NewGroupRepository()
		groupService := services.NewGroupService(groupRepo)

		if err := groupService.UpdateBlockGroupVisibility(uint(blockID), request.GroupIDs); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update block visibility"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Block visibility updated successfully"})
	}
}

// GetBlockVisibleGroups handles retrieving all groups that can view a block
func GetBlockVisibleGroups() gin.HandlerFunc {
	return func(c *gin.Context) {
		blockID, err := strconv.ParseUint(c.Param("blockId"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid block ID"})
			return
		}

		groupRepo := repositories.NewGroupRepository()
		groupService := services.NewGroupService(groupRepo)

		groups, err := groupService.GetBlockVisibleGroups(uint(blockID))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch groups"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"groups": groups})
	}
}

// GetBlocksByVisibleGroup handles retrieving all blocks visible to a specific group
func GetBlocksByVisibleGroup() gin.HandlerFunc {
	return func(c *gin.Context) {
		projectSid := c.Param("sid")
		projectID, err := resolveSIDToProjectID(projectSid)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
			return
		}

		groupID, err := strconv.ParseUint(c.Param("groupId"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
			return
		}

		groupRepo := repositories.NewGroupRepository()
		groupService := services.NewGroupService(groupRepo)

		blocks, err := groupService.GetBlocksByVisibleGroup(uint(groupID), projectID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch blocks"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"blocks": blocks})
	}
}

// GetGroupsWithVisibilityStats gets groups with stats about how many blocks they can see
func GetGroupsWithVisibilityStats() gin.HandlerFunc {
	return func(c *gin.Context) {
		projectSid := c.Param("sid")
		projectID, err := resolveSIDToProjectID(projectSid)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
			return
		}

		groupRepo := repositories.NewGroupRepository()
		groupService := services.NewGroupService(groupRepo)

		groups, err := groupService.GetProjectGroups(projectID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch groups"})
			return
		}

		// Prepare the result with visibility stats
		type GroupWithStats struct {
			models.ProjectGroup
			VisibleBlocksCount int `json:"visible_blocks_count"`
		}

		result := make([]GroupWithStats, 0, len(groups))

		for _, group := range groups {
			blocks, err := groupService.GetBlocksByVisibleGroup(group.GroupID, projectID)
			blocksCount := 0
			if err == nil {
				blocksCount = len(blocks)
			}

			result = append(result, GroupWithStats{
				ProjectGroup:       group,
				VisibleBlocksCount: blocksCount,
			})
		}

		c.JSON(http.StatusOK, gin.H{"groups": result})
	}
}
