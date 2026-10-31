package routes

import (
	"projectup/controllers"
	"projectup/middleware"

	"github.com/gin-gonic/gin"
)

// SetupPaperRoutes sets up all paper-related routes
func SetupPaperRoutes(router *gin.Engine) {
	// Protected routes (authentication required)
	protectedAPI := router.Group("/api/papers")
	protectedAPI.Use(middleware.Authenticate())
	{
		// CRUD operations
		protectedAPI.GET("", controllers.GetUserPapers)
		protectedAPI.GET("/:id", controllers.GetPaper)
		protectedAPI.POST("", controllers.CreatePaper)
		protectedAPI.PUT("/:id", controllers.UpdatePaper)
		protectedAPI.DELETE("/:id", controllers.DeletePaper)
		
		// Annotations
		protectedAPI.GET("/:id/annotations", controllers.GetPaperAnnotations)
		protectedAPI.POST("/:id/annotations", controllers.CreatePaperAnnotation)
		
		// Upload and extraction
		protectedAPI.POST("/upload", controllers.UploadPaper)
		protectedAPI.POST("/extract", controllers.ExtractPaperMetadata)
		
		// AI features
		protectedAPI.POST("/:id/chat", controllers.ChatWithPaper)
		protectedAPI.POST("/:id/analyze", controllers.AnalyzePaper)
		protectedAPI.POST("/:id/implement", controllers.ImplementPaper)
		protectedAPI.GET("/:id/outline", controllers.ExtractOutline)
		protectedAPI.GET("/:id/references", controllers.ExtractReferences)
		
		// Notes management
		protectedAPI.GET("/:id/notes", controllers.GetNotes)
		protectedAPI.POST("/:id/notes", controllers.CreateNote)
		protectedAPI.PUT("/:id/notes/:noteId", controllers.UpdateNote)
		protectedAPI.DELETE("/:id/notes/:noteId", controllers.DeleteNote)
		
		// PDF proxy endpoint to avoid CORS issues
		protectedAPI.GET("/:id/pdf", controllers.GetPaperPDF)
	}
}