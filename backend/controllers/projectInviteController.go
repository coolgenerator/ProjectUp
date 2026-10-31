package controllers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"projectup/database"
	"projectup/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GeneratePlaceholderInvite generates an invite link for a placeholder team member
// @Summary Generate placeholder invite
// @Description Generates an invite link for a placeholder team member
// @Tags Projects, Invites
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param sid path string true "Project Short ID"
// @Param request body map[string]interface{} true "Placeholder member data"
// @Success 200 {object} map[string]interface{} "Invite generated successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request"
// @Router /projects/{sid}/invites/placeholder [post]
func GeneratePlaceholderInvite() gin.HandlerFunc {
	return func(c *gin.Context) {
		shortID := c.Param("sid")
		userID, _ := c.Get("userID")

		var req struct {
			PlaceholderName  string `json:"placeholder_name" binding:"required"`
			PlaceholderEmail string `json:"placeholder_email" binding:"required,email"`
			Role             string `json:"role" binding:"required,oneof=admin editor viewer"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var project models.Project
		if err := database.DB.Where("sid = ?", shortID).First(&project).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}

		// Verify user is owner or admin of the project
		var member models.ProjectMember
		if err := database.DB.Where("project_id = ? AND user_id = ?", project.ProjectID, userID).First(&member).Error; err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to invite members"})
			return
		}

		if member.Role != "owner" && member.Role != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Only owners and admins can invite members"})
			return
		}

		// Generate invite token
		inviteToken := generateSecureToken()

		// Create placeholder member
		placeholderMember := models.ProjectMember{
			ProjectID:        project.ProjectID,
			UserID:           0, // Will be updated when invite is accepted
			Role:             req.Role,
			IsPlaceholder:    true,
			PlaceholderName:  &req.PlaceholderName,
			PlaceholderEmail: &req.PlaceholderEmail,
			InviteToken:      &inviteToken,
			Permissions:      getPermissionsForRole(req.Role),
		}

		if err := database.DB.Create(&placeholderMember).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create placeholder member"})
			return
		}

		// Generate invite link (this would be your frontend URL)
		inviteLink := "https://yourapp.com/invites/" + inviteToken

		c.JSON(http.StatusOK, gin.H{
			"message":      "Invite generated successfully",
			"invite_link":  inviteLink,
			"invite_token": inviteToken,
			"placeholder": gin.H{
				"name":  req.PlaceholderName,
				"email": req.PlaceholderEmail,
				"role":  req.Role,
			},
		})
	}
}

// GetInviteInfo retrieves information about an invite token
// @Summary Get invite information
// @Description Retrieves project and placeholder information for an invite token
// @Tags Invites
// @Accept json
// @Produce json
// @Param token path string true "Invite Token"
// @Success 200 {object} map[string]interface{} "Invite information"
// @Failure 404 {object} map[string]interface{} "Invalid or expired token"
// @Router /invites/{token}/info [get]
func GetInviteInfo() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.Param("token")

		var member models.ProjectMember
		if err := database.DB.Where("invite_token = ? AND is_placeholder = ?", token, true).
			Preload("Project").First(&member).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Invalid or expired invite token"})
			return
		}

		// Check if token is already used
		if !member.IsPlaceholder || member.UserID != 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "This invite has already been accepted"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"project": gin.H{
				"project_id":  member.Project.ProjectID,
				"sid":         member.Project.ShortID,
				"name":        member.Project.Title,
				"description": member.Project.Description,
			},
			"placeholder": gin.H{
				"name":  member.PlaceholderName,
				"email": member.PlaceholderEmail,
				"role":  member.Role,
			},
		})
	}
}

// AcceptInvite accepts an invite and adds the user to the project
// @Summary Accept project invite
// @Description Accepts an invite token and adds the user to the project
// @Tags Invites
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param token path string true "Invite Token"
// @Success 200 {object} map[string]interface{} "Invite accepted successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request"
// @Router /invites/{token}/accept [post]
func AcceptInvite() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.Param("token")
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		tx := database.DB.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		// Find the placeholder member
		var placeholderMember models.ProjectMember
		if err := tx.Where("invite_token = ? AND is_placeholder = ?", token, true).
			First(&placeholderMember).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusNotFound, gin.H{"error": "Invalid or expired invite token"})
			return
		}

		// Check if token is already used
		if placeholderMember.UserID != 0 {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "This invite has already been accepted"})
			return
		}

		// Check if user is already a member of the project
		var existingMember models.ProjectMember
		err := tx.Where("project_id = ? AND user_id = ?", placeholderMember.ProjectID, userID).
			First(&existingMember).Error

		if err == nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "You are already a member of this project"})
			return
		}

		// Update placeholder with actual user
		placeholderMember.UserID = userID.(uint)
		placeholderMember.IsPlaceholder = false
		placeholderMember.InviteToken = nil // Clear the token

		if err := tx.Save(&placeholderMember).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to accept invite"})
			return
		}

		// Reassign any tasks that were assigned to the placeholder
		if err := reassignPlaceholderTasks(tx, placeholderMember.ProjectID, 0, userID.(uint)); err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reassign tasks"})
			return
		}

		if err := tx.Commit().Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit changes"})
			return
		}

		// Get project details
		var project models.Project
		database.DB.Where("project_id = ?", placeholderMember.ProjectID).First(&project)

		c.JSON(http.StatusOK, gin.H{
			"message": "Invite accepted successfully",
			"project": gin.H{
				"project_id": project.ProjectID,
				"sid":        project.ShortID,
				"name":       project.Title,
			},
			"role": placeholderMember.Role,
		})
	}
}

// GetProjectPlaceholders returns all placeholder members for a project
// @Summary Get project placeholders
// @Description Retrieves all placeholder team members for a project
// @Tags Projects, Invites
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param sid path string true "Project Short ID"
// @Success 200 {object} map[string]interface{} "List of placeholders"
// @Failure 404 {object} map[string]interface{} "Project not found"
// @Router /projects/{sid}/placeholders [get]
func GetProjectPlaceholders() gin.HandlerFunc {
	return func(c *gin.Context) {
		shortID := c.Param("sid")

		var project models.Project
		if err := database.DB.Where("sid = ?", shortID).First(&project).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}

		var placeholders []models.ProjectMember
		if err := database.DB.Where("project_id = ? AND is_placeholder = ?", project.ProjectID, true).
			Find(&placeholders).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch placeholders"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"placeholders": placeholders,
			"count":        len(placeholders),
		})
	}
}

// Helper function to reassign tasks from placeholder to actual user
func reassignPlaceholderTasks(tx *gorm.DB, projectID uint, placeholderUserID uint, newUserID uint) error {
	// Update milestone assignments
	if err := tx.Exec(`
		UPDATE milestone_assignments
		SET user_id = ?
		WHERE user_id = ?
		AND milestone_id IN (
			SELECT milestone_id FROM milestones WHERE project_id = ?
		)
	`, newUserID, placeholderUserID, projectID).Error; err != nil {
		return err
	}

	// Update task assignments (if you have a tasks table)
	// Add similar logic for tasks table if it exists

	return nil
}

// Helper function to generate a secure token
func generateSecureToken() string {
	bytes := make([]byte, 32)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}
