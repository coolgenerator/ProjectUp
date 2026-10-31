package routes

import (
	"projectup/controllers"

	"github.com/gin-gonic/gin"
)

// NodeChatNotificationRoutes sets up internal routes for node chat notifications
// These are called by the AI service to broadcast real-time events via SSE
func NodeChatNotificationRoutes(router *gin.Engine) {
	// Internal endpoints - not exposed to public API
	// These should be called only by the AI service (could add API key auth)
	internal := router.Group("/api/internal/node-chat")
	{
		// Broadcast new message to all participants
		internal.POST("/broadcast-message", controllers.BroadcastChatMessage)

		// Broadcast participant join/leave events
		internal.POST("/broadcast-participant", controllers.BroadcastParticipantChange)

		// Broadcast typing indicators
		internal.POST("/broadcast-typing", controllers.BroadcastTypingIndicator)
	}
}
