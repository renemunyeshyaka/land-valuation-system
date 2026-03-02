package services

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"time"

	"backend/internal/models"
	"backend/internal/repository"

	"gorm.io/gorm"
)

const unlimited = -1

type SubscriptionService struct {
	subRepo *repository.SubscriptionRepository
	txnRepo *repository.TransactionRepository
	db      *gorm.DB
}

func NewSubscriptionService(db *gorm.DB) *SubscriptionService {
	return &SubscriptionService{
		subRepo: repository.NewSubscriptionRepository(db),
		txnRepo: repository.NewTransactionRepository(db),
		db:      db,
	}
}

// parseUint safely converts string to uint
func parseUint(s string) uint {
	v, _ := strconv.ParseUint(s, 10, 64)
	return uint(v)
}

// GetAllPlans retrieves all subscription plans
func (s *SubscriptionService) GetAllPlans(ctx context.Context) ([]map[string]interface{}, error) {
	plans := []map[string]interface{}{
		{
			"type":       "free",
			"name":       "Free",
			"price":      0,
			"searches":   3,
			"valuations": 5,
			"features":   []string{"basic valuation", "3 searches/month"},
		},
		{
			"type":       "basic",
			"name":       "Basic",
			"price":      9900,
			"searches":   10,
			"valuations": 20,
			"features":   []string{"full valuation", "10 searches/month", "email support"},
		},
		{
			"type":       "professional",
			"name":       "Professional",
			"price":      49900,
			"searches":   100,
			"valuations": unlimited,
			"features":   []string{"all features", "API access", "priority listing"},
		},
		{
			"type":       "ultimate",
			"name":       "Ultimate",
			"price":      99900,
			"searches":   unlimited,
			"valuations": unlimited,
			"features":   []string{"white-label", "dedicated manager"},
		},
	}

	return plans, nil
}

// GetCurrentSubscription retrieves user's current subscription
func (s *SubscriptionService) GetCurrentSubscription(ctx context.Context, userID string) (*models.Subscription, error) {
	return s.subRepo.GetByUserID(ctx, userID)
}

// UpgradeSubscription upgrades user subscription
func (s *SubscriptionService) UpgradeSubscription(ctx context.Context, userID, newPlanType string) (*models.Subscription, error) {
	currentSub, err := s.subRepo.GetByUserID(ctx, userID)
	if err != nil {
		// Create new subscription if doesn't exist
		now := time.Now().Unix()
		nextYear := time.Now().AddDate(1, 0, 0).Unix()
		subscription := &models.Subscription{
			UserID:    parseUint(userID),
			PlanType:  newPlanType,
			Status:    "active",
			StartDate: now,
			EndDate:   nextYear,
			AutoRenew: true,
		}

		return s.subRepo.Create(ctx, subscription)
	}

	// Update existing subscription
	currentSub.PlanType = newPlanType
	currentSub.EndDate = time.Now().AddDate(1, 0, 0).Unix()

	return s.subRepo.Update(ctx, currentSub)
}

// DowngradeSubscription downgrades user subscription
func (s *SubscriptionService) DowngradeSubscription(ctx context.Context, userID, newPlanType string) (*models.Subscription, error) {
	currentSub, err := s.subRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	currentSub.PlanType = newPlanType
	return s.subRepo.Update(ctx, currentSub)
}

// CancelSubscription cancels user subscription
func (s *SubscriptionService) CancelSubscription(ctx context.Context, userID, reason string) (*models.Subscription, error) {
	currentSub, err := s.subRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	err = s.subRepo.Cancel(ctx, fmt.Sprintf("%d", currentSub.ID), reason)
	if err != nil {
		return nil, err
	}

	currentSub.Status = "cancelled"
	return currentSub, nil
}

// GetBillingHistory retrieves user billing history
func (s *SubscriptionService) GetBillingHistory(ctx context.Context, userID string, page, limit int) ([]map[string]interface{}, int, error) {
	offset := (page - 1) * limit
	transactions, total, err := s.txnRepo.GetByUserID(ctx, userID, offset, limit)
	if err != nil {
		return nil, 0, err
	}

	var invoices []map[string]interface{}
	for _, txn := range transactions {
		invoices = append(invoices, map[string]interface{}{
			"id":     txn.ID,
			"amount": txn.Amount,
			"date":   txn.CreatedAt,
			"status": txn.Status,
			"type":   txn.TransactionType,
		})
	}

	return invoices, int(total), nil
}

// UpdateBillingInfo updates user billing information
func (s *SubscriptionService) UpdateBillingInfo(ctx context.Context, userID string, info interface{}) error {
	// TODO: Store billing info securely
	return nil
}

// GetInvoice retrieves specific invoice
func (s *SubscriptionService) GetInvoice(ctx context.Context, invoiceID, userID string) (map[string]interface{}, error) {
	invoiceIDUint, err := strconv.ParseUint(invoiceID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid invoice ID: %w", err)
	}

	transaction, err := s.txnRepo.GetByID(ctx, uint(invoiceIDUint))
	if err != nil {
		return nil, err
	}

	if transaction.BuyerID != parseUint(userID) {
		return nil, errors.New("unauthorized")
	}

	invoice := map[string]interface{}{
		"id":     transaction.ID,
		"amount": transaction.Amount,
		"date":   transaction.CreatedAt,
		"status": transaction.Status,
		"items": []map[string]interface{}{
			{
				"description": transaction.Description,
				"amount":      transaction.Amount,
			},
		},
	}

	return invoice, nil
}
