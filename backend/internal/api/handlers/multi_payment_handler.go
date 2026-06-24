package handlers

import (
	"backend/internal/services"
	"backend/internal/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

// MultiPaymentHandler consolidates all payment methods
type MultiPaymentHandler struct {
	mobilePaymentService *services.PaymentService
	bankPaymentService   *services.BankPaymentService
}

func NewMultiPaymentHandler(
	mobilePayment *services.PaymentService,
	bankPayment *services.BankPaymentService,
) *MultiPaymentHandler {
	return &MultiPaymentHandler{
		mobilePaymentService: mobilePayment,
		bankPaymentService:   bankPayment,
	}
}

// ============================================
// BANK PAYMENT ENDPOINTS
// ============================================

// InitiateBankPayment handles POST /api/v1/payments/bank/initiate
func (h *MultiPaymentHandler) InitiateBankPayment(c *gin.Context) {
	var req services.BankPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("userID")
	if exists {
		req.UserID = userID.(uint)
	}

	response, err := h.bankPaymentService.InitiateBankPayment(c.Request.Context(), &req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to initiate bank payment", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Bank payment initiated successfully", response)
}

// SubmitBankPaymentProof handles POST /api/v1/payments/bank/submit-proof
func (h *MultiPaymentHandler) SubmitBankPaymentProof(c *gin.Context) {
	var req services.BankPaymentProofRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	if err := h.bankPaymentService.SubmitPaymentProof(c.Request.Context(), &req); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to submit proof", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Payment proof submitted successfully. Awaiting admin verification.", nil)
}

// VerifyBankPayment handles POST /api/v1/payments/bank/verify (Admin only)
func (h *MultiPaymentHandler) VerifyBankPayment(c *gin.Context) {
	var req struct {
		TransactionID string `json:"transaction_id" binding:"required"`
		Approved      bool   `json:"approved"`
		AdminNotes    string `json:"admin_notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	if err := h.bankPaymentService.VerifyBankPayment(c.Request.Context(), req.TransactionID, req.Approved, req.AdminNotes); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to verify payment", err.Error())
		return
	}

	status := "rejected"
	if req.Approved {
		status = "approved"
	}

	utils.SuccessResponse(c, http.StatusOK, "Payment "+status+" successfully", nil)
}

// GetBankPaymentStatus handles GET /api/v1/payments/bank/status/:transaction_id
func (h *MultiPaymentHandler) GetBankPaymentStatus(c *gin.Context) {
	transactionID := c.Param("transaction_id")

	response, err := h.bankPaymentService.GetBankPaymentStatus(c.Request.Context(), transactionID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Transaction not found", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Bank payment status retrieved", response)
}

// ============================================
// UNIFIED PAYMENT METHODS ENDPOINT
// ============================================

// GetAvailablePaymentMethods handles GET /api/v1/payments/methods
func (h *MultiPaymentHandler) GetAvailablePaymentMethods(c *gin.Context) {
	methods := map[string]interface{}{
		"mobile_money": map[string]interface{}{
			"enabled":     true,
			"providers":   []string{"MTN MoMo"},
			"currency":    "EUR",
			"description": "Instant mobile money transfer",
		},
		"bank_transfer": map[string]interface{}{
			"enabled": false,
			"status":  "coming_soon",
			"banks": []map[string]string{
				{
					"name":           "Equity Bank Rwanda",
					"account_number": "configured-via-env",
					"swift":          "configured-via-env",
				},
			},
			"currency":    []string{"EUR", "USD"},
			"description": "Deferred for future implementation",
		},
	}

	utils.SuccessResponse(c, http.StatusOK, "Available payment methods", methods)
}
