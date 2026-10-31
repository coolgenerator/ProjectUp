package routes

import (
	"projectup/controllers"
	"projectup/middleware"

	"github.com/gin-gonic/gin"
)

func SetupBulkRoutes(router *gin.Engine) {
	bulkGroup := router.Group("/api/bulk")
	bulkGroup.Use(middleware.Authenticate())
	{
		bulkGroup.POST("/create", controllers.BulkCreateHandler())
	}
}
