package routes

import (
	"projectup/controllers"

	"github.com/gin-gonic/gin"
)

func SSERoutes(router *gin.Engine) {
	sseGroup := router.Group("/api/sse")
	{
		sseGroup.GET("/events", controllers.SSEHandler())
	}
}
