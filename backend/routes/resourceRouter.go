package routes

import (
	"projectup/controllers"
	"projectup/middleware"

	"github.com/gin-gonic/gin"
)

func ResourceRoutes(router *gin.Engine, resourceController *controllers.ResourceController) {
	resourceGroup := router.Group("/api/resources")
	resourceGroup.Use(middleware.Authenticate())
	{
		// Web link management
		resourceGroup.POST("/link", resourceController.CreateWebLink)

		// File upload
		resourceGroup.POST("/upload", resourceController.UploadFile)

		// Resource management
		resourceGroup.GET("", resourceController.GetUserResources)
		resourceGroup.GET("/:id", resourceController.GetResource)
		resourceGroup.PUT("/:id", resourceController.UpdateResource)
		resourceGroup.DELETE("/:id", resourceController.DeleteResource)

		// PDF proxy endpoint (allows authenticated access to S3 PDFs)
		resourceGroup.GET("/:id/proxy", resourceController.ProxyFile)

		// Search and filter
		resourceGroup.GET("/search", resourceController.SearchResources)

		// Quota management
		resourceGroup.GET("/quota", resourceController.GetResourceQuota)
		resourceGroup.POST("/quota/recalculate", resourceController.RecalculateQuota)

		// Trash management
		resourceGroup.POST("/:id/trash", resourceController.MoveToTrash)
		resourceGroup.POST("/:id/restore", resourceController.RestoreFromTrash)
		resourceGroup.GET("/trash", resourceController.GetTrashedResources)
		resourceGroup.DELETE("/trash/empty", resourceController.EmptyTrash)
	}

	// Project resources (using :sid to match other project routes)
	projectResourceGroup := router.Group("/api/projects/:sid/resources")
	projectResourceGroup.Use(middleware.Authenticate())
	{
		projectResourceGroup.GET("", resourceController.GetProjectResources)
	}
}
