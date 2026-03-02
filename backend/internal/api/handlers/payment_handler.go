package handlers

import (
	"net/http"

	"backend/internal/services"
	"backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type PaymentHandler struct {
	paymentService *services.PaymentService
}

func NewPaymentHandler(paymentService *services.PaymentService) *PaymentHandler {
	return &PaymentHandler{
		paymentService: paymentService,
	}
}

// InitiateCardPayment initiates card payment
// @Router /payments/card [post]
func (h *PaymentHandler) InitiateCardPayment(c *gin.Context) {
	type CardPaymentRequest struct {
		Amount       float64 `json:"amount" binding:"required,gt=0"`
		Currency     string  `json:"currency" binding:"required"`
		CardToken    string  `json:"card_token" binding:"required"`
		Description  string  `json:"description"`
		TransactionType string `json:"transaction_type"`
	}

	userID := c.MustGet("user_id").(string)

	var req CardPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	transaction, err := h.paymentService.ProcessCardPayment(c.Request.Context(), userID, req.Amount, req.CardToken, req.Description, req.TransactionType)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Payment processing failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Payment initiated", transaction)
}

// InitiateMobileMoneyPayment initiates mobile money payment
// @Router /payments/mobile-money [post]
func (h *PaymentHandler) InitiateMobileMoneyPayment(c *gin.Context) {
	type MobileMoneyRequest struct {
		Amount           float64 `json:"amount" binding:"required,gt=0"`
		Currency         string  `json:"currency" binding:"required"`
		PhoneNumber      string  `json:"phone_number" binding:"required"`
		Provider         string  `json:"provider" binding:"required"`
		Description      string  `json:"description"`
		TransactionType  string  `json:"transaction_type"`
	}

	userID := c.MustGet("user_id").(string)

	var req MobileMoneyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	transaction, err := h.paymentService.ProcessMobileMoneyPayment(c.Request.Context(), userID, req.Amount, req.PhoneNumber, req.Provider, req.Description, req.TransactionType)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Mobile money payment failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Mobile money payment initiated", transaction)
}

// InitiateBankTransfer initiates bank transfer
// @Router /payments/bank-transfer [post]
func (h *PaymentHandler) InitiateBankTransfer(c *gin.Context) {
	type BankTransferRequest struct {
		Amount         float64 `json:"amount" binding:"required,gt=0"`
		Currency       string  `json:"currency" binding:"required"`
		BankName       string  `json:"bank_name" binding:"required"`
		AccountNumber  string  `json:"account_number" binding:"required"`
		AccountName    string  `json:"account_name"`
		SwiftCode      string  `json:"swift_code"`
		Description    string  `json:"description"`
		TransactionType string  `json:"transaction_type"`
	}

	userID := c.MustGet("user_id").(string)

	var req BankTransferRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	transaction, err := h.paymentService.ProcessBankTransfer(c.Request.Context(), userID, req.Amount, req.BankName, req.AccountNumber, req.Description, req.TransactionType)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Bank transfer failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Bank transfer initiated", transaction)
}

// GetPaymentMethods retrieves user payment methods
// @Router /payments/methods [get]
func (h *PaymentHandler) GetPaymentMethods(c *gin.Context) {
	userID := c.MustGet("user_id").(string)

	methods, err := h.paymentService.GetPaymentMethods(c.Request.Context(), userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve payment methods", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Payment methods retrieved", methods)
}

// AddPaymentMethod adds a payment method
// @Router /payments/methods [post]
func (h *PaymentHandler) AddPaymentMethod(c *gin.Context) {
	type AddPaymentMethodRequest struct {
		MethodType string            `json:"method_type" binding:"required"`
		Details    map[string]string `json:"details" binding:"required"`
		IsDefault  bool              `json:"is_default"`
	}

	userID := c.MustGet("user_id").(string)

	var req AddPaymentMethodRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	method, err := h.paymentService.AddPaymentMethod(c.Request.Context(), userID, req.MethodType, req.Details, req.IsDefault)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to add payment method", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Payment method added", method)
}

// DeletePaymentMethod deletes a payment method
// @Router /payments/methods/:id [delete]
func (h *PaymentHandler) DeletePaymentMethod(c *gin.Context) {
	methodID := c.Param("id")
	userID := c.MustGet("user_id").(string)

	if err := h.paymentService.DeletePaymentMethod(c.Request.Context(), userID, methodID); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to delete payment method", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Payment method deleted", nil)
}

// GetTransactionHistory retrieves transaction history
// @Router /payments/transactions [get]
func (h *PaymentHandler) GetTransactionHistory(c *gin.Context) {
	userID := c.MustGet("user_id").(string)
	status := c.Query("status")

	transactions, err := h.paymentService.GetTransactionHistory(c.Request.Context(), userID, status)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve transactions", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Transactions retrieved", transactions)
}

// HandleWebhook handles payment provider webhooks
// @Router /payments/webhook [post]
func (h *PaymentHandler) HandleWebhook(c *gin.Context) {
	var webhook map[string]interface{}
	if err := c.ShouldBindJSON(&webhook); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid webhook", err.Error())
		return
	}

	provider := c.Query("provider")
	
	if err := h.paymentService.ProcessWebhook(c.Request.Context(), provider, webhook); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Webhook processing failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Webhook processed", nil)
}

// RequestRefund requests refund for transaction
// @Router /payments/refund [post]
func (h *PaymentHandler) RequestRefund(c *gin.Context) {
	type RefundRequest struct {
		TransactionID string `json:"transaction_id" binding:"required"`
		Reason        string `json:"reason"`
		Amount        float64 `json:"amount"`
	}

	userID := c.MustGet("user_id").(string)

	var req RefundRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	refund, err := h.paymentService.RequestRefund(c.Request.Context(), userID, req.TransactionID, req.Reason, req.Amount)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Refund request failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Refund requested", refund)
}
