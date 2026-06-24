package handlers

import (
	"net/http"
	"os"

	"backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type AIConfigHandler struct{}

func NewAIConfigHandler() *AIConfigHandler {
	return &AIConfigHandler{}
}

// GetConfig returns the current AI targeting configuration from environment variables
func (h *AIConfigHandler) GetConfig(c *gin.Context) {
	utils.SuccessResponse(c, http.StatusOK, "AI targeting configuration", gin.H{
		"deepseek_api_key":      maskKey(os.Getenv("DEEPSEEK_API_KEY")),
		"deepseek_model":        os.Getenv("DEEPSEEK_MODEL"),
		"deepseek_base_url":     os.Getenv("DEEPSEEK_BASE_URL"),
		"lead_aggregator_cron":  os.Getenv("LEAD_AGGREGATOR_CRON"),
		"lead_score_threshold":  os.Getenv("LEAD_SCORE_THRESHOLD"),
		"whatsapp_provider":     os.Getenv("WHATSAPP_PROVIDER"),
		"ai_service_configured": os.Getenv("DEEPSEEK_API_KEY") != "",
	})
}

// maskKey returns a masked version of a sensitive key for display
func maskKey(key string) string {
	if len(key) <= 8 {
		return "********"
	}
	return key[:4] + "****" + key[len(key)-4:]
}
