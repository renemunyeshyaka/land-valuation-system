package handlers

import (
	"net/http"
	"strconv"

	"backend/internal/services"
	"backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type SubscriptionHandler struct {
	subscriptionService *services.SubscriptionService
}

func NewSubscriptionHandler(subscriptionService *services.SubscriptionService) *SubscriptionHandler {
	return &SubscriptionHandler{
		subscriptionService: subscriptionService,
	}
}

// GetPlans retrieves all subscription plans
// @Router /subscriptions/plans [get]
func (h *SubscriptionHandler) GetPlans(c *gin.Context) {
	plans, err := h.subscriptionService.GetAllPlans(c.Request.Context())
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve plans", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Subscription plans retrieved", plans)
}

// GetCurrentSubscription retrieves current user subscription
// @Router /subscriptions/current [get]
func (h *SubscriptionHandler) GetCurrentSubscription(c *gin.Context) {
	userID := c.MustGet("user_id").(string)

	subscription, err := h.subscriptionService.GetCurrentSubscription(c.Request.Context(), userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "No active subscription", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Current subscription retrieved", subscription)
}

// UpgradeSubscription upgrades subscription plan
// @Router /subscriptions/upgrade [post]
func (h *SubscriptionHandler) UpgradeSubscription(c *gin.Context) {
	type UpgradeRequest struct {
		PlanType string `json:"plan_type" binding:"required"`
	}

	userID := c.MustGet("user_id").(string)

	var req UpgradeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	subscription, err := h.subscriptionService.UpgradeSubscription(c.Request.Context(), userID, req.PlanType)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Upgrade failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Subscription upgraded", subscription)
}

// DowngradeSubscription downgrades subscription plan
// @Router /subscriptions/downgrade [post]
func (h *SubscriptionHandler) DowngradeSubscription(c *gin.Context) {
	type DowngradeRequest struct {
		PlanType string `json:"plan_type" binding:"required"`
	}

	userID := c.MustGet("user_id").(string)

	var req DowngradeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	subscription, err := h.subscriptionService.DowngradeSubscription(c.Request.Context(), userID, req.PlanType)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Downgrade failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Subscription downgraded", subscription)
}

// CancelSubscription cancels user subscription
// @Router /subscriptions/cancel [post]
func (h *SubscriptionHandler) CancelSubscription(c *gin.Context) {
	type CancelRequest struct {
		Reason string `json:"reason"`
	}

	userID := c.MustGet("user_id").(string)

	var req CancelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	subscription, err := h.subscriptionService.CancelSubscription(c.Request.Context(), userID, req.Reason)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Cancellation failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Subscription cancelled", subscription)
}

// GetBillingHistory retrieves billing history
// @Router /subscriptions/billing-history [get]
func (h *SubscriptionHandler) GetBillingHistory(c *gin.Context) {
	userID := c.MustGet("user_id").(string)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	invoices, total, err := h.subscriptionService.GetBillingHistory(c.Request.Context(), userID, page, limit)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve billing history", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Billing history retrieved", gin.H{
		"invoices": invoices,
		"total":    total,
		"page":     page,
		"limit":    limit,
	})
}

// UpdateBillingInfo updates billing information
// @Router /subscriptions/billing-info [put]
func (h *SubscriptionHandler) UpdateBillingInfo(c *gin.Context) {
	type BillingInfoRequest struct {
		CardNumber   string `json:"card_number"`
		ExpiryMonth  string `json:"expiry_month"`
		ExpiryYear   string `json:"expiry_year"`
		CVV          string `json:"cvv"`
		BillingEmail string `json:"billing_email"`
		BillingName  string `json:"billing_name"`
		BillingPhone string `json:"billing_phone"`
	}

	userID := c.MustGet("user_id").(string)

	var req BillingInfoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	if err := h.subscriptionService.UpdateBillingInfo(c.Request.Context(), userID, &req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Update failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Billing information updated", nil)
}

// GetInvoice retrieves specific invoice
// @Router /subscriptions/invoices/{id} [get]
func (h *SubscriptionHandler) GetInvoice(c *gin.Context) {
	invoiceID := c.Param("id")
	userID := c.MustGet("user_id").(string)

	invoice, err := h.subscriptionService.GetInvoice(c.Request.Context(), invoiceID, userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Invoice not found", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Invoice retrieved", invoice)
}
