package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

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
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	var fromTime *time.Time
	if fromStr := strings.TrimSpace(c.Query("from")); fromStr != "" {
		if parsed, err := time.Parse("2006-01-02", fromStr); err == nil {
			fromTime = &parsed
		}
	}
	var toTime *time.Time
	if toStr := strings.TrimSpace(c.Query("to")); toStr != "" {
		if parsed, err := time.Parse("2006-01-02", toStr); err == nil {
			parsed = parsed.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
			toTime = &parsed
		}
	}

	filters := repository.TransactionListFilters{
		Status: c.Query("status"),
		Method: c.Query("method"),
		Search: c.Query("search"),
		From:   fromTime,
		To:     toTime,
	}

	transactions, total, err := h.transactionRepo.GetByUserIDFiltered(c.Request.Context(), userID, (page-1)*limit, limit, filters)
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

// GetPaymentHistoryItem returns a single payment transaction for the authenticated user
func (h *PaymentHistorySummaryHandler) GetPaymentHistoryItem(c *gin.Context) {
	transactionID := strings.TrimSpace(c.Param("id"))
	if transactionID == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Transaction ID is required", "")
		return
	}

	txnIDUint, err := strconv.ParseUint(transactionID, 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid transaction ID", err.Error())
		return
	}

	transaction, err := h.transactionRepo.GetByID(c.Request.Context(), uint(txnIDUint))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Transaction not found", err.Error())
		return
	}

	userID := c.MustGet("user_id").(string)
	userType, _ := c.Get("user_type")
	isAdmin := false
	if userTypeStr, ok := userType.(string); ok && userTypeStr == "admin" {
		isAdmin = true
	}

	userIDUint, _ := strconv.ParseUint(userID, 10, 32)
	canAccess := isAdmin || transaction.UserID == uint(userIDUint) || transaction.BuyerID == uint(userIDUint) || transaction.CreatedBy == uint(userIDUint)
	if !canAccess {
		utils.ErrorResponse(c, http.StatusForbidden, "Access denied", "You are not allowed to view this transaction")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Transaction retrieved", gin.H{
		"transaction":          transaction,
		"can_download_receipt": true,
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
