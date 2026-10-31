package controllers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"projectup/database"
	"projectup/helper"
	"projectup/models"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// OnboardingRequest represents the unified onboarding request structure
type OnboardingRequest struct {
	// Scenario selection
	ProjectScenario string `json:"project_scenario" binding:"required,oneof=course research product personal blank"`

	// Basic project info (common across all scenarios)
	Name         string   `json:"name" binding:"required"`
	Description  string   `json:"description"`
	Topic        []string `json:"topic"`
	DurationWeeks *int    `json:"duration_weeks"`
	StartDate    string   `json:"start_date" binding:"required"`
	Deadline     *string  `json:"deadline"`
	Location     string   `json:"location"`

	// Team setup (common)
	TeamMembers []TeamMemberInput `json:"team_members"`

	// Scenario-specific data
	CourseInfo   *CourseInfoInput   `json:"course_info,omitempty"`
	ResearchInfo *ResearchInfoInput `json:"research_info,omitempty"`

	// AI enhancements
	SyllabusFile     *string `json:"syllabus_file,omitempty"`      // Base64 or file URL
	RequirementsText *string `json:"requirements_text,omitempty"`

	// Metadata
	OnboardingMetadata map[string]interface{} `json:"onboarding_metadata"`
}

type TeamMemberInput struct {
	UserID          *uint  `json:"user_id,omitempty"`           // For registered users
	IsPlaceholder   bool   `json:"is_placeholder"`
	PlaceholderName string `json:"placeholder_name,omitempty"`
	PlaceholderEmail string `json:"placeholder_email,omitempty"`
	Role            string `json:"role" binding:"required,oneof=admin editor viewer"`
}

type CourseInfoInput struct {
	CourseName string   `json:"course_name"`
	School     string   `json:"school"`
	Class      string   `json:"class"`
	Syllabus   *string  `json:"syllabus,omitempty"` // Syllabus text or file
	Milestones []string `json:"milestones,omitempty"`
}

type ResearchInfoInput struct {
	ResearchType string   `json:"research_type"` // 'masters_thesis', 'phd_thesis', 'undergrad_thesis', 'lab_project', 'independent'
	ResearchDomain string   `json:"research_domain"`
	AdvisorEmail *string  `json:"advisor_email,omitempty"`
	Collaborators []string `json:"collaborators,omitempty"`
	Phases       []PhaseInput `json:"phases,omitempty"`
}

type PhaseInput struct {
	Name        string  `json:"name" binding:"required"`
	Description *string `json:"description"`
	GateType    *string `json:"gate_type,omitempty"` // 'approval_required', 'dependency'
	GateConfig  map[string]interface{} `json:"gate_config,omitempty"`
	SortOrder   int     `json:"sort_order"`
}

// CreateProjectWithOnboarding handles the new onboarding flow for project creation
// @Summary Create project via onboarding wizard
// @Description Creates a new project using the onboarding wizard with scenario-specific flows
// @Tags Projects, Onboarding
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body OnboardingRequest true "Onboarding request data"
// @Success 200 {object} map[string]interface{} "Project created successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request data"
// @Failure 500 {object} map[string]interface{} "Failed to create project"
// @Router /projects/onboarding/create [post]
func CreateProjectWithOnboarding() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
			return
		}

		var req OnboardingRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Start a transaction
		tx := database.DB.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		// Parse dates
		startTime, err := time.Parse("2006-01-02", req.StartDate)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start date format"})
			return
		}

		var endTime *time.Time
		if req.Deadline != nil && *req.Deadline != "" {
			t, err := time.Parse("2006-01-02", *req.Deadline)
			if err != nil {
				tx.Rollback()
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid deadline format"})
				return
			}
			endTime = &t
		}

		// Generate short ID
		shortID := helper.GenerateShortID(8)

		// Convert topic to JSON
		topicJSON, _ := datatypes.NewJSONType(req.Topic).MarshalJSON()

		// Prepare scenario-specific data
		var courseInfoJSON, researchInfoJSON []byte
		if req.CourseInfo != nil {
			courseInfoJSON, _ = datatypes.NewJSONType(req.CourseInfo).MarshalJSON()
		}
		if req.ResearchInfo != nil {
			researchInfoJSON, _ = datatypes.NewJSONType(req.ResearchInfo).MarshalJSON()
		}

		// Create setup checklist based on scenario
		setupChecklist := generateSetupChecklist(req)
		checklistJSON, _ := datatypes.NewJSONType(setupChecklist).MarshalJSON()

		// Create onboarding metadata
		metadataJSON, _ := datatypes.NewJSONType(req.OnboardingMetadata).MarshalJSON()

		// Create project
		project := models.Project{
			ShortID:            shortID,
			OwnerID:            userID.(uint),
			Title:              &req.Name,
			Description:        &req.Description,
			Location:           &req.Location,
			StartTime:          &startTime,
			EndTime:            endTime,
			ProjectScenario:    &req.ProjectScenario,
			DurationWeeks:      req.DurationWeeks,
			Status:             1, // Active
			Hidden:             false,
			IsPublished:        false,
		}

		// Set scenario-specific data
		if courseInfoJSON != nil {
			project.CourseInfo = courseInfoJSON
			if req.CourseInfo.School != "" {
				project.School = &req.CourseInfo.School
			}
			if req.CourseInfo.Class != "" {
				project.Class = &req.CourseInfo.Class
			}
		}
		if researchInfoJSON != nil {
			project.ResearchInfo = researchInfoJSON
		}
		project.Topic = topicJSON
		project.SetupChecklist = checklistJSON
		project.OnboardingMetadata = metadataJSON

		if err := tx.Create(&project).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create project"})
			return
		}

		// Add owner as project member
		ownerMember := models.ProjectMember{
			ProjectID:   project.ProjectID,
			UserID:      userID.(uint),
			Role:        "owner",
			Permissions: 255, // Full permissions
		}
		if err := tx.Create(&ownerMember).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add owner to project"})
			return
		}

		// Add team members (including placeholders)
		for _, member := range req.TeamMembers {
			if err := addTeamMember(tx, project.ProjectID, member); err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add team member: " + err.Error()})
				return
			}
		}

		// Create research project phases if applicable
		if req.ProjectScenario == "research" && req.ResearchInfo != nil && len(req.ResearchInfo.Phases) > 0 {
			for _, phaseInput := range req.ResearchInfo.Phases {
				if err := createProjectPhase(tx, project.ProjectID, phaseInput); err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create project phase"})
					return
				}
			}
		}

		// Commit transaction
		if err := tx.Commit().Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Project created successfully",
			"project": gin.H{
				"project_id": project.ProjectID,
				"sid":        project.ShortID,
				"name":       project.Title,
			},
		})
	}
}

// Helper function to add a team member (regular or placeholder)
func addTeamMember(tx *gorm.DB, projectID uint, member TeamMemberInput) error {
	var actualUserID uint

	if member.IsPlaceholder {
		// Create a placeholder user ID (we'll use a special range or generate one)
		// For now, we'll use a temporary ID that will be replaced when they accept the invite
		actualUserID = 0 // This will be updated when the user accepts the invite

		inviteToken := generateInviteToken()

		projectMember := models.ProjectMember{
			ProjectID:        projectID,
			UserID:           actualUserID,
			Role:             member.Role,
			IsPlaceholder:    true,
			PlaceholderName:  &member.PlaceholderName,
			PlaceholderEmail: &member.PlaceholderEmail,
			InviteToken:      &inviteToken,
			Permissions:      getPermissionsForRole(member.Role),
		}

		return tx.Create(&projectMember).Error
	}

	// Regular user
	if member.UserID == nil {
		return nil // Skip if no user ID provided
	}

	projectMember := models.ProjectMember{
		ProjectID:     projectID,
		UserID:        *member.UserID,
		Role:          member.Role,
		IsPlaceholder: false,
		Permissions:   getPermissionsForRole(member.Role),
	}

	return tx.Create(&projectMember).Error
}

// Helper function to create a project phase
func createProjectPhase(tx *gorm.DB, projectID uint, phaseInput PhaseInput) error {
	gateConfigJSON, _ := datatypes.NewJSONType(phaseInput.GateConfig).MarshalJSON()

	phase := models.ProjectPhase{
		ProjectID:   projectID,
		Name:        phaseInput.Name,
		Description: phaseInput.Description,
		Status:      "locked",
		GateType:    phaseInput.GateType,
		GateConfig:  gateConfigJSON,
		SortOrder:   phaseInput.SortOrder,
	}

	return tx.Create(&phase).Error
}

// Helper function to generate setup checklist based on scenario
func generateSetupChecklist(req OnboardingRequest) []map[string]interface{} {
	checklist := []map[string]interface{}{}

	// Common tasks
	if len(req.TeamMembers) > 0 {
		placeholderCount := 0
		for _, m := range req.TeamMembers {
			if m.IsPlaceholder {
				placeholderCount++
			}
		}
		if placeholderCount > 0 {
			checklist = append(checklist, map[string]interface{}{
				"id":          "invite_team",
				"title":       "Invite team members",
				"description": "Send invitations to placeholder team members",
				"status":      "pending",
				"priority":    "high",
			})
		}
	}

	// Scenario-specific tasks
	switch req.ProjectScenario {
	case "course":
		if req.CourseInfo != nil && req.SyllabusFile == nil {
			checklist = append(checklist, map[string]interface{}{
				"id":          "upload_syllabus",
				"title":       "Upload course syllabus",
				"description": "Upload syllabus for AI-powered task generation",
				"status":      "pending",
				"priority":    "medium",
			})
		}
	case "research":
		checklist = append(checklist, map[string]interface{}{
			"id":          "define_research_question",
			"title":       "Define research question",
			"description": "Clearly articulate your research question and hypotheses",
			"status":      "pending",
			"priority":    "high",
		})
	}

	checklist = append(checklist, map[string]interface{}{
		"id":          "assign_initial_tasks",
		"title":       "Assign initial tasks",
		"description": "Assign tasks to team members to get started",
		"status":      "pending",
		"priority":    "medium",
	})

	return checklist
}

// Helper function to generate a secure invite token
func generateInviteToken() string {
	bytes := make([]byte, 32)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// Helper function to get permissions value based on role
func getPermissionsForRole(role string) int {
	switch role {
	case "owner":
		return 255 // Full permissions
	case "admin":
		return 127 // Most permissions
	case "editor":
		return 31 // Edit permissions
	case "viewer":
		return 1 // Read-only
	default:
		return 1
	}
}

// GetProjectSetupChecklist returns the setup checklist for a project
// @Summary Get project setup checklist
// @Description Retrieves the post-creation setup checklist for a project
// @Tags Projects, Onboarding
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param sid path string true "Project Short ID"
// @Success 200 {object} map[string]interface{} "Setup checklist"
// @Failure 404 {object} map[string]interface{} "Project not found"
// @Router /projects/{sid}/setup-checklist [get]
func GetProjectSetupChecklist() gin.HandlerFunc {
	return func(c *gin.Context) {
		shortID := c.Param("sid")

		var project models.Project
		if err := database.DB.Where("sid = ?", shortID).First(&project).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}

		var checklist []map[string]interface{}
		if err := json.Unmarshal([]byte(project.SetupChecklist), &checklist); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse checklist"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"checklist": checklist})
	}
}

// UpdateSetupChecklistTask updates a specific task in the setup checklist
// @Summary Update setup checklist task
// @Description Updates the status of a setup checklist task
// @Tags Projects, Onboarding
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param sid path string true "Project Short ID"
// @Param taskId path string true "Task ID"
// @Param request body map[string]string true "Update data (status)"
// @Success 200 {object} map[string]interface{} "Task updated successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request"
// @Router /projects/{sid}/setup-checklist/{taskId} [put]
func UpdateSetupChecklistTask() gin.HandlerFunc {
	return func(c *gin.Context) {
		shortID := c.Param("sid")
		taskID := c.Param("taskId")

		var updateData struct {
			Status string `json:"status" binding:"required,oneof=pending in_progress completed"`
		}
		if err := c.ShouldBindJSON(&updateData); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var project models.Project
		if err := database.DB.Where("sid = ?", shortID).First(&project).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}

		var checklist []map[string]interface{}
		if err := json.Unmarshal([]byte(project.SetupChecklist), &checklist); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse checklist"})
			return
		}

		// Find and update the task
		found := false
		for i, task := range checklist {
			if task["id"] == taskID {
				checklist[i]["status"] = updateData.Status
				found = true
				break
			}
		}

		if !found {
			c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
			return
		}

		// Update the project
		checklistJSON, _ := datatypes.NewJSONType(checklist).MarshalJSON()
		project.SetupChecklist = checklistJSON

		if err := database.DB.Save(&project).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update checklist"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Task updated successfully",
			"checklist": checklist,
		})
	}
}
