package handlers

import (
	"log"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type WSNotificationHub struct {
	clients    map[*websocket.Conn]bool
	broadcast  chan []byte
	register   chan *websocket.Conn
	unregister chan *websocket.Conn
	mu         sync.Mutex
}

// Global instance for broadcasting from other handlers
var WSNotificationHubInstance *WSNotificationHub

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func NewWSNotificationHub() *WSNotificationHub {
	hub := &WSNotificationHub{
		clients:    make(map[*websocket.Conn]bool),
		broadcast:  make(chan []byte),
		register:   make(chan *websocket.Conn),
		unregister: make(chan *websocket.Conn),
	}
	go hub.run()
	return hub
}

func (hub *WSNotificationHub) run() {
	for {
		select {
		case conn := <-hub.register:
			hub.mu.Lock()
			hub.clients[conn] = true
			hub.mu.Unlock()
		case conn := <-hub.unregister:
			hub.mu.Lock()
			if _, ok := hub.clients[conn]; ok {
				delete(hub.clients, conn)
			}
			hub.mu.Unlock()
		case message := <-hub.broadcast:
			hub.mu.Lock()
			for conn := range hub.clients {
				err := conn.WriteMessage(websocket.TextMessage, message)
				if err != nil {
					log.Printf("WebSocket send error: %v", err)
					conn.Close()
					delete(hub.clients, conn)
				}
			}
			hub.mu.Unlock()
		}
	}
}

func (hub *WSNotificationHub) HandleWS(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	hub.register <- conn
	defer func() { hub.unregister <- conn }()

	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func (hub *WSNotificationHub) Broadcast(message []byte) {
	hub.broadcast <- message
}
