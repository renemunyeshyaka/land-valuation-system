package handlers

import (
	"backend/internal/services"
	"context"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type InvoiceHandler struct {
	InvoiceService *services.InvoiceService
	UserService    *services.UserService
	TxnService     *services.TransactionService
}

func NewInvoiceHandler(invoiceService *services.InvoiceService, userService *services.UserService, txnService *services.TransactionService) *InvoiceHandler {
	return &InvoiceHandler{
		InvoiceService: invoiceService,
		UserService:    userService,
		TxnService:     txnService,
	}
}

// GET /api/invoice/:txn_id/download
func (h *InvoiceHandler) DownloadInvoice(c *gin.Context) {
	txnIDStr := c.Param("txn_id")
	txnID64, err := strconv.ParseUint(txnIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid transaction ID"})
		return
	}
	txnID := uint(txnID64)

	txn, err := h.TxnService.GetTransactionByID(context.Background(), txnID)
	if err != nil || txn == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}

	user, err := h.UserService.GetUserByID(context.Background(), strconv.FormatUint(uint64(txn.UserID), 10))
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	html, err := h.InvoiceService.GenerateInvoiceHTML(context.Background(), txn, user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate invoice"})
		return
	}

	c.Header("Content-Disposition", "attachment; filename=invoice_"+txnIDStr+".html")
	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(html))
}
