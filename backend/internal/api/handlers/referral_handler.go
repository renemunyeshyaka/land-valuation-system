package handlers

import (
	"net/http"
	"strconv"

	"backend/internal/services"
	"backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type ReferralHandler struct {
	referralService *services.ReferralService
}

// NewReferralHandler creates a new referral handler
func NewReferralHandler(referralService *services.ReferralService) *ReferralHandler {
	return &ReferralHandler{
		referralService: referralService,
	}
}

// ValidateReferralCode validates a referral code
// @Summary Validate referral code
// @Description Validate a referral code and get discount information
// @Tags referral
// @Accept json
// @Produce json
// @Param code path string true "Referral code"
// @Success 200 {object} services.ReferralValidationResponse
// @Failure 400 {object} gin.H{error:string}
// @Failure 500 {object} gin.H{error:string}
// @Router /referral/{code} [get]
func (h *ReferralHandler) ValidateReferralCode(c *gin.Context) {
	code := c.Param("code")

	response, err := h.referralService.ValidateReferralCode(c.Request.Context(), code)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Validation failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Referral code validation result", response)
}

// GetReferralStats returns referral program statistics
// @Summary Get referral statistics
// @Description Get referral program statistics (top referrers, total referrals)
// @Tags referral
// @Security BearerAuth
// @Produce json
// @Success 200 {object} gin.H
// @Failure 500 {object} gin.H{error:string}
// @Router /referral/stats [get]
func (h *ReferralHandler) GetReferralStats(c *gin.Context) {
	stats, err := h.referralService.GetReferralStats(c.Request.Context())
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch stats", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Referral statistics", stats)
}

// GetMyReferralInfo returns referral information for the logged-in user
// @Summary Get my referral information
// @Description Get referral code and discount information for the current user
// @Tags referral
// @Security BearerAuth
// @Produce json
// @Success 200 {object} gin.H
// @Failure 401 {object} gin.H{error:string}
// @Failure 500 {object} gin.H{error:string}
// @Router /referral/me [get]
func (h *ReferralHandler) GetMyReferralInfo(c *gin.Context) {
	userID := c.MustGet("user_id").(string)
	var userIDuint uint
	parsed, err := strconv.ParseUint(userID, 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid user ID", err.Error())
		return
	}

	userIDuint = uint(parsed)

	info, err := h.referralService.GetReferralInfo(c.Request.Context(), userIDuint)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch referral info", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Your referral information", info)
}

// GenerateReferralCode generates a new referral code
// @Summary Generate referral code
// @Description Generate a unique referral code for the current user
// @Tags referral
// @Security BearerAuth
// @Produce json
// @Success 200 {object} gin.H{referral_code:string,message:string}
// @Failure 401 {object} gin.H{error:string}
// @Failure 500 {object} gin.H{error:string}
// @Router /referral/generate [post]
func (h *ReferralHandler) GenerateReferralCode(c *gin.Context) {
	userID := c.MustGet("user_id").(string)
	parsed, err := strconv.ParseUint(userID, 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid user ID", err.Error())
		return
	}
	userIDuint := uint(parsed)

	code, err := h.referralService.GenerateReferralCode(c.Request.Context(), userIDuint)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to generate code", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Referral code generated successfully", gin.H{
		"referral_code": code,
		"message":       "Share this code with friends to get discounts",
	})
}
