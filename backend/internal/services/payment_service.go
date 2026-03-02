package services

import (
	"context"
	"errors"
	"strconv"

	"backend/internal/models"
	"backend/internal/repository"

	"github.com/jmoiron/sqlx"
)

type PaymentService struct {
	txnRepo *repository.TransactionRepository
	db      *sqlx.DB
}

// ProcessCardPayment processes credit/debit card payment
func (s *PaymentService) ProcessCardPayment(ctx context.Context, userID string, amount float64, cardToken, description, txnType string) (*models.Transaction, error) {
	transaction := &models.Transaction{
		UserID:          parseUint(userID),
		Amount:          amount,
		PaymentMethod:   "card",
		Status:          "processing",
		Description:     description,
		TransactionType: txnType,
	}

	result, err := s.txnRepo.Create(ctx, transaction)
	if err != nil {
		return nil, err
	}

	// TODO: Call Stripe API to process payment
	_ = cardToken

	// Update status based on Stripe response
	// s.txnRepo.UpdateStatus(ctx, fmt.Sprintf("%d", result.ID), "completed")

	return result, nil
}

// ProcessMobileMoneyPayment processes mobile money payment
func (s *PaymentService) ProcessMobileMoneyPayment(ctx context.Context, userID string, amount float64, phoneNumber, provider, description, txnType string) (*models.Transaction, error) {
	transaction := &models.Transaction{
		UserID:          parseUint(userID),
		Amount:          amount,
		PaymentMethod:   "mobile_money",
		PaymentProvider: provider,
		Status:          "pending",
		Description:     description,
		TransactionType: txnType,
	}

	result, err := s.txnRepo.Create(ctx, transaction)
	if err != nil {
		return nil, err
	}

	// TODO: Call mobile money API
	_ = phoneNumber

	return result, nil
}

func NewPaymentService(db *sqlx.DB) *PaymentService {
	return &PaymentService{
		txnRepo: repository.NewTransactionRepository(db),
		db:      db,
	}
}

// ProcessBankTransfer processes bank transfer
func (s *PaymentService) ProcessBankTransfer(ctx context.Context, userID string, amount float64, bankName, accountNumber, description, txnType string) (*models.Transaction, error) {
	transaction := &models.Transaction{
		UserID:          parseUint(userID),
		Amount:          amount,
		PaymentMethod:   "bank_transfer",
		Status:          "pending",
		Description:     description,
		TransactionType: txnType,
	}

	result, err := s.txnRepo.Create(ctx, transaction)
	if err != nil {
		return nil, err
	}

	// TODO: Generate bank transfer instructions
	_ = bankName
	_ = accountNumber

	return result, nil
}

// GetPaymentMethods retrieves user payment methods
func (s *PaymentService) GetPaymentMethods(ctx context.Context, userID string) ([]map[string]interface{}, error) {
	// TODO: Query payment_methods table
	return []map[string]interface{}{}, nil
}

// AddPaymentMethod adds a payment method
func (s *PaymentService) AddPaymentMethod(ctx context.Context, userID, methodType string, details map[string]string, isDefault bool) (map[string]interface{}, error) {
	// TODO: Tokenize and store payment method securely
	_ = details
	_ = isDefault

	return map[string]interface{}{
		"id":      "method_xxx",
		"type":    methodType,
		"default": isDefault,
	}, nil
}

// DeletePaymentMethod deletes a payment method
func (s *PaymentService) DeletePaymentMethod(ctx context.Context, userID, methodID string) error {
	// TODO: Delete payment method from database
	return nil
}

// GetTransactionHistory retrieves user transaction history
func (s *PaymentService) GetTransactionHistory(ctx context.Context, userID string, status string) ([]*models.Transaction, error) {
	// TODO: Filter by status if provided
	_ = status

	// Get first 50 transactions
	transactions, _, err := s.txnRepo.GetByUserID(ctx, userID, 0, 50)
	return transactions, err
}

// ProcessWebhook processes payment provider webhooks
func (s *PaymentService) ProcessWebhook(ctx context.Context, provider string, webhook map[string]interface{}) error {
	switch provider {
	case "stripe":
		return s.processStripeWebhook(ctx, webhook)
	case "mtn":
		return s.processMTNWebhook(ctx, webhook)
	case "airtel":
		return s.processAirtelWebhook(ctx, webhook)
	default:
		return errors.New("unknown provider")
	}
}

// RequestRefund requests refund for transaction
func (s *PaymentService) RequestRefund(ctx context.Context, userID, transactionID, reason string, amount float64) (map[string]interface{}, error) {
	transaction, err := s.txnRepo.GetByID(ctx, transactionID)
	if err != nil {
		return nil, err
	}

	if transaction.UserID != parseUint(userID) {
		return nil, errors.New("unauthorized")
	}

	// TODO: Process refund through payment provider
	_ = reason
	_ = amount

	return map[string]interface{}{
		"refund_id": "ref_xxx",
		"status":    "processing",
	}, nil
}

// Helper functions
func (s *PaymentService) processStripeWebhook(ctx context.Context, webhook map[string]interface{}) error {
	// TODO: Implement Stripe webhook handling
	return nil
}

func (s *PaymentService) processMTNWebhook(ctx context.Context, webhook map[string]interface{}) error {
	// TODO: Implement MTN webhook handling
	return nil
}

func (s *PaymentService) processAirtelWebhook(ctx context.Context, webhook map[string]interface{}) error {
	// TODO: Implement Airtel webhook handling
	return nil
}

// parseUint safely converts string to uint
func parseUint(s string) uint {
	v, _ := strconv.ParseUint(s, 10, 64)
	return uint(v)
}
