package handlers

import (
	"net/http"
	"regexp"
	"strconv"

	"backend/internal/services"
	"backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// Constants for payment validation
const (
	MinPaymentAmount = 100.0      // Minimum RWF
	MaxPaymentAmount = 50000000.0 // Maximum RWF
	RWFTousdRate     = 0.00079    // Approximate RWF to USD conversion
)

// Payment provider phone patterns
var phonePatterns = map[string]string{
	"mtn":    `^(\+250|0)?7(8|9)[0-9]{7}$`, // MTN RW: +250 or 0, then 78 or 79 + 7 digits
	"airtel": `^(\+250|0)?7[3|4][0-9]{7}$`, // Airtel RW: +250 or 0, then 73 or 74 + 7 digits
}

// MobileMoneyRequest represents a mobile money payment request
type MobileMoneyRequest struct {
	Amount      float64 `json:"amount" binding:"required,gt=0" example:"50000"`
	PhoneNumber string  `json:"phone_number" binding:"required" example:"+250788123456"`
	Provider    string  `json:"provider" binding:"required,oneof=mtn airtel" example:"mtn"`
	Description string  `json:"description" example:"Property payment"`
}

type PaymentHandler struct {
	paymentService *services.PaymentService
}

func NewPaymentHandler(paymentService *services.PaymentService) *PaymentHandler {
	return &PaymentHandler{
		paymentService: paymentService,
	}
}

// validatePhoneNumber validates phone number format for provider
func validatePhoneNumber(phone, provider string) bool {
	pattern, exists := phonePatterns[provider]
	if !exists {
		return false
	}
	matched, err := regexp.MatchString(pattern, phone)
	return err == nil && matched
}

// normalizePhoneNumber normalizes phone to international format
func normalizePhoneNumber(phone string) string {
	// Remove spaces and hyphens
	cleaned := regexp.MustCompile(`[\s\-]`).ReplaceAllString(phone, "")

	// If starts with 0, replace with +250
	if len(cleaned) > 0 && cleaned[0] == '0' {
		cleaned = "+250" + cleaned[1:]
	}

	// If doesn't start with +, add +250
	if len(cleaned) > 0 && cleaned[0] != '+' {
		cleaned = "+250" + cleaned
	}

	return cleaned
}

// InitiateMobileMoneyPayment initiates mobile money payment
// @Summary Initiate mobile money payment
// @Description Initiate a payment via MTN or Airtel mobile money with validation
// @Tags payments
// @Accept json
// @Produce json
// @Param request body MobileMoneyRequest true "Payment request"
// @Success 201 {object} utils.APIResponse "Payment initiated"
// @Failure 400 {object} utils.APIResponse "Invalid request or validation failed"
// @Failure 401 {object} utils.APIResponse "Unauthorized"
// @Failure 500 {object} utils.APIResponse "Server error"
// @Security BearerAuth
// @Router /payments/mobile-money [post]
func (h *PaymentHandler) InitiateMobileMoneyPayment(c *gin.Context) {
	userID := c.MustGet("user_id").(string)

	var req MobileMoneyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid payment request format", err.Error())
		return
	}

	// Validate amount range
	if req.Amount < MinPaymentAmount {
		utils.ErrorResponse(c, http.StatusBadRequest, "Amount validation failed",
			"Minimum payment amount is 100 RWF")
		return
	}
	if req.Amount > MaxPaymentAmount {
		utils.ErrorResponse(c, http.StatusBadRequest, "Amount validation failed",
			"Maximum payment amount is 50,000,000 RWF")
		return
	}

	// Normalize and validate phone number
	normalizedPhone := normalizePhoneNumber(req.PhoneNumber)
	if !validatePhoneNumber(normalizedPhone, req.Provider) {
		utils.ErrorResponse(c, http.StatusBadRequest, "Phone number validation failed",
			"Invalid phone number format for "+req.Provider)
		return
	}

	userIDUint, err := strconv.ParseUint(userID, 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid user ID", err.Error())
		return
	}

	// Create payment request with normalized phone
	paymentReq := &services.PaymentRequest{
		UserID:          uint(userIDUint),
		Amount:          req.Amount,
		Currency:        "RWF",
		PhoneNumber:     normalizedPhone,
		PaymentProvider: req.Provider,
		Description:     req.Description,
	}

	// Initiate payment
	response, err := h.paymentService.InitiatePayment(c.Request.Context(), paymentReq)
	if err != nil {
		// Distinguish between different error types
		switch err.Error() {
		case "insufficient_balance":
			utils.ErrorResponse(c, http.StatusBadRequest, "Payment initiation failed",
				"Insufficient balance for this transaction")
		case "transaction_limit_exceeded":
			utils.ErrorResponse(c, http.StatusBadRequest, "Payment initiation failed",
				"Daily transaction limit exceeded")
		case "provider_unreachable":
			utils.ErrorResponse(c, http.StatusServiceUnavailable, "Payment initiation failed",
				"Payment provider is currently unavailable")
		default:
			utils.ErrorResponse(c, http.StatusBadRequest, "Payment initiation failed", err.Error())
		}
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Mobile money payment initiated successfully", response)
}

// CheckPaymentStatus checks the status of a payment
// @Summary Check payment status
// @Description Retrieve the current status of a payment transaction
// @Tags payments
// @Accept json
// @Produce json
// @Param transaction_id path string true "Transaction ID"
// @Param provider query string true "Payment provider (mtn|airtel)"
// @Success 200 {object} utils.APIResponse "Payment status retrieved"
// @Failure 404 {object} utils.APIResponse "Transaction not found"
// @Failure 500 {object} utils.APIResponse "Server error"
// @Router /payments/{transaction_id}/status [get]
func (h *PaymentHandler) CheckPaymentStatus(c *gin.Context) {
	transactionID := c.Param("transaction_id")
	provider := c.Query("provider")

	// Validate transaction ID
	if transactionID == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Transaction ID is required", "")
		return
	}

	// Validate provider
	if provider != "mtn" && provider != "airtel" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid provider",
			"Provider must be 'mtn' or 'airtel'")
		return
	}

	response, err := h.paymentService.CheckPaymentStatus(c.Request.Context(), transactionID, provider)
	if err != nil {
		if err.Error() == "transaction_not_found" {
			utils.ErrorResponse(c, http.StatusNotFound, "Payment status check failed",
				"Transaction not found")
		} else {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to check payment status",
				err.Error())
		}
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Payment status retrieved successfully", response)
}

// HandlePaymentCallback handles payment provider callbacks
// @Summary Handle payment callback
// @Description Process payment provider callbacks (webhook)
// @Tags payments
// @Accept json
// @Produce json
// @Param provider query string true "Payment provider (mtn|airtel)"
// @Param payload body map[string]interface{} true "Callback payload"
// @Success 200 {object} utils.APIResponse "Callback processed"
// @Failure 400 {object} utils.APIResponse "Invalid callback"
// @Failure 500 {object} utils.APIResponse "Server error"
// @Router /payments/callback [post]
func (h *PaymentHandler) HandlePaymentCallback(c *gin.Context) {
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid callback format", err.Error())
		return
	}

	provider := c.Query("provider")

	// Validate provider
	if provider != "mtn" && provider != "airtel" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid provider",
			"Provider must be 'mtn' or 'airtel'")
		return
	}

	// Validate required callback fields
	if payload["transaction_id"] == nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid callback",
			"Missing required field: transaction_id")
		return
	}

	if err := h.paymentService.ProcessCallback(c.Request.Context(), provider, payload); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Callback processing failed",
			err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Callback processed successfully", nil)
}
