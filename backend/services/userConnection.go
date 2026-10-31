package services

import (
	"fmt"
	"sync"

	"github.com/gorilla/websocket"
)

// WebSocketPool maintains active user connections
type WebSocketPool struct {
	pool sync.Map
}

var wsPool = WebSocketPool{}

// RegisterClient registers a user WebSocket connection
func RegisterClient(userID uint, conn *websocket.Conn) {
	wsPool.pool.Store(userID, conn)
	fmt.Printf("User %d connected\n", userID)
}

// UnregisterClient removes the WebSocket connection for a user
func UnregisterClient(userID uint) {
	wsPool.pool.Delete(userID)
	fmt.Printf("User %d disconnected\n", userID)
}

// IsUserOnline checks if a user is connected via WebSocket or SSE
func IsUserOnline(userID uint) bool {
	_, wsExists := wsPool.pool.Load(userID)
	sseExists := IsUserOnlineSSE(userID)
	return wsExists || sseExists
}

// NotifyUser sends a message to a user via SSE (preferred) or WebSocket (fallback)
func NotifyUser(receiverID uint, msg interface{}) {
	// Try SSE first (more efficient)
	if IsUserOnlineSSE(receiverID) {
		event := SSEEvent{
			Event: getEventType(msg),
			Data:  msg,
		}
		SendSSEEvent(receiverID, event)
		return
	}

	// Fallback to WebSocket if still connected
	conn, exists := wsPool.pool.Load(receiverID)
	if exists {
		if wsConn, ok := conn.(*websocket.Conn); ok {
			err := wsConn.WriteJSON(msg)
			if err != nil {
				fmt.Printf("Error notifying user %d via WebSocket: %v\n", receiverID, err)
			}
		}
	} else {
		fmt.Printf("User %d is offline, storing message for later.\n", receiverID)
	}
}

// getEventType extracts the event type from the message
func getEventType(msg interface{}) string {
	if msgMap, ok := msg.(map[string]interface{}); ok {
		if typeVal, exists := msgMap["type"]; exists {
			if typeStr, ok := typeVal.(string); ok {
				return typeStr
			}
		}
	}
	return ""
}
