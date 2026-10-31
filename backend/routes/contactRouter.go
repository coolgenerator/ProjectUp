package routes

import (
	"projectup/controllers"
	"projectup/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterContactRoutes(router *gin.Engine) {
	contactGroup := router.Group("/api/contact")
	// Apply the Authenticate middleware to all project routes
	contactGroup.Use(middleware.Authenticate())
	{
		// Contact management
		contactGroup.GET("/", controllers.GetContacts())
		contactGroup.GET("/get-requests", controllers.GetContactRequests())
		contactGroup.GET("/sent-requests", controllers.GetSentContactRequests())
		contactGroup.POST("/request", controllers.MakeContactRequest())
		contactGroup.POST("/accept", controllers.AcceptContactRequest())
		contactGroup.POST("/decline", controllers.DeclineContactRequest())
		contactGroup.DELETE("/delete", controllers.DeleteContact())
	}
}
