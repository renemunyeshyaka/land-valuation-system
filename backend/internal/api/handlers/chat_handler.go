package handlers

import (
	"net/http"

	"backend/internal/services"

	"github.com/gin-gonic/gin"
)

// ChatHandler handles chat interactions with LandVal Assistant
type ChatHandler struct {
	aiService *services.AIService
}

// NewChatHandler creates a new ChatHandler
func NewChatHandler(aiService *services.AIService) *ChatHandler {
	return &ChatHandler{aiService: aiService}
}

// ChatRequest is the incoming chat message from the frontend
type ChatRequest struct {
	Message string `json:"message" binding:"required"`
}

// Chat handles POST /api/v1/chat — sends a message to LandVal Assistant
func (h *ChatHandler) Chat(c *gin.Context) {
	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Message is required"})
		return
	}

	if !h.aiService.IsConfigured() {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "AI Assistant is not configured. Please set DEEPSEEK_API_KEY in .env",
		})
		return
	}

	aiReq := services.ChatRequest{
		Message: req.Message,
	}

	resp, err := h.aiService.Chat(c.Request.Context(), aiReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get response from AI Assistant: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": resp.Message,
	})
}
