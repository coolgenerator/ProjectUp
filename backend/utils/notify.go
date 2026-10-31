package utils

import (
	"fmt"
	"projectup/models"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// WebSocketPool manages WebSocket connections for users
type WebSocketPool struct {
	pool sync.Map
}

var wsPool = WebSocketPool{}

// RegisterClient registers a new WebSocket connection for a user
func RegisterClient(userID uint, conn *websocket.Conn) {
	wsPool.pool.Store(userID, conn)
	fmt.Printf("User %d connected\n", userID)
}

// UnregisterClient removes the WebSocket connection for a user
func UnregisterClient(userID uint) {
	wsPool.pool.Delete(userID)
	fmt.Printf("User %d disconnected\n", userID)
}

// IsUserOnline checks if a user is connected via WebSocket
func IsUserOnline(userID uint) bool {
	_, exists := wsPool.pool.Load(userID)
	return exists
}

// NotifyUser sends a notification via WebSocket if the user is online
// Note: This does NOT save to the database, that should be done separately
func NotifyUser(userID uint, title string, description string, url string) {
	// Create a notification object
	notification := models.Notification{
		UserID:      userID,
		Title:       title,
		Description: description,
		URL:         url,
		IsRead:      false,
		CreatedAt:   time.Now(),
	}

	// Try sending the notification via WebSocket
	conn, exists := wsPool.pool.Load(userID)
	if exists {
		if wsConn, ok := conn.(*websocket.Conn); ok {
			wsMessage := map[string]interface{}{
				"type":         "notification",
				"notification": notification,
			}

			err := wsConn.WriteJSON(wsMessage)
			if err != nil {
				fmt.Printf("Error sending WebSocket notification to user %d: %v\n", userID, err)
			} else {
				fmt.Printf("Notification sent to user %d via WebSocket.\n", userID)
			}
		}
	}
}
