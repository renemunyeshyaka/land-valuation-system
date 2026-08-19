package workers

import (
	"context"
	"fmt"
	"log"
	"time"

	"backend/internal/models"
	"backend/internal/services"
	"backend/pkg/alert"

	"gorm.io/gorm"
)

// SubscriptionBillingWorker periodically checks and processes subscription renewals.
type SubscriptionBillingWorker struct {
	DB             *gorm.DB
	PaymentService *services.PaymentService
}

func NewSubscriptionBillingWorker(db *gorm.DB, paymentService *services.PaymentService) *SubscriptionBillingWorker {
	return &SubscriptionBillingWorker{DB: db, PaymentService: paymentService}
}

func (w *SubscriptionBillingWorker) Start(ctx context.Context, interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				w.processRenewals(ctx)
			}
		}
	}()
}

func (w *SubscriptionBillingWorker) processRenewals(ctx context.Context) {
	var users []models.User
	// Includes early adopters who upgraded to a paid tier so their paid renewals are
	// processed; free-tier early adopters have no next_renewal and are skipped below.
	err := w.DB.Where("subscription_status = ? AND subscription_next_renewal <= ?", "active", time.Now()).Find(&users).Error
	if err != nil {
		log.Printf("[SubscriptionBillingWorker] DB error: %v", err)
		return
	}
	for _, user := range users {
		w.processUserRenewal(ctx, &user)
	}
}

func (w *SubscriptionBillingWorker) processUserRenewal(ctx context.Context, user *models.User) {
	log.Printf("[SubscriptionBillingWorker] Processing renewal for user %d (%s)", user.ID, user.Email)

	// Determine plan and amount
	planType := user.SubscriptionTier
	var amount float64
	switch planType {
	case "basic":
		amount = 29
	case "professional":
		amount = 79
	case "ultimate":
		amount = 199
	default:
		log.Printf("[SubscriptionBillingWorker] Unknown or free plan for user %d, skipping charge", user.ID)
		return
	}

	// Use user's phone and preferred provider (default to mtn)
	phone := user.Phone
	provider := user.SubscriptionPaymentMethod
	if provider == "" {
		provider = "mtn_momo"
	}

	paymentReq := &services.PaymentRequest{
		UserID:          user.ID,
		Amount:          amount,
		Currency:        "EUR",
		PhoneNumber:     phone,
		PaymentProvider: provider,
		Description:     planType + " plan subscription renewal",
	}

	resp, err := w.PaymentService.InitiatePayment(ctx, paymentReq)
	if err == nil && resp != nil && (resp.Status == "pending" || resp.Status == "success") {
		now := time.Now()
		next := now.AddDate(0, 1, 0) // Add 1 month
		user.SubscriptionLastPayment = &now
		user.SubscriptionExpiry = &next
		user.SubscriptionNextRenewal = &next
		user.SubscriptionStatus = "active"
		if err := w.DB.Save(user).Error; err != nil {
			log.Printf("[SubscriptionBillingWorker] Failed to update user %d: %v", user.ID, err)
		}
		log.Printf("[SubscriptionBillingWorker] Renewal payment initiated for user %d", user.ID)

		// Send success email
		subject := fmt.Sprintf("Subscription Renewal Successful for %s Plan", planType)
		body := fmt.Sprintf("Dear %s,\n\nYour subscription for the %s plan has been successfully renewed.\nAmount: %.0f EUR\n\nThank you for staying with us!\n\nLand Valuation System Team", user.FirstName, planType, amount)
		_ = alert.SendEmail(subject, body)
	} else {
		// Early-adopter accounts keep a lifetime-free baseline: a failed paid renewal
		// reverts them to the free tier instead of leaving them past-due/deactivated.
		if user.IsEarlyAdopter && services.EarlyAdopterUpgradePolicy() == "baseline_free" {
			log.Printf("[SubscriptionBillingWorker] Early-adopter user %d (%s) renewal failed — reverting to lifetime free baseline", user.ID, planType)
			w.revertEarlyAdopterToFree(ctx, user, planType)
			return
		}

		user.SubscriptionStatus = "past_due"
		if err := w.DB.Save(user).Error; err != nil {
			log.Printf("[SubscriptionBillingWorker] Failed to update user %d: %v", user.ID, err)
		}
		log.Printf("[SubscriptionBillingWorker] Renewal payment failed for user %d: %v", user.ID, err)

		// Send failure email
		subject := fmt.Sprintf("Subscription Renewal Failed for %s Plan", planType)
		body := fmt.Sprintf("Dear %s,\n\nWe were unable to renew your subscription for the %s plan. Please check your payment method and try again.\nIf you need assistance, contact support.\n\nLand Valuation System Team", user.FirstName, planType)
		_ = alert.SendEmail(subject, body)
	}
}

// revertEarlyAdopterToFree returns an early adopter to the lifetime-free baseline
// (never deactivated, no expiry) after their paid upgrade cannot be renewed.
func (w *SubscriptionBillingWorker) revertEarlyAdopterToFree(ctx context.Context, user *models.User, planType string) {
	user.SubscriptionTier = "free"
	user.SubscriptionStatus = "active"
	user.SubscriptionExpiry = nil
	user.SubscriptionNextRenewal = nil
	user.SubscriptionCancelReason = "early_adopter_upgrade_renewal_failed:" + planType
	if err := w.DB.Save(user).Error; err != nil {
		log.Printf("[SubscriptionBillingWorker] Failed to revert early-adopter user %d to free: %v", user.ID, err)
		return
	}
	log.Printf("[SubscriptionBillingWorker] Early-adopter user %d reverted to lifetime free baseline", user.ID)

	subject := "LandVal: back on your Lifetime Free plan"
	body := fmt.Sprintf("Dear %s,\n\nYour %s plan could not be renewed, so your account has returned to your Lifetime Free plan. Your account stays active — no expiry, no card needed.\n\nLand Valuation System Team", user.FirstName, planType)
	_ = alert.SendEmail(subject, body)
}
