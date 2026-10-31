package websockets

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// Upgrader to upgrade HTTP requests to WebSocket
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for simplicity. Adjust for production.
	},
}

// ClientManager to manage WebSocket connections
type ClientManager struct {
	Clients    map[*websocket.Conn]bool
	Broadcast  chan Message
	Register   chan *websocket.Conn
	Unregister chan *websocket.Conn
}

// Message structure for WebSocket messages
type Message struct {
	ChatID int    `json:"chatId"`
	Sender string `json:"sender"`
	Text   string `json:"text"`
}

// Initialize a global client manager
var manager = ClientManager{
	Clients:    make(map[*websocket.Conn]bool),
	Broadcast:  make(chan Message),
	Register:   make(chan *websocket.Conn),
	Unregister: make(chan *websocket.Conn),
}

// HandleConnections handles new WebSocket connections
func HandleConnections(c *gin.Context) {
	// Upgrade HTTP to WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("Failed to upgrade connection:", err)
		return
	}
	defer conn.Close()

	// Register the client
	manager.Register <- conn

	// Handle client communication
	for {
		var msg Message
		err := conn.ReadJSON(&msg)
		if err != nil {
			log.Println("Error reading message:", err)
			manager.Unregister <- conn
			break
		}
		manager.Broadcast <- msg
	}
}

// StartWebSocketServer starts the WebSocket server
func StartWebSocketServer() {
	go func() {
		for {
			select {
			case conn := <-manager.Register:
				manager.Clients[conn] = true
				log.Println("Client connected")
			case conn := <-manager.Unregister:
				if _, ok := manager.Clients[conn]; ok {
					delete(manager.Clients, conn)
					log.Println("Client disconnected")
				}
			case msg := <-manager.Broadcast:
				for client := range manager.Clients {
					err := client.WriteJSON(msg)
					if err != nil {
						log.Println("Error sending message:", err)
						client.Close()
						delete(manager.Clients, client)
					}
				}
			}
		}
	}()
}
