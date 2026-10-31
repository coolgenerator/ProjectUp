package routes

import (
	"projectup/controllers"
	"projectup/middleware"

	"github.com/gin-gonic/gin"
)

// SetupGenericRoutes configures the generic routes for content that spans across different entity types (posts, projects, partners)
func SetupGenericRoutes(router *gin.Engine) {
	// Group for authenticated content-related routes
	contentGroup := router.Group("/api/content")
	contentGroup.Use(middleware.Authenticate())
	{
		// Comments
		contentGroup.GET("/comments", controllers.GetCommentsGeneric)
		contentGroup.POST("/comments", controllers.AddCommentGeneric)

		// Interactions (like, save, etc.)
		contentGroup.POST("/interactions", controllers.HandleInteractionGeneric)
		contentGroup.GET("/interactions/counts", controllers.GetInteractionCountsGeneric)
		contentGroup.POST("/interactions/view", controllers.RecordViewGeneric)
		contentGroup.GET("/interactions/saved", controllers.GetSavedItemsController)
	}

	// Unauthenticated routes
	publicContentGroup := router.Group("/api/public-content")
	{
		// Public access to comments (read-only)
		publicContentGroup.GET("/comments", controllers.GetCommentsGeneric)

		// Public access to interaction counts
		publicContentGroup.GET("/interactions/counts", controllers.GetInteractionCountsGeneric)
	}
}
