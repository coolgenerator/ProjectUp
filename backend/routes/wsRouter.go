package routes

import (
	"projectup/controllers"

	"github.com/gin-gonic/gin"
)

func WSRoutes(router *gin.Engine) {
	wsGroup := router.Group("/ws")

	// Apply the Authenticate middleware to all user routes
	wsGroup.Use()
	{
		wsGroup.GET("", controllers.WebSocketHandler())
		// Block WebSocket handler removed - no longer using block-based design
		// wsGroup.GET("/projects/:projectId/blocks", controllers.BlockWebSocketHandler())
	}
}
