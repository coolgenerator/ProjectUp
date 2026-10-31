package routes

import (
	"projectup/controllers"
	"projectup/middleware"

	"github.com/gin-gonic/gin"
)

// SetupSectionRoutes sets up section management routes
func SetupSectionRoutes(router *gin.Engine, controller *controllers.SectionController) {
	sectionGroup := router.Group("/api/sections")
	sectionGroup.Use(middleware.Authenticate())
	{
		// Section CRUD operations
		sectionGroup.POST("", controller.CreateSection)
		sectionGroup.GET("/:id", controller.GetSection)
		sectionGroup.PUT("/:id", controller.UpdateSection)
		sectionGroup.DELETE("/:id", controller.DeleteSection)

		// Project sections
		sectionGroup.GET("/project/:project_id", controller.GetProjectSections)

		// Reorder sections
		sectionGroup.POST("/reorder", controller.ReorderSections)
	}
}
