package routes

import (
	"projectup/controllers"
	"projectup/middleware"

	"github.com/gin-gonic/gin"
)

// SetupTrendingRoutes sets up all trending-related routes
func SetupTrendingRoutes(router *gin.Engine) {
	// Public routes (no authentication required)
	publicAPI := router.Group("/api/trending")
	{
		// Get trending items
		publicAPI.GET("", controllers.GetTrendingItems)
		
		// Get trending categories
		publicAPI.GET("/categories", controllers.GetTrendingCategories)
		
		// Update interaction score (can be public for view counts)
		publicAPI.POST("/:id/interact", controllers.UpdateTrendingScore)
	}

	// Protected routes (authentication required)
	protectedAPI := router.Group("/api/trending")
	protectedAPI.Use(middleware.Authenticate())
	{
		// Admin only routes - you might want to add admin middleware here
		protectedAPI.POST("", controllers.CreateTrendingItem)
		protectedAPI.DELETE("/:id", controllers.DeleteTrendingItem)
	}
}