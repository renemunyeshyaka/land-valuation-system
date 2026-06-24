package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"

	"backend/internal/repository"
	"backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type UnsubscribeHandler struct {
	leadRepo *repository.LeadRepository
}

func NewUnsubscribeHandler(leadRepo *repository.LeadRepository) *UnsubscribeHandler {
	return &UnsubscribeHandler{leadRepo: leadRepo}
}

// Unsubscribe handles GET /api/v1/unsubscribe/:token
// One-click unsubscribe — no auth required, link in email footer
func (h *UnsubscribeHandler) Unsubscribe(c *gin.Context) {
	token := c.Param("token")
	if token == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid unsubscribe token", "missing token")
		return
	}

	page := "<html><body style='font-family:sans-serif;text-align:center;padding:60px 20px'><h2 style='color:#0b5e42'>Unsubscribed</h2><p>You have been unsubscribed from LandVal marketing emails.</p><p style='color:#666;font-size:14px'>You will no longer receive promotional emails from Land Valuation System.</p></body></html>"

	if err := h.leadRepo.Unsubscribe(c.Request.Context(), token); err != nil {
		// Token not found or already unsubscribed — still show success page
		c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(page))
		return
	}

	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(page))
}

// GenerateToken creates a cryptographically random token for unsubscribe links
func GenerateUnsubscribeToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
