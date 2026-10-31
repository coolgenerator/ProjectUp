package routes

import (
	"projectup/controllers"
	"projectup/middleware"

	"github.com/gin-gonic/gin"
)

func TutorialRoutes(router *gin.Engine) {
	// User tutorial status and completion endpoints
	userTutorialGroup := router.Group("/api/user")
	userTutorialGroup.Use(middleware.Authenticate())
	{
		userTutorialGroup.GET("/tutorial-status", controllers.GetTutorialStatus)
		userTutorialGroup.POST("/complete-project-tutorial", controllers.CompleteProjectTutorial)
		userTutorialGroup.POST("/complete-dashboard-tutorial", controllers.CompleteDashboardTutorial)
		userTutorialGroup.POST("/skip-project-tutorial", controllers.SkipProjectTutorial)
		userTutorialGroup.POST("/skip-dashboard-tutorial", controllers.SkipDashboardTutorial)
		userTutorialGroup.POST("/reset-tutorials", controllers.ResetTutorials)
	}

	// Tutorial-specific endpoints (template project creation, etc.)
	tutorialGroup := router.Group("/api/tutorial")
	tutorialGroup.Use(middleware.Authenticate())
	{
		tutorialGroup.POST("/create-template-project", controllers.CreateTemplateProject)
	}
}
