package handlers

import (
	"backend/internal/services"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type BoostHandler struct {
	BoostService *services.BoostService
}

func NewBoostHandler(boostService *services.BoostService) *BoostHandler {
	return &BoostHandler{BoostService: boostService}
}

// POST /api/v1/boosts
func (h *BoostHandler) CreateBoost(c *gin.Context) {
	var req struct {
		PropertyID  uint   `json:"property_id" binding:"required"`
		UserID      uint   `json:"user_id" binding:"required"`
		DurationHrs int    `json:"duration_hours" binding:"required"`
		Type        string `json:"type" binding:"required"` // featured, boost
		PaymentID   *uint  `json:"payment_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	boost, err := h.BoostService.CreateBoost(c.Request.Context(), req.PropertyID, req.UserID, req.DurationHrs, req.Type, req.PaymentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, boost)
}

// GET /api/v1/boosts/active/:property_id
func (h *BoostHandler) GetActiveBoostForProperty(c *gin.Context) {
	propertyID, err := strconv.ParseUint(c.Param("property_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid property_id"})
		return
	}
	boost, err := h.BoostService.GetActiveBoostForProperty(c.Request.Context(), uint(propertyID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no active boost found"})
		return
	}
	c.JSON(http.StatusOK, boost)
}

// GET /api/v1/boosts/active
func (h *BoostHandler) ListActiveBoosts(c *gin.Context) {
	boosts, err := h.BoostService.ListActiveBoosts(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, boosts)
}
