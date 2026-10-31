package controllers

import (
	"net/http"
	"projectup/services"
	"time"

	"github.com/gin-gonic/gin"
)

// NodeChatMessageNotification represents a notification about a new chat message
type NodeChatMessageNotification struct {
	SessionID      string `json:"session_id" binding:"required"`
	MessageID      string `json:"message_id" binding:"required"`
	SenderID       uint   `json:"sender_id" binding:"required"`
	Content        string `json:"content" binding:"required"`
	Role           string `json:"role" binding:"required"`
	ParticipantIDs []uint `json:"participant_ids" binding:"required"`
	NodeID         string `json:"node_id" binding:"required"`
	ProjectID      string `json:"project_id" binding:"required"`
}

// NodeChatParticipantNotification represents a notification about participant changes
type NodeChatParticipantNotification struct {
	SessionID      string `json:"session_id" binding:"required"`
	UserID         uint   `json:"user_id" binding:"required"`
	Action         string `json:"action" binding:"required"` // "joined" or "left"
	ParticipantIDs []uint `json:"participant_ids" binding:"required"`
	NodeID         string `json:"node_id" binding:"required"`
	ProjectID      string `json:"project_id" binding:"required"`
}

// BroadcastChatMessage broadcasts a new chat message to all participants
// @Summary Broadcast chat message event
// @Description Sends SSE event to all participants when a new chat message is created
// @Tags Node Chat
// @Accept json
// @Produce json
// @Param notification body NodeChatMessageNotification true "Message notification"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Router /api/internal/node-chat/broadcast-message [post]
func BroadcastChatMessage(c *gin.Context) {
	var notification NodeChatMessageNotification

	if err := c.ShouldBindJSON(&notification); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create SSE event for new message
	event := services.SSEEvent{
		Event: "node_chat_message",
		Data: map[string]interface{}{
			"session_id": notification.SessionID,
			"message_id": notification.MessageID,
			"sender_id":  notification.SenderID,
			"content":    notification.Content,
			"role":       notification.Role,
			"node_id":    notification.NodeID,
			"project_id": notification.ProjectID,
			"timestamp":  getCurrentTimestamp(),
		},
	}

	// Broadcast to all participants
	services.SendChatEventToParticipants(notification.ParticipantIDs, event)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Chat message broadcasted to participants",
		"sent_to": len(notification.ParticipantIDs),
	})
}

// BroadcastParticipantChange broadcasts participant join/leave events
// @Summary Broadcast participant change event
// @Description Sends SSE event when a participant joins or leaves a chat
// @Tags Node Chat
// @Accept json
// @Produce json
// @Param notification body NodeChatParticipantNotification true "Participant notification"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Router /api/internal/node-chat/broadcast-participant [post]
func BroadcastParticipantChange(c *gin.Context) {
	var notification NodeChatParticipantNotification

	if err := c.ShouldBindJSON(&notification); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create SSE event for participant change
	event := services.SSEEvent{
		Event: "node_chat_participant",
		Data: map[string]interface{}{
			"session_id": notification.SessionID,
			"user_id":    notification.UserID,
			"action":     notification.Action,
			"node_id":    notification.NodeID,
			"project_id": notification.ProjectID,
			"timestamp":  getCurrentTimestamp(),
		},
	}

	// Broadcast to all participants
	services.SendChatEventToParticipants(notification.ParticipantIDs, event)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Participant change broadcasted",
		"sent_to": len(notification.ParticipantIDs),
	})
}

// BroadcastTypingIndicator broadcasts typing indicator to participants
// @Summary Broadcast typing indicator
// @Description Sends SSE event when a user is typing
// @Tags Node Chat
// @Accept json
// @Produce json
// @Param data body map[string]interface{} true "Typing data"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Router /api/internal/node-chat/broadcast-typing [post]
func BroadcastTypingIndicator(c *gin.Context) {
	var data struct {
		SessionID      string `json:"session_id" binding:"required"`
		UserID         uint   `json:"user_id" binding:"required"`
		IsTyping       bool   `json:"is_typing" binding:"required"`
		ParticipantIDs []uint `json:"participant_ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create SSE event for typing indicator
	event := services.SSEEvent{
		Event: "node_chat_typing",
		Data: map[string]interface{}{
			"session_id": data.SessionID,
			"user_id":    data.UserID,
			"is_typing":  data.IsTyping,
			"timestamp":  getCurrentTimestamp(),
		},
	}

	// Broadcast to all participants except the sender
	for _, participantID := range data.ParticipantIDs {
		if participantID != data.UserID {
			services.SendSSEEvent(participantID, event)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Typing indicator broadcasted",
	})
}

// Helper function to get current timestamp
func getCurrentTimestamp() string {
	return time.Now().Format("2006-01-02T15:04:05Z")
}
