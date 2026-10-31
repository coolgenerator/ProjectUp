package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"projectup/helper"
	"projectup/services"

	"github.com/gin-gonic/gin"
)

// SSEHandler manages Server-Sent Events connections for real-time updates
// @Summary SSE Connection for Real-time Updates
// @Description Establishes an SSE connection for receiving real-time notifications, messages, and contact requests
// @Tags SSE
// @Security BearerAuth
// @Produce text/event-stream
// @Param token query string true "JWT Token for authentication"
// @Success 200 {string} string "SSE stream established"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Router /api/sse/events [get]
func SSEHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Validate token from query parameter
		token := c.Query("token")
		claims, err := helper.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			return
		}

		userID := claims.ID

		// Set headers for SSE
		c.Writer.Header().Set("Content-Type", "text/event-stream")
		c.Writer.Header().Set("Cache-Control", "no-cache")
		c.Writer.Header().Set("Connection", "keep-alive")
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("X-Accel-Buffering", "no") // Disable proxy buffering

		// Create a channel for this user's events
		eventChan := make(chan services.SSEEvent, 100) // Buffer to prevent blocking

		// Register the SSE client
		services.RegisterSSEClient(userID, eventChan)
		defer services.UnregisterSSEClient(userID)

		fmt.Printf("User %d connected via SSE\n", userID)

		// Set up a ticker for keep-alive comments (every 30 seconds)
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		// Context for handling client disconnection
		clientGone := c.Request.Context().Done()

		// Send initial connection success event
		initialEvent := map[string]interface{}{
			"type":    "connected",
			"message": "SSE connection established",
		}
		if data, err := json.Marshal(initialEvent); err == nil {
			fmt.Fprintf(c.Writer, "data: %s\n\n", data)
			c.Writer.Flush()
		}

		// Main event loop
		for {
			select {
			case <-clientGone:
				// Client disconnected
				fmt.Printf("User %d disconnected from SSE\n", userID)
				return

			case event := <-eventChan:
				// Send event to client
				data, err := json.Marshal(event.Data)
				if err != nil {
					fmt.Printf("Error marshaling SSE event for user %d: %v\n", userID, err)
					continue
				}

				// SSE format: event: <event_type>\ndata: <json_data>\n\n
				if event.Event != "" {
					fmt.Fprintf(c.Writer, "event: %s\n", event.Event)
				}
				fmt.Fprintf(c.Writer, "data: %s\n\n", data)
				c.Writer.Flush()

			case <-ticker.C:
				// Send keep-alive comment to prevent timeout
				fmt.Fprintf(c.Writer, ": keep-alive\n\n")
				c.Writer.Flush()
			}
		}
	}
}
