package handlers

import (
"net/http"
"strconv"

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

// InitiateMobileMoneyPayment initiates mobile money payment
// @Router /payments/mobile-money [post]
func (h *PaymentHandler) InitiateMobileMoneyPayment(c *gin.Context) {
type MobileMoneyRequest struct {
Amount      float64 `json:"amount" binding:"required,gt=0"`
PhoneNumber string  `json:"phone_number" binding:"required"`
Provider    string  `json:"provider" binding:"required,oneof=mtn airtel"`
Description string  `json:"description"`
}

userID := c.MustGet("user_id").(string)

var req MobileMoneyRequest
if err := c.ShouldBindJSON(&req); err != nil {
utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
return
}

userIDUint, err := strconv.ParseUint(userID, 10, 32)
if err != nil {
utils.ErrorResponse(c, http.StatusBadRequest, "Invalid user ID", err.Error())
return
}

paymentReq := &services.PaymentRequest{
UserID:          uint(userIDUint),
Amount:          req.Amount,
Currency:        "RWF",
PhoneNumber:     req.PhoneNumber,
PaymentProvider: req.Provider,
Description:     req.Description,
}

response, err := h.paymentService.InitiatePayment(c.Request.Context(), paymentReq)
if err != nil {
utils.ErrorResponse(c, http.StatusBadRequest, "Mobile money payment failed", err.Error())
return
}

utils.SuccessResponse(c, http.StatusCreated, "Mobile money payment initiated", response)
}

// CheckPaymentStatus checks the status of a payment
// @Router /payments/:transaction_id/status [get]
func (h *PaymentHandler) CheckPaymentStatus(c *gin.Context) {
transactionID := c.Param("transaction_id")
provider := c.Query("provider")

response, err := h.paymentService.CheckPaymentStatus(c.Request.Context(), transactionID, provider)
if err != nil {
utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to check payment status", err.Error())
return
}

utils.SuccessResponse(c, http.StatusOK, "Payment status retrieved", response)
}

// HandlePaymentCallback handles payment provider callbacks
// @Router /payments/callback [post]
func (h *PaymentHandler) HandlePaymentCallback(c *gin.Context) {
var payload map[string]interface{}
if err := c.ShouldBindJSON(&payload); err != nil {
utils.ErrorResponse(c, http.StatusBadRequest, "Invalid callback", err.Error())
return
}

provider := c.Query("provider")

if err := h.paymentService.ProcessCallback(c.Request.Context(), provider, payload); err != nil {
utils.ErrorResponse(c, http.StatusInternalServerError, "Callback processing failed", err.Error())
return
}

utils.SuccessResponse(c, http.StatusOK, "Callback processed successfully", nil)
}
