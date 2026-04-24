package handlers

import (
	"net/http"
	"strconv"

	"backend/internal/repository"
	"backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type PaymentHistorySummaryHandler struct {
	transactionRepo *repository.TransactionRepository
}

func NewPaymentHistorySummaryHandler(transactionRepo *repository.TransactionRepository) *PaymentHistorySummaryHandler {
	return &PaymentHistorySummaryHandler{transactionRepo: transactionRepo}
}

// GetPaymentHistory returns paginated payment history for the authenticated user
func (h *PaymentHistorySummaryHandler) GetPaymentHistory(c *gin.Context) {
	userID := c.MustGet("user_id").(string)
	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "20")
	page, _ := strconv.Atoi(pageStr)
	limit, _ := strconv.Atoi(limitStr)

	userIDUint, _ := strconv.ParseUint(userID, 10, 32)
	transactions, total, err := h.transactionRepo.ListByUser(c.Request.Context(), uint(userIDUint), page, limit)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch payment history", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Payment history retrieved", gin.H{
		"transactions": transactions,
		"total":        total,
		"page":         page,
		"limit":        limit,
	})
}

// GetPaymentSummary returns a summary of payments for the authenticated user
func (h *PaymentHistorySummaryHandler) GetPaymentSummary(c *gin.Context) {
	userID := c.MustGet("user_id").(string)
	// For now, just return total count and total amount
	userIDUint, _ := strconv.ParseUint(userID, 10, 32)
	transactions, _, err := h.transactionRepo.ListByUser(c.Request.Context(), uint(userIDUint), 1, 1000)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch payment summary", err.Error())
		return
	}
	totalAmount := 0.0
	for _, txn := range transactions {
		totalAmount += txn.Amount
	}
	utils.SuccessResponse(c, http.StatusOK, "Payment summary retrieved", gin.H{
		"total_transactions": len(transactions),
		"total_amount":       totalAmount,
	})
}
