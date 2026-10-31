package controllers

import (
	"fmt"
	"net/http"
	"time"

	"projectup/database"
	"projectup/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GetTutorialStatus returns the tutorial completion status for the current user
// @Summary Get tutorial status
// @Description Get tutorial completion status for project and dashboard tutorials
// @Tags Tutorial
// @Produce json
// @Success 200 {object} map[string]interface{} "Tutorial status"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Server error"
// @Router /user/tutorial-status [get]
func GetTutorialStatus(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var user models.User
	if err := database.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"project_tutorial_completed":   user.ProjectTutorialCompleted,
		"dashboard_tutorial_completed": user.DashboardTutorialCompleted,
	})
}

// CompleteProjectTutorial marks the project tutorial as completed
// @Summary Complete project tutorial
// @Description Mark project tutorial as completed for the current user
// @Tags Tutorial
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "Tutorial completed"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Server error"
// @Router /user/complete-project-tutorial [post]
func CompleteProjectTutorial(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	result := database.DB.Model(&models.User{}).
		Where("id = ?", userID).
		Update("project_tutorial_completed", true)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update tutorial status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Project tutorial completed",
		"status":  "success",
	})
}

// CompleteDashboardTutorial marks the dashboard tutorial as completed
// @Summary Complete dashboard tutorial
// @Description Mark dashboard tutorial as completed for the current user
// @Tags Tutorial
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "Tutorial completed"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Server error"
// @Router /user/complete-dashboard-tutorial [post]
func CompleteDashboardTutorial(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	result := database.DB.Model(&models.User{}).
		Where("id = ?", userID).
		Update("dashboard_tutorial_completed", true)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update tutorial status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Dashboard tutorial completed",
		"status":  "success",
	})
}

// SkipProjectTutorial marks the project tutorial as completed (skipped)
// @Summary Skip project tutorial
// @Description Skip project tutorial for the current user
// @Tags Tutorial
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "Tutorial skipped"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Server error"
// @Router /user/skip-project-tutorial [post]
func SkipProjectTutorial(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	result := database.DB.Model(&models.User{}).
		Where("id = ?", userID).
		Update("project_tutorial_completed", true) // Mark as completed when skipped

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to skip tutorial"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Project tutorial skipped",
		"status":  "success",
	})
}

// SkipDashboardTutorial marks the dashboard tutorial as completed (skipped)
// @Summary Skip dashboard tutorial
// @Description Skip dashboard tutorial for the current user
// @Tags Tutorial
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "Tutorial skipped"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Server error"
// @Router /user/skip-dashboard-tutorial [post]
func SkipDashboardTutorial(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	result := database.DB.Model(&models.User{}).
		Where("id = ?", userID).
		Update("dashboard_tutorial_completed", true)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to skip tutorial"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Dashboard tutorial skipped",
		"status":  "success",
	})
}

// CreateTemplateProject creates a sample project for tutorial purposes
// @Summary Create template project
// @Description Create a pre-filled template project for the user to explore
// @Tags Tutorial
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "Template project created"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Server error"
// @Router /tutorial/create-template-project [post]
func CreateTemplateProject(c *gin.Context) {
	_, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Use a fixed SID for tutorial projects to ensure consistency
	tutorialSID := "TUTORIAL01"

	// Check if system-owned tutorial project already exists
	var systemTutorialProject models.Project
	err := database.DB.Where("sid = ? AND owner_id = 0", tutorialSID).
		First(&systemTutorialProject).Error

	if err == nil {
		// System tutorial project exists, return it
		c.JSON(http.StatusOK, gin.H{
			"message":    "Tutorial project loaded",
			"project_id": systemTutorialProject.ProjectID,
			"short_id":   systemTutorialProject.ShortID,
			"sid":        systemTutorialProject.ShortID,
		})
		return
	}

	// Create system-owned template project with required fields
	projectTitle := "My First Project (Tutorial)"
	projectDescription := "This is a sample project to help you learn ProjectUp. Feel free to explore and modify it!"
	projectType := "Tutorial"
	location := "Online"
	tutorialSlug := "tutorial-project-demo"
	startTime := time.Now()
	endTime := time.Now().AddDate(0, 1, 0) // 1 month from now

	templateProject := models.Project{
		Title:       &projectTitle,
		Description: &projectDescription,
		ProjectType: &projectType,
		Location:    &location,
		ShortID:     tutorialSID,     // Use fixed tutorial SID
		Slug:        tutorialSlug,    // String type, not pointer
		OwnerID:     0,               // System-owned (not user-owned)
		IsPublished: false,
		Status:      1,               // Active
		StartTime:   &startTime,
		EndTime:     &endTime,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	// Use raw SQL to bypass the NOT NULL constraint on owner_id if needed
	// Or we can allow owner_id = 0 for system projects
	if err := database.DB.Create(&templateProject).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create template project",
			"details": err.Error(),
		})
		return
	}

	// Add mock data for the tutorial project (use system user ID)
	createTutorialMockData(&templateProject, 0)

	c.JSON(http.StatusOK, gin.H{
		"message":    "Template project created successfully",
		"project_id": templateProject.ProjectID,
		"short_id":   templateProject.ShortID,
		"sid":        templateProject.ShortID,
	})
}

// createTutorialMockData adds sample tasks and resources to the tutorial project
func createTutorialMockData(project *models.Project, userID uint) {
	// Convert project ID to string for tasks
	projectIDStr := fmt.Sprintf("%d", project.ProjectID)

	// Create sample tasks
	taskTitles := []string{
		"Set up project repository",
		"Design project architecture",
		"Implement core features",
		"Write documentation",
		"Deploy to production",
	}

	taskDescriptions := []string{
		"Initialize Git repository and set up project structure",
		"Create system architecture diagrams and define components",
		"Develop the main functionality of the project",
		"Write user guides and API documentation",
		"Configure CI/CD pipeline and deploy to cloud",
	}

	taskStatuses := []string{"done", "done", "in_progress", "todo", "todo"}

	for i, title := range taskTitles {
		taskID := uuid.New().String()
		createdBy := "system" // System user

		task := models.Task{
			ID:          taskID,
			ProjectID:   projectIDStr,
			Title:       title,
			Description: taskDescriptions[i],
			Status:      taskStatuses[i],
			Priority:    (i % 3) + 1, // Priority 1-3
			CreatedBy:   createdBy,
			CreatedAt:   time.Now().Add(-time.Duration(5-i) * 24 * time.Hour), // Stagger creation dates
			UpdatedAt:   time.Now(),
		}
		database.DB.Create(&task)
	}

	// Create sample milestones
	milestone1Title := "Project Planning Phase"
	milestone1Desc := "Complete initial planning and architecture design"
	milestone1Due := time.Now().AddDate(0, 0, 14) // 2 weeks

	milestone2Title := "Development Phase"
	milestone2Desc := "Implement core features and functionality"
	milestone2Due := time.Now().AddDate(0, 1, 0) // 1 month

	milestone1 := models.Milestone{
		ProjectID:   project.ProjectID,
		Title:       milestone1Title,
		Description: &milestone1Desc,
		DueDate:     &milestone1Due,
		Status:      "completed",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	database.DB.Create(&milestone1)

	milestone2 := models.Milestone{
		ProjectID:   project.ProjectID,
		Title:       milestone2Title,
		Description: &milestone2Desc,
		DueDate:     &milestone2Due,
		Status:      "in_progress",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	database.DB.Create(&milestone2)

	// Note: Resource model structure is different from ProjectResource
	// We'll skip resources for now as the Resource model uses a different structure
	// If needed, we can create ProjectResource entries instead
}

// ResetTutorials resets all tutorial completion status (for development/testing)
// @Summary Reset tutorials
// @Description Reset all tutorial completion status for the current user
// @Tags Tutorial
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "Tutorials reset"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Server error"
// @Router /user/reset-tutorials [post]
func ResetTutorials(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	result := database.DB.Model(&models.User{}).
		Where("id = ?", userID).
		Updates(map[string]interface{}{
			"project_tutorial_completed":   false,
			"dashboard_tutorial_completed": false,
		})

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reset tutorials"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Tutorials reset successfully",
		"status":  "success",
	})
}
