package routes

import (
	"projectup/controllers"
	"projectup/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterNotificationRoutes(router *gin.Engine) {
	notificationGroup := router.Group("/api/notifications")
	// Apply the Authenticate middleware to all notification routes
	notificationGroup.Use(middleware.Authenticate())
	{
		// Notification management
		notificationGroup.GET("", controllers.GetNotifications)
		notificationGroup.PATCH("/:id", controllers.MarkNotificationAsRead)
	}
}
