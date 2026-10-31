package routes

import (
	"projectup/controllers"
	"projectup/middleware"

	"github.com/gin-gonic/gin"
)

// SetupShareLinkRoutes sets up routes for share link management
func SetupShareLinkRoutes(router *gin.Engine) {
	controller := controllers.NewShareLinkController()

	// Public route - access share link by token (no auth required)
	router.GET("/api/share/:token", controller.GetShareLinkByToken)

	// Protected route - accept share link (requires authentication)
	acceptGroup := router.Group("/api/share/:token")
	acceptGroup.Use(middleware.Authenticate())
	{
		acceptGroup.POST("/accept", controller.AcceptShareLink)
	}

	// Protected routes - require authentication and project access
	shareGroup := router.Group("/api/projects/:sid/share-links")
	shareGroup.Use(middleware.Authenticate())
	{
		// Create share link
		shareGroup.POST("", controller.CreateShareLink)

		// Get all share links for project
		shareGroup.GET("", controller.GetProjectShareLinks)

		// Delete share link
		shareGroup.DELETE("/:shareId", controller.DeleteShareLink)

		// Deactivate share link
		shareGroup.POST("/:shareId/deactivate", controller.DeactivateShareLink)

		// Get usage statistics
		shareGroup.GET("/:shareId/usage", controller.GetShareLinkUsage)
	}
}
