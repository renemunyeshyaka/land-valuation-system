package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"backend/internal/models"
	"backend/internal/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type RefundHandler struct {
	db *gorm.DB
}

func NewRefundHandler(db *gorm.DB) *RefundHandler {
	return &RefundHandler{db: db}
}

type createRefundRequestInput struct {
	TransactionID   uint    `json:"transaction_id" binding:"required"`
	RequestedAmount float64 `json:"requested_amount" binding:"required"`
	Reason          string  `json:"reason" binding:"required"`
}

type updateRefundStatusInput struct {
	Status    string `json:"status" binding:"required"`
	AdminNote string `json:"admin_note"`
}

func parsePaginationQuery(c *gin.Context) (int, int) {
	page := 1
	limit := 10

	if raw := strings.TrimSpace(c.Query("page")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
			page = parsed
		}
	}

	if raw := strings.TrimSpace(c.Query("limit")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	if limit > 100 {
		limit = 100
	}

	return page, limit
}

func parseDateFilter(raw string, endOfDay bool) (time.Time, bool) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return time.Time{}, false
	}

	if t, err := time.Parse("2006-01-02", trimmed); err == nil {
		if endOfDay {
			return t.Add(24*time.Hour - time.Nanosecond).UTC(), true
		}
		return t.UTC(), true
	}

	if t, err := time.Parse(time.RFC3339, trimmed); err == nil {
		if endOfDay {
			return t.UTC().Add(24*time.Hour - time.Nanosecond), true
		}
		return t.UTC(), true
	}

	return time.Time{}, false
}

func isSuccessfulPayment(txn *models.Transaction) bool {
	status := strings.ToLower(strings.TrimSpace(txn.Status))
	paymentStatus := strings.ToLower(strings.TrimSpace(txn.PaymentStatus))
	return status == "success" || status == "completed" || paymentStatus == "success" || paymentStatus == "completed"
}

// CreateRefundRequest allows authenticated users to submit a refund request for a successful payment.
func (h *RefundHandler) CreateRefundRequest(c *gin.Context) {
	userIDStr := c.MustGet("user_id").(string)
	userID64, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid user ID", err.Error())
		return
	}
	userID := uint(userID64)

	var input createRefundRequestInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request payload", err.Error())
		return
	}

	reason := strings.TrimSpace(input.Reason)
	if len(reason) < 8 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Refund reason is too short", "reason must be at least 8 characters")
		return
	}
	if input.RequestedAmount <= 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid refund amount", "requested_amount must be greater than zero")
		return
	}

	var txn models.Transaction
	if err := h.db.Where("id = ? AND (user_id = ? OR buyer_id = ?)", input.TransactionID, userID, userID).First(&txn).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.ErrorResponse(c, http.StatusNotFound, "Payment transaction not found", "transaction is not owned by user or does not exist")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to load transaction", err.Error())
		return
	}

	if !isSuccessfulPayment(&txn) {
		utils.ErrorResponse(c, http.StatusBadRequest, "Transaction is not eligible", "only successful/completed payments can be refunded")
		return
	}

	maxAmount := txn.Amount
	if maxAmount <= 0 {
		maxAmount = txn.AmountRWF
	}
	if maxAmount <= 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Transaction has invalid amount", "unable to determine paid amount")
		return
	}
	if input.RequestedAmount > maxAmount {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid refund amount", "requested_amount cannot exceed paid amount")
		return
	}

	var existingPending int64
	if err := h.db.Model(&models.RefundRequest{}).
		Where("user_id = ? AND transaction_id = ? AND status = ?", userID, input.TransactionID, "pending").
		Count(&existingPending).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to validate existing refunds", err.Error())
		return
	}
	if existingPending > 0 {
		utils.ErrorResponse(c, http.StatusConflict, "Pending refund already exists", "a pending request already exists for this payment")
		return
	}

	request := &models.RefundRequest{
		UserID:          userID,
		TransactionID:   input.TransactionID,
		RequestedAmount: input.RequestedAmount,
		Reason:          reason,
		Status:          "pending",
	}

	if err := h.db.Create(request).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to create refund request", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Refund request submitted", request)
}

// GetUserRefundRequests returns refund requests for the authenticated user.
func (h *RefundHandler) GetUserRefundRequests(c *gin.Context) {
	userIDStr := c.MustGet("user_id").(string)
	userID64, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid user ID", err.Error())
		return
	}

	statusFilter := strings.TrimSpace(strings.ToLower(c.Query("status")))
	if statusFilter != "" && statusFilter != "pending" && statusFilter != "approved" && statusFilter != "rejected" && statusFilter != "escalated" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid status filter", "status must be pending, approved, rejected, or escalated")
		return
	}

	fromDate, hasFrom := parseDateFilter(c.Query("from"), false)
	toDate, hasTo := parseDateFilter(c.Query("to"), true)
	if c.Query("from") != "" && !hasFrom {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid from date", "use YYYY-MM-DD or RFC3339 format")
		return
	}
	if c.Query("to") != "" && !hasTo {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid to date", "use YYYY-MM-DD or RFC3339 format")
		return
	}
	if hasFrom && hasTo && fromDate.After(toDate) {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid date range", "from date cannot be after to date")
		return
	}

	page, limit := parsePaginationQuery(c)
	offset := (page - 1) * limit

	query := h.db.Model(&models.RefundRequest{}).Where("user_id = ?", uint(userID64))
	if statusFilter != "" {
		query = query.Where("LOWER(status) = ?", statusFilter)
	}
	if hasFrom {
		query = query.Where("created_at >= ?", fromDate)
	}
	if hasTo {
		query = query.Where("created_at <= ?", toDate)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to count refund requests", err.Error())
		return
	}

	var requests []models.RefundRequest
	if err := query.
		Preload("Transaction").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&requests).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch refund requests", err.Error())
		return
	}

	utils.SuccessPaginatedResponse(c, http.StatusOK, "Refund requests retrieved", requests, int(total), page, limit)
}

// GetAllRefundRequests returns refund requests for admins.
func (h *RefundHandler) GetAllRefundRequests(c *gin.Context) {
	statusFilter := strings.TrimSpace(strings.ToLower(c.Query("status")))
	if statusFilter != "" && statusFilter != "pending" && statusFilter != "approved" && statusFilter != "rejected" && statusFilter != "escalated" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid status filter", "status must be pending, approved, rejected, or escalated")
		return
	}

	fromDate, hasFrom := parseDateFilter(c.Query("from"), false)
	toDate, hasTo := parseDateFilter(c.Query("to"), true)
	if c.Query("from") != "" && !hasFrom {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid from date", "use YYYY-MM-DD or RFC3339 format")
		return
	}
	if c.Query("to") != "" && !hasTo {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid to date", "use YYYY-MM-DD or RFC3339 format")
		return
	}
	if hasFrom && hasTo && fromDate.After(toDate) {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid date range", "from date cannot be after to date")
		return
	}

	page, limit := parsePaginationQuery(c)
	offset := (page - 1) * limit

	query := h.db.Preload("User").Preload("Transaction").Model(&models.RefundRequest{})
	if statusFilter != "" {
		query = query.Where("LOWER(status) = ?", statusFilter)
	}
	if hasFrom {
		query = query.Where("created_at >= ?", fromDate)
	}
	if hasTo {
		query = query.Where("created_at <= ?", toDate)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to count refund requests", err.Error())
		return
	}

	var requests []models.RefundRequest
	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&requests).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch refund requests", err.Error())
		return
	}

	utils.SuccessPaginatedResponse(c, http.StatusOK, "Refund requests retrieved", requests, int(total), page, limit)
}

// UpdateRefundStatus allows admins to approve/reject/escalate refund requests.
func (h *RefundHandler) UpdateRefundStatus(c *gin.Context) {
	refundID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid refund ID", err.Error())
		return
	}

	adminIDStr := c.MustGet("user_id").(string)
	adminID64, err := strconv.ParseUint(adminIDStr, 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid admin user ID", err.Error())
		return
	}

	var input updateRefundStatusInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request payload", err.Error())
		return
	}

	status := strings.ToLower(strings.TrimSpace(input.Status))
	if status != "approved" && status != "rejected" && status != "escalated" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid status", "status must be approved, rejected, or escalated")
		return
	}

	var request models.RefundRequest
	if err := h.db.First(&request, uint(refundID)).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.ErrorResponse(c, http.StatusNotFound, "Refund request not found", "no refund request with provided ID")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to load refund request", err.Error())
		return
	}

	now := time.Now().UTC()
	request.Status = status
	request.AdminNote = strings.TrimSpace(input.AdminNote)
	request.ReviewedBy = func(v uint) *uint { return &v }(uint(adminID64))
	request.ReviewedAt = &now

	if err := h.db.Save(&request).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to update refund request", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Refund status updated", request)
}
