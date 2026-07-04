package handlers

import (
	"net/http"
	"strconv"

	"backend/internal/services"
	"backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// MTNManualPaymentHandler handles manual MTN Mobile Money payments
type MTNManualPaymentHandler struct {
	mtnManualPaymentService *services.MTNManualPaymentService
}

func NewMTNManualPaymentHandler(mtnManualPaymentService *services.MTNManualPaymentService) *MTNManualPaymentHandler {
	return &MTNManualPaymentHandler{
		mtnManualPaymentService: mtnManualPaymentService,
	}
}

// InitiateMTNManualPayment handles POST /api/v1/payments/mtn-manual/initiate
func (h *MTNManualPaymentHandler) InitiateMTNManualPayment(c *gin.Context) {
	userID := c.MustGet("user_id").(string)

	var req services.MTNManualPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	uid, err := strconv.ParseUint(userID, 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid user ID", err.Error())
		return
	}
	req.UserID = uint(uid)

	response, err := h.mtnManualPaymentService.InitiateMTNManualPayment(c.Request.Context(), &req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to initiate MTN payment", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "MTN manual payment initiated", response)
}

// SubmitMTNPaymentProof handles POST /api/v1/payments/mtn-manual/submit-proof
func (h *MTNManualPaymentHandler) SubmitMTNPaymentProof(c *gin.Context) {
	var req services.MTNManualPaymentProofRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	if err := h.mtnManualPaymentService.SubmitMTNPaymentProof(c.Request.Context(), &req); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to submit proof", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Payment proof submitted successfully. Awaiting admin verification.", nil)
}

// GetMTNPaymentStatus handles GET /api/v1/payments/mtn-manual/status/:transaction_id
func (h *MTNManualPaymentHandler) GetMTNPaymentStatus(c *gin.Context) {
	transactionID := c.Param("transaction_id")

	response, err := h.mtnManualPaymentService.GetMTNPaymentStatus(c.Request.Context(), transactionID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Transaction not found", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "MTN payment status retrieved", response)
}

// GetMTNManualPaymentMethods handles GET /api/v1/payments/mtn-manual/methods
func (h *MTNManualPaymentHandler) GetMTNManualPaymentMethods(c *gin.Context) {
	methods := h.mtnManualPaymentService.GetPaymentMethods(c.Request.Context())
	utils.SuccessResponse(c, http.StatusOK, "Manual payment methods", methods)
}

// VerifyMTNPayment handles POST /api/v1/admin/payments/mtn-manual/verify (Admin only)
func (h *MTNManualPaymentHandler) VerifyMTNPayment(c *gin.Context) {
	var req struct {
		TransactionID string `json:"transaction_id" binding:"required"`
		Approved      bool   `json:"approved"`
		AdminNotes    string `json:"admin_notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	if err := h.mtnManualPaymentService.VerifyMTNPayment(c.Request.Context(), req.TransactionID, req.Approved, req.AdminNotes); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to verify payment", err.Error())
		return
	}

	status := "rejected"
	if req.Approved {
		status = "approved"
	}

	utils.SuccessResponse(c, http.StatusOK, "MTN payment "+status+" successfully", nil)
}
