package controllers

import (
	"fmt"
	"net/http"
	"time"

	"projectup/helper"
	"projectup/models"
	"projectup/services"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// WebSocket Upgrader to handle WebSocket connections
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// WebSocketHandler manages incoming WebSocket connections
// @Summary WebSocket Connection
// @Description Establishes a WebSocket connection for real-time chat, notifications, and contact requests
// @Tags WebSocket
// @Security BearerAuth
// @Produce json
// @Param token query string true "JWT Token for authentication"
// @Success 101 {object} map[string]interface{} "WebSocket connection established"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Failed to upgrade connection"
// @Router /ws [get]
func WebSocketHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.Query("token")
		claims, err := helper.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			return
		}

		userID := claims.ID

		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upgrade connection"})
			return
		}
		defer conn.Close()

		// Register user WebSocket connection
		services.RegisterClient(userID, conn)
		fmt.Printf("User %d connected\n", userID)

		for {
			var msg struct {
				Type             string    `json:"type"`
				ChatID           uint      `json:"chat_id,omitempty"`
				SenderID         uint      `json:"sender_id,omitempty"`
				ReceiverID       uint      `json:"receiver_id,omitempty"`
				Content          string    `json:"content,omitempty"`
				Timestamp        time.Time `json:"timestamp,omitempty"`
				IsRead           bool      `json:"is_read,omitempty"`
				NotificationID   uint      `json:"notification_id,omitempty"`
				NotificationType string    `json:"notification_type,omitempty"`
				Title            string    `json:"title,omitempty"`
				Description      string    `json:"description,omitempty"`
				URL              string    `json:"url,omitempty"`
				SenderName       string    `json:"sender_name,omitempty"`
				Status           uint      `json:"status,omitempty"`
			}

			if err := conn.ReadJSON(&msg); err != nil {
				fmt.Printf("Error reading WebSocket message from user %d: %v\n", userID, err)
				break
			}

			// Handle WebSocket messages based on type
			switch msg.Type {
			case "chat_message":
				// The sender is the authenticated connection, never the payload's sender_id
				if err := services.SendPrivateMessage(msg.ChatID, userID, msg.Content); err != nil {
					fmt.Printf("Rejected chat message from user %d to chat %d: %v\n", userID, msg.ChatID, err)
				}

			case "notification":
				notification := models.Notification{
					UserID:      userID,
					Title:       msg.Title,
					Description: msg.Description,
					URL:         msg.URL,
					IsRead:      false,
					CreatedAt:   time.Now(),
				}
				services.HandleNotification(notification)

			case "contact_request":
				contactReq := models.ContactRequest{
					UserID:    userID, // Requests are always from the connected user
					ContactID: msg.ReceiverID,
					Status:    0, // Pending
					CreatedAt: time.Now(),
				}
				services.HandleContactRequest(contactReq)

			default:
				fmt.Println("Unknown WebSocket message type:", msg.Type)
			}
		}

		// Cleanup user connection when they disconnect
		services.UnregisterClient(userID)
		fmt.Printf("User %d disconnected\n", userID)
	}
}
