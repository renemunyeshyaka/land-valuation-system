package handlers

import (
	"net/http"

	"backend/internal/services"
	"backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// EarlyAdopterStatusHandler returns the granted/limit/remaining status of the
// first-20k one-month free-membership promotion. Public endpoint (no auth required).
func EarlyAdopterStatusHandler(promoService *services.PromoService) gin.HandlerFunc {
	return func(c *gin.Context) {
		status, err := promoService.GetEarlyAdopterStatus(c.Request.Context())
		if err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve promo status", err.Error())
			return
		}
		utils.SuccessResponse(c, http.StatusOK, "Early adopter promo status", status)
	}
}
