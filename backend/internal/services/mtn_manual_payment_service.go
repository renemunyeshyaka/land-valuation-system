package services

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"backend/internal/models"
	"backend/internal/repository"

	"gorm.io/gorm"
)

// MTNManualPaymentService handles manual MTN Mobile Money payments
// Users send money to the MTN number 0788620201 and submit a proof reference
// for admin verification
type MTNManualPaymentService struct {
	db              *gorm.DB
	transactionRepo *repository.TransactionRepository
	subService      *SubscriptionService

	// MTN merchant phone number where users send payment
	mtnPhoneNumber string
	mtnAccountName string
}

func NewMTNManualPaymentService(db *gorm.DB, subService *SubscriptionService) *MTNManualPaymentService {
	phone := os.Getenv("MTN_MANUAL_PHONE_NUMBER")
	if phone == "" {
		phone = "0788620201"
	}
	name := os.Getenv("MTN_MANUAL_ACCOUNT_NAME")
	if name == "" {
		name = "LandVal Ltd"
	}

	return &MTNManualPaymentService{
		db:              db,
		transactionRepo: repository.NewTransactionRepository(db),
		subService:      subService,
		mtnPhoneNumber:  phone,
		mtnAccountName:  name,
	}
}

// MTNManualPaymentRequest represents a payment initiation request
type MTNManualPaymentRequest struct {
	UserID         uint    `json:"user_id"`
	Amount         float64 `json:"amount" binding:"required,gt=0"`
	Currency       string  `json:"currency" binding:"required"`
	Description    string  `json:"description"`
	PlanType       string  `json:"plan_type" binding:"required"`
	BillingPeriod  string  `json:"billing_period" binding:"required,oneof=monthly yearly"`
}

// MTNManualPaymentInitResponse contains MTN payment instructions
type MTNManualPaymentInitResponse struct {
	TransactionID   string  `json:"transaction_id"`
	Status          string  `json:"status"`
	Message         string  `json:"message"`
	MTNPhoneNumber  string  `json:"mtn_phone_number"`
	MTNAccountName  string  `json:"mtn_account_name"`
	Amount          float64 `json:"amount"`
	Currency        string  `json:"currency"`
	PlanType        string  `json:"plan_type"`
	BillingPeriod   string  `json:"billing_period"`
	ReferenceNumber string  `json:"reference_number"` // User quotes this when sending money
	Instructions    string  `json:"instructions"`
}

// MTNManualPaymentProofRequest represents proof of payment submission
type MTNManualPaymentProofRequest struct {
	TransactionID        string `json:"transaction_id" binding:"required"`
	MTNTransactionRef    string `json:"mtn_transaction_ref" binding:"required"` // MTN MoMo reference/confirmation code
	SenderPhoneNumber    string `json:"sender_phone_number" binding:"required"` // Phone used to send money
	PaymentDate          string `json:"payment_date" binding:"required"`        // Date payment was made
	SenderName           string `json:"sender_name" binding:"required"`
	Notes                string `json:"notes"`
}

// InitiateMTNManualPayment creates a pending manual MTN payment transaction
func (s *MTNManualPaymentService) InitiateMTNManualPayment(ctx context.Context, req *MTNManualPaymentRequest) (*MTNManualPaymentInitResponse, error) {
	// Validate request
	if err := s.validateRequest(req); err != nil {
		return nil, err
	}

	// Generate reference number
	referenceNumber := s.generateReference()

	// Create transaction record with pending status
	transaction := &models.Transaction{
		UserID:          req.UserID,
		AmountRWF:       req.Amount,
		Amount:          req.Amount,
		Currency:        req.Currency,
		PaymentProvider: "mtn_manual",
		PaymentMethod:   "mtn_manual",
		TransactionType: "subscription",
		Status:          "pending",
		PaymentStatus:   "awaiting_proof",
		Description:     fmt.Sprintf("Manual MTN payment for %s plan (%s)", req.PlanType, req.BillingPeriod),
		PaymentReference: referenceNumber,
	}

	// Save to database
	created, err := s.transactionRepo.Create(ctx, transaction)
	if err != nil {
		return nil, fmt.Errorf("failed to create transaction: %w", err)
	}

	// Return MTN payment instructions
	return &MTNManualPaymentInitResponse{
		TransactionID:   fmt.Sprintf("%d", created.ID),
		Status:          "pending",
		Message:         "Please send payment via MTN Mobile Money and submit the transaction reference",
		MTNPhoneNumber:  s.mtnPhoneNumber,
		MTNAccountName:  s.mtnAccountName,
		Amount:          req.Amount,
		Currency:        req.Currency,
		PlanType:        req.PlanType,
		BillingPeriod:   req.BillingPeriod,
		ReferenceNumber: referenceNumber,
		Instructions: fmt.Sprintf(`Send the exact amount of %s %.2f to MTN number %s (%s).

Use "%s" as your payment reference when sending.

After sending, come back and submit your MTN transaction confirmation code.`,
			req.Currency, req.Amount, s.mtnPhoneNumber, s.mtnAccountName, referenceNumber),
	}, nil
}

// SubmitMTNPaymentProof allows user to submit proof of MTN payment
func (s *MTNManualPaymentService) SubmitMTNPaymentProof(ctx context.Context, req *MTNManualPaymentProofRequest) error {
	// Parse transaction ID
	var txnID uint
	if _, err := fmt.Sscanf(req.TransactionID, "%d", &txnID); err != nil {
		return errors.New("invalid transaction ID")
	}

	// Get transaction
	transaction, err := s.transactionRepo.GetByID(ctx, txnID)
	if err != nil {
		return fmt.Errorf("transaction not found: %w", err)
	}

	// Verify transaction is in correct status
	if transaction.PaymentStatus != "awaiting_proof" {
		return errors.New("transaction is not awaiting proof submission")
	}

	// Parse payment date
	paymentDate, err := time.Parse("2006-01-02", req.PaymentDate)
	if err != nil {
		// Try other common formats
		paymentDate, err = time.Parse("02/01/2006", req.PaymentDate)
		if err != nil {
			paymentDate = time.Now()
		}
	}

	// Update transaction with proof details
	transaction.ProviderTransactionID = req.MTNTransactionRef
	transaction.PaymentStatus = "proof_submitted"
	transaction.Status = "pending_admin_verification"

	// Store proof details in Documents field (JSONB)
	proofData := map[string]interface{}{
		"sender_phone":    req.SenderPhoneNumber,
		"sender_name":     req.SenderName,
		"payment_date":    paymentDate,
		"submitted_at":    time.Now(),
		"notes":           req.Notes,
	}
	transaction.Documents = models.JSON(proofData)

	// Update transaction
	if err := s.transactionRepo.Update(ctx, transaction); err != nil {
		return fmt.Errorf("failed to update transaction: %w", err)
	}

	return nil
}

// VerifyMTNPayment - Admin function to verify manual MTN payment
func (s *MTNManualPaymentService) VerifyMTNPayment(ctx context.Context, transactionID string, approved bool, adminNotes string) error {
	var txnID uint
	if _, err := fmt.Sscanf(transactionID, "%d", &txnID); err != nil {
		return errors.New("invalid transaction ID")
	}

	// Get transaction
	transaction, err := s.transactionRepo.GetByID(ctx, txnID)
	if err != nil {
		return fmt.Errorf("transaction not found: %w", err)
	}

	if transaction.Status != "pending_admin_verification" {
		return errors.New("transaction is not awaiting admin verification")
	}

	if approved {
		// Payment verified - mark as completed
		transaction.Status = "completed"
		transaction.PaymentStatus = "verified"
		now := time.Now()
		transaction.CompletionDate = &now
		transaction.AcceptanceDate = &now

		// Update the user's subscription
		// Extract plan type and billing info from the transaction description or metadata
		userID := fmt.Sprintf("%d", transaction.UserID)
		planType := s.extractPlanType(transaction.Description)
		if err := s.subService.UpdateSubscriptionAfterPayment(ctx, userID, planType, transaction); err != nil {
			return fmt.Errorf("subscription update failed: %w", err)
		}
	} else {
		// Payment rejected
		transaction.Status = "rejected"
		transaction.PaymentStatus = "rejected"
	}

	// Add admin notes
	docs := transaction.Documents
	if docs == nil {
		docs = models.JSON{}
	}
	docs["admin_notes"] = adminNotes
	docs["verified_at"] = time.Now()
	docs["verification_status"] = approved
	transaction.Documents = docs

	// Update transaction
	if err := s.transactionRepo.Update(ctx, transaction); err != nil {
		return fmt.Errorf("failed to update transaction: %w", err)
	}

	return nil
}

// GetMTNPaymentStatus returns the current status of an MTN manual payment
func (s *MTNManualPaymentService) GetMTNPaymentStatus(ctx context.Context, transactionID string) (*MTNManualPaymentInitResponse, error) {
	var txnID uint
	if _, err := fmt.Sscanf(transactionID, "%d", &txnID); err != nil {
		return nil, errors.New("invalid transaction ID")
	}

	transaction, err := s.transactionRepo.GetByID(ctx, txnID)
	if err != nil {
		return nil, fmt.Errorf("transaction not found: %w", err)
	}

	return &MTNManualPaymentInitResponse{
		TransactionID:   transactionID,
		Status:          transaction.Status,
		Message:         s.getStatusMessage(transaction.Status),
		Amount:          transaction.AmountRWF,
		Currency:        transaction.Currency,
		ReferenceNumber: transaction.PaymentReference,
	}, nil
}

// GetPaymentMethods returns available manual payment methods
func (s *MTNManualPaymentService) GetPaymentMethods(ctx context.Context) map[string]interface{} {
	return map[string]interface{}{
		"mtn_manual": map[string]interface{}{
			"enabled":          true,
			"name":             "MTN Mobile Money (Manual)",
			"description":      "Pay via MTN MoMo to our number and submit your transaction reference. Admin will verify within 24 hours.",
			"phone_number":     s.mtnPhoneNumber,
			"account_name":     s.mtnAccountName,
			"currency":         "RWF",
			"instructions":     fmt.Sprintf("Send payment to MTN number %s (%s), then submit your MTN transaction reference code for verification.", s.mtnPhoneNumber, s.mtnAccountName),
			"verification_note": "Payment is verified manually by our team. Please allow up to 24 hours for verification.",
		},
	}
}

// Helper functions

func (s *MTNManualPaymentService) validateRequest(req *MTNManualPaymentRequest) error {
	if req.UserID == 0 {
		return errors.New("user_id is required")
	}
	if req.Amount <= 0 {
		return errors.New("amount must be greater than 0")
	}
	if req.PlanType == "" {
		return errors.New("plan_type is required")
	}
	if req.Currency != "RWF" && req.Currency != "EUR" && req.Currency != "USD" {
		return errors.New("currency must be RWF, EUR, or USD")
	}
	return nil
}

func (s *MTNManualPaymentService) generateReference() string {
	return fmt.Sprintf("MTN-%s-%d", time.Now().Format("20060102-150405"), time.Now().UnixNano()%100000)
}

func (s *MTNManualPaymentService) getStatusMessage(status string) string {
	messages := map[string]string{
		"pending":                    "Awaiting proof of payment submission",
		"pending_admin_verification": "Payment proof submitted, under admin review",
		"completed":                  "Payment verified and subscription activated",
		"rejected":                   "Payment rejected by admin",
		"cancelled":                  "Payment cancelled",
	}
	if msg, ok := messages[status]; ok {
		return msg
	}
	return "Unknown status"
}

// extractPlanType extracts plan type from transaction description
// Expected format: "Manual MTN payment for basic plan (monthly)"
func (s *MTNManualPaymentService) extractPlanType(description string) string {
	validPlans := []string{"free", "basic", "professional", "ultimate"}
	for _, plan := range validPlans {
		if strings.Contains(description, plan) {
			return plan
		}
	}
	return "basic" // Default fallback
}
