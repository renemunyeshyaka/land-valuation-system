package services

import (
	"context"
	"errors"
	"fmt"
	"os"
	"time"

	"backend/internal/models"
	"backend/internal/repository"

	"gorm.io/gorm"
)

// BankPaymentService handles traditional bank transfer payments
type BankPaymentService struct {
	db              *gorm.DB
	transactionRepo *repository.TransactionRepository
	// Bank details from environment
	bankName      string
	accountNumber string
	accountName   string
	swiftCode     string
	branchCode    string
}

func NewBankPaymentService(db *gorm.DB) *BankPaymentService {
	return &BankPaymentService{
		db:              db,
		transactionRepo: repository.NewTransactionRepository(db),
		bankName:        "Equity Bank Rwanda",
		accountNumber:   os.Getenv("EQUITY_BANK_ACCOUNT"),
		accountName:     os.Getenv("EQUITY_BANK_NAME"),
		swiftCode:       os.Getenv("EQUITY_BANK_SWIFT"),
		branchCode:      os.Getenv("EQUITY_BANK_BRANCH"),
	}
}

// BankPaymentRequest represents a bank payment initiation
type BankPaymentRequest struct {
	UserID         uint    `json:"user_id" binding:"required"`
	Amount         float64 `json:"amount" binding:"required,gt=0"`
	Currency       string  `json:"currency" binding:"required"`
	Description    string  `json:"description"`
	SubscriptionID *uint   `json:"subscription_id,omitempty"`
	PropertyID     *uint   `json:"property_id,omitempty"`
}

// BankPaymentProofRequest represents proof of payment submission
type BankPaymentProofRequest struct {
	TransactionID       string    `json:"transaction_id" binding:"required"`
	BankReferenceID     string    `json:"bank_reference_id" binding:"required"`
	PaymentDate         time.Time `json:"payment_date" binding:"required"`
	ProofImageURL       string    `json:"proof_image_url" binding:"required"` // URL to uploaded receipt
	SenderAccountName   string    `json:"sender_account_name" binding:"required"`
	SenderAccountNumber string    `json:"sender_account_number"`
	Notes               string    `json:"notes"`
}

// BankPaymentResponse contains bank details and transaction ID
type BankPaymentResponse struct {
	TransactionID   string  `json:"transaction_id"`
	Status          string  `json:"status"`
	Message         string  `json:"message"`
	BankName        string  `json:"bank_name"`
	AccountNumber   string  `json:"account_number"`
	AccountName     string  `json:"account_name"`
	SwiftCode       string  `json:"swift_code"`
	BranchCode      string  `json:"branch_code"`
	Amount          float64 `json:"amount"`
	Currency        string  `json:"currency"`
	ReferenceNumber string  `json:"reference_number"` // Transaction ID to use as reference
}

// InitiateBankPayment creates a pending bank transfer transaction
func (s *BankPaymentService) InitiateBankPayment(ctx context.Context, req *BankPaymentRequest) (*BankPaymentResponse, error) {
	// Validate request
	if err := s.validateBankPaymentRequest(req); err != nil {
		return nil, err
	}

	// Generate reference number
	referenceNumber := s.generateBankReference()

	// Create transaction record with pending status
	transaction := &models.Transaction{
		UserID:           req.UserID,
		AmountRWF:        req.Amount,
		Currency:         req.Currency,
		PaymentProvider:  "equity_bank",
		PaymentMethod:    "bank_transfer",
		Status:           "pending_verification", // Changed from "pending"
		PaymentStatus:    "awaiting_proof",
		Description:      req.Description,
		PaymentReference: referenceNumber,
		OfferDate:        &time.Time{},
	}

	// Link to subscription or property if provided
	if req.SubscriptionID != nil {
		transaction.SubscriptionID = *req.SubscriptionID
	}
	if req.PropertyID != nil {
		transaction.PropertyID = *req.PropertyID
	}

	// Save to database
	if _, err := s.transactionRepo.Create(ctx, transaction); err != nil {
		return nil, fmt.Errorf("failed to create transaction: %w", err)
	}

	// Return bank details for user to make payment
	return &BankPaymentResponse{
		TransactionID:   fmt.Sprintf("%d", transaction.ID),
		Status:          "pending_verification",
		Message:         "Please transfer funds to the bank account below and submit proof of payment",
		BankName:        s.bankName,
		AccountNumber:   s.accountNumber,
		AccountName:     s.accountName,
		SwiftCode:       s.swiftCode,
		BranchCode:      s.branchCode,
		Amount:          req.Amount,
		Currency:        req.Currency,
		ReferenceNumber: referenceNumber,
	}, nil
}

// SubmitPaymentProof allows user to upload proof of bank transfer
func (s *BankPaymentService) SubmitPaymentProof(ctx context.Context, req *BankPaymentProofRequest) error {
	// Get transaction
	transaction, err := s.transactionRepo.GetByID(ctx, 0) // TODO: Parse transaction ID
	if err != nil {
		return fmt.Errorf("transaction not found: %w", err)
	}

	// Verify transaction is in correct status
	if transaction.Status != "pending_verification" {
		return errors.New("transaction is not awaiting proof submission")
	}

	// Update transaction with proof details
	transaction.ProviderTransactionID = req.BankReferenceID
	transaction.PaymentStatus = "proof_submitted"
	transaction.Status = "pending_admin_verification"

	// Store proof details in Documents field (JSONB)
	proofData := map[string]interface{}{
		"bank_reference_id":     req.BankReferenceID,
		"payment_date":          req.PaymentDate,
		"proof_image_url":       req.ProofImageURL,
		"sender_account_name":   req.SenderAccountName,
		"sender_account_number": req.SenderAccountNumber,
		"notes":                 req.Notes,
		"submitted_at":          time.Now(),
	}
	transaction.Documents = models.JSON(proofData)

	// Update transaction
	if err := s.transactionRepo.Update(ctx, transaction); err != nil {
		return fmt.Errorf("failed to update transaction: %w", err)
	}

	// TODO: Trigger notification to admin for verification
	// s.notificationService.NotifyAdminPaymentProofSubmitted(transaction)

	return nil
}

// VerifyBankPayment - Admin function to verify bank payment
func (s *BankPaymentService) VerifyBankPayment(ctx context.Context, transactionID string, approved bool, adminNotes string) error {
	// Get transaction
	transaction, err := s.transactionRepo.GetByID(ctx, 0) // TODO: Parse transaction ID
	if err != nil {
		return fmt.Errorf("transaction not found: %w", err)
	}

	// Verify transaction is in correct status
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
	} else {
		// Payment rejected
		transaction.Status = "rejected"
		transaction.PaymentStatus = "rejected"
	}

	// Add admin notes to Documents
	docs := transaction.Documents
	docs["admin_notes"] = adminNotes
	docs["verified_at"] = time.Now()
	docs["verification_status"] = map[string]bool{"approved": approved}
	transaction.Documents = docs

	// Update transaction
	if err := s.transactionRepo.Update(ctx, transaction); err != nil {
		return fmt.Errorf("failed to update transaction: %w", err)
	}

	// TODO: Notify user of verification result
	// s.notificationService.NotifyUserPaymentVerified(transaction, approved)

	return nil
}

// GetBankPaymentStatus returns the current status of a bank payment
func (s *BankPaymentService) GetBankPaymentStatus(ctx context.Context, transactionID string) (*BankPaymentResponse, error) {
	// Get transaction
	transaction, err := s.transactionRepo.GetByID(ctx, 0) // TODO: Parse transaction ID
	if err != nil {
		return nil, fmt.Errorf("transaction not found: %w", err)
	}

	return &BankPaymentResponse{
		TransactionID:   transactionID,
		Status:          transaction.Status,
		Message:         s.getStatusMessage(transaction.Status),
		Amount:          transaction.AmountRWF,
		Currency:        transaction.Currency,
		ReferenceNumber: transaction.PaymentReference,
	}, nil
}

// Helper functions

func (s *BankPaymentService) validateBankPaymentRequest(req *BankPaymentRequest) error {
	if req.UserID == 0 {
		return errors.New("user_id is required")
	}
	if req.Amount <= 0 {
		return errors.New("amount must be greater than 0")
	}
	if req.Currency != "RWF" && req.Currency != "USD" {
		return errors.New("currency must be RWF or USD")
	}
	if s.accountNumber == "" {
		return errors.New("bank account not configured")
	}
	return nil
}

func (s *BankPaymentService) generateBankReference() string {
	// Format: BANK-YYYYMMDD-HHMMSS-RANDOM
	return fmt.Sprintf("BANK-%s-%d", time.Now().Format("20060102-150405"), time.Now().UnixNano()%10000)
}

func (s *BankPaymentService) getStatusMessage(status string) string {
	messages := map[string]string{
		"pending_verification":       "Awaiting proof of payment submission",
		"pending_admin_verification": "Payment proof submitted, under admin review",
		"completed":                  "Payment verified and completed",
		"rejected":                   "Payment rejected by admin",
		"cancelled":                  "Payment cancelled",
	}
	if msg, ok := messages[status]; ok {
		return msg
	}
	return "Unknown status"
}
