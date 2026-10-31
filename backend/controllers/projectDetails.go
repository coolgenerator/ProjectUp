package controllers

import (
	"encoding/json"
	"net/http"
	"time"

	"projectup/database"
	"projectup/helper"
	"projectup/models"
	"projectup/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetProjectDetails retrieves details of a project
// @Summary Get project details
// @Description Fetches details of a specific project using its ShortID (SID)
// @Tags Project Dashboard
// @Security BearerAuth
// @Produce json
// @Param sid path string true "Project Short ID"
// @Success 200 {object} map[string]interface{} "Project details retrieved successfully"
// @Failure 400 {object} map[string]interface{} "Project SID is required"
// @Failure 404 {object} map[string]interface{} "Project not found"
// @Failure 500 {object} map[string]interface{} "Failed to fetch project"
// @Router /project/{sid} [get]
func GetProjectDetails() gin.HandlerFunc {
	return func(c *gin.Context) {
		sid := c.Param("sid")
		if sid == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Project SID is required"})
			return
		}

		// Get authenticated user ID
		userID := c.GetUint("userID")

		var project models.Project
		// Query using the database column name 'sid' which maps to ShortID field
		if err := database.DB.Where("sid = ?", sid).First(&project).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch project"})
			}
			return
		}

		// Check if user has permission to view this project
		_, _, err := services.CheckProjectAccessOrOwnership(project.ProjectID, userID, helper.PermissionView)
		if err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}

		// Convert datatypes.JSON to Go structures
		var media []string
		if err := json.Unmarshal([]byte(project.ProjectMediaURL), &media); err != nil {
			media = []string{} // Default empty array
		}

		var topics []string
		if err := json.Unmarshal([]byte(project.Topic), &topics); err != nil {
			topics = []string{} // Default empty array
		}


		recruiting, _ := projectRecruiting(project.ProjectID)

		// Covers are usually set on the recruiting post
		cover := project.Cover
		if cover == nil || *cover == "" {
			var postCover string
			database.DB.Model(&models.ProjectPost{}).Where("project_id = ? AND cover <> ''", project.ProjectID).
				Order("post_id").Limit(1).Pluck("cover", &postCover)
			if postCover != "" {
				cover = &postCover
			}
		}

		// Convert to frontend-compatible format
		response := gin.H{
			"id":               project.ProjectID,
			"sid":              project.ShortID,
			"cover":            cover,
			"media":            media,
			"type":             project.ProjectType,
			"topics":           topics, // Changed from "topic" to "topics" for consistency
			"name":             project.Title,
			"startTime":        project.StartTime.Format(time.RFC3339),
			"deadline":         project.EndTime.Format(time.RFC3339),
			"location":         project.Location,
			"communicationApp": project.CommunicationApp,
			"description":      project.Description,
			"otherApp":         project.ReferLink,
			"school":           project.School,
			"class":            project.Class,
			"otherType":        "", // If necessary, update this in the backend model
			"is_published":     project.IsPublished,
			"visibility":       project.Status,
			"brief":            workbenchBrief(project.ProjectID),
			"brief_updated_at": project.BriefUpdatedAt,
			"recruiting":       recruiting,
		}
		// Only the founder sees the idea the project came from: its Q&A is their private thinking
		if project.OwnerID == userID {
			var draftID uint
			database.DB.Model(&models.IdeaDraft{}).Where("project_id = ?", project.ProjectID).Select("id").Scan(&draftID)
			if draftID != 0 {
				response["idea_draft_id"] = draftID
			}
		}

		c.JSON(http.StatusOK, response)
	}
}

// GetMilestones retrieves milestones of a project
// @Summary Get project milestones
// @Description Fetches all milestones for a given project
// @Tags Project Dashboard
// @Security BearerAuth
// @Produce json
// @Param sid path string true "Project Short ID"
// @Success 200 {object} map[string]interface{} "Milestones retrieved successfully"
// @Failure 400 {object} map[string]interface{} "Project SID is required"
// @Failure 404 {object} map[string]interface{} "Project not found"
// @Failure 500 {object} map[string]interface{} "Failed to fetch milestones"
// @Router /project/{sid}/milestones [get]
// func GetMilestones() gin.HandlerFunc {
// 	return func(c *gin.Context) {
// 		sid := c.Param("sid")
// 		if sid == "" {
// 			c.JSON(http.StatusBadRequest, gin.H{"error": "Project SID is required"})
// 			return
// 		}

// 		var project models.Project
// 		if err := database.DB.Where("sid = ?", sid).First(&project).Error; err != nil {
// 			if err == gorm.ErrRecordNotFound {
// 				c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
// 			} else {
// 				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch project"})
// 			}
// 			return
// 		}

// 		var milestones []models.Milestone
// 		if err := database.DB.Where("project_id = ?", project.ProjectID).Find(&milestones).Error; err != nil {
// 			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch milestones"})
// 			return
// 		}

// 		c.JSON(http.StatusOK, gin.H{"milestones": milestones})
// 	}
// }

// GetResources retrieves project resources
// @Summary Get project resources
// @Description Fetches all resources for a given project
// @Tags Project Dashboard
// @Security BearerAuth
// @Produce json
// @Param sid path string true "Project Short ID"
// @Success 200 {object} map[string]interface{} "Resources retrieved successfully"
// @Failure 400 {object} map[string]interface{} "Project SID is required"
// @Failure 404 {object} map[string]interface{} "Project not found"
// @Failure 500 {object} map[string]interface{} "Failed to fetch resources"
// @Router /project/{sid}/resources [get]
// func GetResources() gin.HandlerFunc {
// 	return func(c *gin.Context) {
// 		sid := c.Param("sid")
// 		if sid == "" {
// 			c.JSON(http.StatusBadRequest, gin.H{"error": "Project SID is required"})
// 			return
// 		}

// 		var project models.Project
// 		if err := database.DB.Where("sid = ?", sid).First(&project).Error; err != nil {
// 			if err == gorm.ErrRecordNotFound {
// 				c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
// 			} else {
// 				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch project"})
// 			}
// 			return
// 		}

// 		var resources []models.Resource
// 		if err := database.DB.Table("project_resources").
// 			Select("resources.*").
// 			Joins("JOIN resources ON project_resources.resource_id = resources.resource_id").
// 			Where("project_resources.project_id = ?", project.ProjectID).
// 			Find(&resources).Error; err != nil {
// 			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch resources"})
// 			return
// 		}

// 		c.JSON(http.StatusOK, gin.H{"resources": resources})
// 	}
// }

// GetWorkspaces retrieves workspaces of a project
// @Summary Get project workspaces
// @Description Fetches all workspaces for a given project
// @Tags Project Dashboard
// @Security BearerAuth
// @Produce json
// @Param sid path string true "Project Short ID"
// @Success 200 {object} map[string]interface{} "Workspaces retrieved successfully"
// @Failure 400 {object} map[string]interface{} "Project SID is required"
// @Failure 404 {object} map[string]interface{} "Project not found"
// @Failure 500 {object} map[string]interface{} "Failed to fetch workspaces"
// @Router /project/{sid}/workspaces [get]
// func GetWorkspaces() gin.HandlerFunc {
// 	return func(c *gin.Context) {
// 		sid := c.Param("sid")
// 		if sid == "" {
// 			c.JSON(http.StatusBadRequest, gin.H{"error": "Project SID is required"})
// 			return
// 		}

// 		var project models.Project
// 		if err := database.DB.Where("sid = ?", sid).First(&project).Error; err != nil {
// 			if err == gorm.ErrRecordNotFound {
// 				c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
// 			} else {
// 				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch project"})
// 			}
// 			return
// 		}

// 		var workspaces []models.Workspace
// 		if err := database.DB.Where("project_id = ?", project.ProjectID).Find(&workspaces).Error; err != nil {
// 			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch workspaces"})
// 			return
// 		}

// 		c.JSON(http.StatusOK, gin.H{"workspaces": workspaces})
// 	}
// }

// GetProjectMembers retrieves members of a project
// @Summary Get project members
// @Description Fetches all members for a given project
// @Tags Project Dashboard
// @Security BearerAuth
// @Produce json
// @Param sid path string true "Project Short ID"
// @Success 200 {object} map[string]interface{} "List of project members"
// @Failure 400 {object} map[string]interface{} "Project SID is required"
// @Failure 404 {object} map[string]interface{} "Project not found"
// @Failure 500 {object} map[string]interface{} "Failed to fetch project members"
// @Router /project/{sid}/members [get]
func GetProjectMembers() gin.HandlerFunc {
	return func(c *gin.Context) {
		sid := c.Param("sid")
		if sid == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Project SID is required"})
			return
		}

		// Get authenticated user ID
		userID := c.GetUint("userID")

		// Get the project first
		var project models.Project
		if err := database.DB.Where("sid = ?", sid).First(&project).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch project"})
			}
			return
		}

		// Check if user has permission to view project members
		// User needs at least PermissionView to see members
		_, _, err := services.CheckProjectAccessOrOwnership(project.ProjectID, userID, helper.PermissionView)
		if err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}

		// Fetch project members
		type MemberInfo struct {
			UserID                uint      `json:"user_id"`
			Username              string    `json:"username"`
			PreferredName         string    `json:"preferred_name"`
			FirstName             string    `json:"first_name"`
			LastName              string    `json:"last_name"`
			DisplayNamePreference *int      `json:"display_name_preference,omitempty"`
			Name                  string    `json:"name"`
			Email                 string    `json:"email"`
			Role                  string    `json:"role"`
			Avatar                string    `json:"avatar"`
			Permissions           int       `json:"permissions"`
			JoinedAt              time.Time `json:"joined_at"`
		}

		var members []MemberInfo

		// Query for project members with their roles, joining with profiles for name and avatar
		err = database.DB.Table("project_members").
			Select(`users.id as user_id,
				COALESCE(users.username, '') as username,
				COALESCE(profiles.preferred_name, '') as preferred_name,
				COALESCE(profiles.first_name, '') as first_name,
				COALESCE(profiles.last_name, '') as last_name,
				user_preferences.display_name_preference,
				COALESCE(profiles.preferred_name, CONCAT(profiles.first_name, ' ', profiles.last_name), users.username, '') as name,
				COALESCE(users.email, '') as email,
				project_members.role,
				COALESCE(profiles.avatar_url, '') as avatar,
				project_members.joined_at`).
			Joins("JOIN users ON project_members.user_id = users.id").
			Joins("LEFT JOIN profiles ON profiles.user_id = users.id").
			Joins("LEFT JOIN user_preferences ON user_preferences.user_id = users.id").
			Where("project_members.project_id = ?", project.ProjectID).
			Scan(&members).Error

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch project members"})
			return
		}

		// Calculate permissions based on role
		for i := range members {
			members[i].Permissions = services.GetUserProjectPermissions(project.ProjectID, members[i].UserID)
		}

		// Also include the owner if not already in the members list
		var owner models.User
		if err := database.DB.Where("id = ?", project.OwnerID).First(&owner).Error; err == nil {
			// Check if owner is already in the members list
			ownerExists := false
			for _, member := range members {
				if member.UserID == owner.ID {
					ownerExists = true
					break
				}
			}
			
			if !ownerExists {
				// Get owner's profile for name and avatar
				var ownerProfile models.Profile
				ownerName := ""
				ownerAvatar := ""
				ownerPreferredName := ""
				ownerFirstName := ""
				ownerLastName := ""

				if err := database.DB.Where("user_id = ?", owner.ID).First(&ownerProfile).Error; err == nil {
					if ownerProfile.PreferredName != nil {
						ownerPreferredName = *ownerProfile.PreferredName
						ownerName = *ownerProfile.PreferredName
					}
					if ownerProfile.FirstName != nil {
						ownerFirstName = *ownerProfile.FirstName
					}
					if ownerProfile.LastName != nil {
						ownerLastName = *ownerProfile.LastName
					}
					if ownerName == "" && ownerProfile.FirstName != nil && ownerProfile.LastName != nil {
						ownerName = *ownerProfile.FirstName + " " + *ownerProfile.LastName
					}
					if ownerProfile.AvatarURL != nil {
						ownerAvatar = *ownerProfile.AvatarURL
					}
				}

				// Get owner's display name preference
				var ownerPreferences models.UserPreferences
				var ownerDisplayNamePref *int
				if err := database.DB.Where("user_id = ?", owner.ID).First(&ownerPreferences).Error; err == nil {
					ownerDisplayNamePref = &ownerPreferences.DisplayNamePreference
				}

				ownerUsername := ""
				if owner.Username != nil {
					ownerUsername = *owner.Username
				}

				// Use username if no name in profile
				if ownerName == "" && owner.Username != nil {
					ownerName = *owner.Username
				}

				ownerEmail := ""
				if owner.Email != nil {
					ownerEmail = *owner.Email
				}

				members = append(members, MemberInfo{
					UserID:                owner.ID,
					Username:              ownerUsername,
					PreferredName:         ownerPreferredName,
					FirstName:             ownerFirstName,
					LastName:              ownerLastName,
					DisplayNamePreference: ownerDisplayNamePref,
					Name:                  ownerName,
					Email:                 ownerEmail,
					Role:                  "admin",
					Avatar:                ownerAvatar,
					Permissions:           15, // Full permissions for owner
					JoinedAt:              project.CreatedAt,
				})
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"members": members,
			"count":   len(members),
		})
	}
}

// Note: The old milestone, resource, and workspace functions have been replaced by
// the block-based approach in projectBlockController.go
