package handlers

import (
	"fmt"
	"net/http"
	"time"

	"backend/internal/services"
	"backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// ProviderPaymentHandler handles PesaPal and PayPal payment flows.
type ProviderPaymentHandler struct {
	registry *services.ProviderRegistry
}

func NewProviderPaymentHandler(registry *services.ProviderRegistry) *ProviderPaymentHandler {
	return &ProviderPaymentHandler{registry: registry}
}

// GetPaymentMethods returns all available payment methods.
func (h *ProviderPaymentHandler) GetPaymentMethods(c *gin.Context) {
	methods := h.registry.GetAvailableMethods()
	utils.SuccessResponse(c, http.StatusOK, "Available payment methods", methods)
}

// InitiatePesapalPayment starts a PesaPal payment flow.
func (h *ProviderPaymentHandler) InitiatePesapalPayment(c *gin.Context) {
	h.initiateProviderPayment(c, "pesapal")
}

// InitiatePayPalPayment starts a PayPal payment flow.
func (h *ProviderPaymentHandler) InitiatePayPalPayment(c *gin.Context) {
	h.initiateProviderPayment(c, "paypal")
}

func (h *ProviderPaymentHandler) initiateProviderPayment(c *gin.Context, provider string) {
	var req struct {
		Amount        float64 `json:"amount" binding:"required,gt=0"`
		Currency      string  `json:"currency"`
		Description   string  `json:"description"`
		ReturnURL     string  `json:"return_url"`
		CancelURL     string  `json:"cancel_url"`
		CustomerEmail string  `json:"customer_email"`
		CustomerPhone string  `json:"customer_phone"`
		CustomerName  string  `json:"customer_name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, _ := c.Get("userID")

	// Build an internal reference
	reference := fmt.Sprintf("%s_%v_%d", provider, userID, time.Now().UnixMilli())

	providerReq := &services.ProviderPaymentRequest{
		Amount:        req.Amount,
		Currency:      req.Currency,
		Description:   req.Description,
		Reference:     reference,
		ReturnURL:     req.ReturnURL,
		CancelURL:     req.CancelURL,
		CustomerEmail: req.CustomerEmail,
		CustomerPhone: req.CustomerPhone,
		CustomerName:  req.CustomerName,
	}

	resp, err := h.registry.InitiatePayment(c.Request.Context(), provider, providerReq)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to initiate payment", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Payment initiated", resp)
}

// HandlePesapalIPN processes PesaPal Instant Payment Notification callbacks.
func (h *ProviderPaymentHandler) HandlePesapalIPN(c *gin.Context) {
	result, err := h.registry.HandleWebhook(c.Request.Context(), "pesapal", c.Request)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "IPN processing failed", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "IPN processed", result)
}

// HandlePayPalWebhook processes PayPal webhook events.
func (h *ProviderPaymentHandler) HandlePayPalWebhook(c *gin.Context) {
	result, err := h.registry.HandleWebhook(c.Request.Context(), "paypal", c.Request)
	if err != nil {
		// Return 200 to acknowledge receipt even if processing fails (PayPal will retry)
		utils.ErrorResponse(c, http.StatusOK, "Webhook processing error", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Webhook processed", result)
}

// VerifyPesapalPayment checks the status of a PesaPal payment.
func (h *ProviderPaymentHandler) VerifyPesapalPayment(c *gin.Context) {
	transactionID := c.Param("transaction_id")
	if transactionID == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Missing transaction_id", "")
		return
	}

	provider, err := h.registry.Get("pesapal")
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Provider not found", err.Error())
		return
	}

	status, err := provider.VerifyPayment(c.Request.Context(), transactionID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to verify payment", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Payment status", status)
}

// VerifyPayPalPayment checks the status of a PayPal payment.
func (h *ProviderPaymentHandler) VerifyPayPalPayment(c *gin.Context) {
	orderID := c.Param("order_id")
	if orderID == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Missing order_id", "")
		return
	}

	provider, err := h.registry.Get("paypal")
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Provider not found", err.Error())
		return
	}

	status, err := provider.VerifyPayment(c.Request.Context(), orderID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to verify payment", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Payment status", status)
}
