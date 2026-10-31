package routes

import (
	"projectup/controllers"
	"projectup/middleware"

	"github.com/gin-gonic/gin"
)

// SetupBookmarkRoutes sets up all bookmark-related routes
func SetupBookmarkRoutes(router *gin.Engine) {
	// Protected routes (authentication required)
	protectedAPI := router.Group("/api/bookmarks")
	protectedAPI.Use(middleware.Authenticate())
	{
		// CRUD operations
		protectedAPI.GET("", controllers.GetUserBookmarks)
		protectedAPI.POST("", controllers.CreateBookmark)
		protectedAPI.PUT("/:id", controllers.UpdateBookmark)
		protectedAPI.DELETE("/:id", controllers.DeleteBookmark)
		
		// Categories
		protectedAPI.GET("/categories", controllers.GetBookmarkCategories)
		
		// Platform imports
		protectedAPI.POST("/:platform/import", controllers.ImportBookmarksFromPlatform)
	}
}