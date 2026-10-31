package routes

import (
	"projectup/controllers"
	"projectup/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterChatRoutes(router *gin.Engine) {
	chatGroup := router.Group("/api")
	// Apply the Authenticate middleware to all project routes
	chatGroup.Use(middleware.Authenticate())
	{
		// Chat management
		chatGroup.POST("/get-or-create", controllers.GetOrCreateChat)
		chatGroup.POST("/get-or-create-by-sid", controllers.GetOrCreateChatBySID)
		chatGroup.POST("/send-message", controllers.SendChatMessage)
		chatGroup.GET("/messages", controllers.GetChatMessages)
		chatGroup.GET("/unread-count", controllers.GetUnreadMessageCount)
		chatGroup.POST("/mark-read", controllers.MarkMessagesAsRead)

		// Group chat operations
		chatGroup.POST("/create-group", controllers.CreateGroupChat)
		chatGroup.GET("/group-members", controllers.GetGroupMembers)

		// User's chats (both private and group)
		chatGroup.GET("/get-user-conversations", controllers.GetUserChats)
		chatGroup.GET("/chat/:short_id", controllers.GetChatByShortID)
	}
}
