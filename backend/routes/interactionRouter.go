package routes

import (
	"projectup/controllers"
	"projectup/middleware"

	"github.com/gin-gonic/gin"
)

// SetupInteractionRoutes sets up the API routes for generic interactions
func SetupInteractionRoutes(router *gin.Engine) {
	interactionGroup := router.Group("/api/interactions")
	interactionGroup.Use(middleware.Authenticate())

	// Generic interaction endpoints
	interactionGroup.POST("", controllers.HandleInteractionGeneric)
	interactionGroup.GET("/counts", controllers.GetInteractionCountsGeneric)
	interactionGroup.POST("/view", controllers.RecordViewGeneric)
	interactionGroup.GET("/saved", controllers.GetSavedItemsController)
}
