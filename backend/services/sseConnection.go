package services

import (
	"fmt"
	"sync"
)

// SSEEvent represents an event to be sent via SSE
type SSEEvent struct {
	Event string      // Optional event type (e.g., "notification", "message")
	Data  interface{} // JSON-serializable data
}

// SSEPool maintains active SSE connections
type SSEPool struct {
	clients sync.Map // map[uint]chan SSEEvent
}

var ssePool = SSEPool{}

// RegisterSSEClient registers a user's SSE event channel
func RegisterSSEClient(userID uint, eventChan chan SSEEvent) {
	ssePool.clients.Store(userID, eventChan)
	fmt.Printf("SSE client registered for user %d\n", userID)
}

// UnregisterSSEClient removes the SSE connection for a user
func UnregisterSSEClient(userID uint) {
	if ch, exists := ssePool.clients.LoadAndDelete(userID); exists {
		if eventChan, ok := ch.(chan SSEEvent); ok {
			close(eventChan)
		}
		fmt.Printf("SSE client unregistered for user %d\n", userID)
	}
}

// IsUserOnlineSSE checks if a user is connected via SSE
func IsUserOnlineSSE(userID uint) bool {
	_, exists := ssePool.clients.Load(userID)
	return exists
}

// SendSSEEvent sends an event to a specific user via SSE
func SendSSEEvent(userID uint, event SSEEvent) {
	if ch, exists := ssePool.clients.Load(userID); exists {
		if eventChan, ok := ch.(chan SSEEvent); ok {
			// Non-blocking send to prevent slow clients from blocking
			select {
			case eventChan <- event:
				// Event sent successfully
			default:
				fmt.Printf("Warning: Event channel full for user %d, dropping event\n", userID)
			}
		}
	} else {
		fmt.Printf("User %d is offline, cannot send SSE event\n", userID)
	}
}

// BroadcastSSEEvent sends an event to all connected users
func BroadcastSSEEvent(event SSEEvent) {
	ssePool.clients.Range(func(key, value interface{}) bool {
		if eventChan, ok := value.(chan SSEEvent); ok {
			select {
			case eventChan <- event:
				// Event sent successfully
			default:
				fmt.Printf("Warning: Event channel full for user %v, dropping broadcast event\n", key)
			}
		}
		return true
	})
}

// SendChatEventToParticipants sends a chat event to specific participants
// Used for multi-user chat collaboration to notify all participants when:
// - A new message is sent
// - A user joins/leaves the chat
// - A message is deleted
// - Someone is typing
func SendChatEventToParticipants(participantIDs []uint, event SSEEvent) {
	for _, userID := range participantIDs {
		SendSSEEvent(userID, event)
	}
	fmt.Printf("Chat event sent to %d participants\n", len(participantIDs))
}
