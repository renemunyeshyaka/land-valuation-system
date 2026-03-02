package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"backend/internal/models"
	"backend/internal/repository"

	"gorm.io/gorm"
)

// PaymentService handles mobile money payments for MTN MoMo and Airtel Money
type PaymentService struct {
	db              *gorm.DB
	transactionRepo *repository.TransactionRepository
	mtnAPIKey       string
	mtnAPISecret    string
	mtnBaseURL      string
	airtelAPIKey    string
	airtelAPISecret string
	airtelBaseURL   string
	httpClient      *http.Client
}

func NewPaymentService(db *gorm.DB) *PaymentService {
	return &PaymentService{
		db:              db,
		transactionRepo: repository.NewTransactionRepository(db),
		mtnAPIKey:       os.Getenv("MTN_MOMO_API_KEY"),
		mtnAPISecret:    os.Getenv("MTN_MOMO_API_SECRET"),
		mtnBaseURL:      os.Getenv("MTN_MOMO_BASE_URL"),
		airtelAPIKey:    os.Getenv("AIRTEL_MONEY_API_KEY"),
		airtelAPISecret: os.Getenv("AIRTEL_MONEY_API_SECRET"),
		airtelBaseURL:   os.Getenv("AIRTEL_MONEY_BASE_URL"),
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// PaymentRequest represents a payment request
type PaymentRequest struct {
	UserID          uint    `json:"user_id"`
	Amount          float64 `json:"amount"`
	Currency        string  `json:"currency"`
	PhoneNumber     string  `json:"phone_number"`
	PaymentProvider string  `json:"payment_provider"` // mtn_momo, airtel_money
	Description     string  `json:"description"`
	SubscriptionID  *uint   `json:"subscription_id,omitempty"`
	PropertyID      *uint   `json:"property_id,omitempty"`
}

// PaymentResponse represents a payment response
type PaymentResponse struct {
	TransactionID string `json:"transaction_id"`
	Status        string `json:"status"`
	Message       string `json:"message"`
	ReferenceID   string `json:"reference_id"`
}

// InitiatePayment initiates a mobile money payment
func (s *PaymentService) InitiatePayment(ctx context.Context, req *PaymentRequest) (*PaymentResponse, error) {
	// Validate request
	if err := s.validatePaymentRequest(req); err != nil {
		return nil, err
	}

	// Create transaction record
	transaction := &models.Transaction{
		UserID:          req.UserID,
		AmountRWF:       req.Amount,
		PaymentProvider: req.PaymentProvider,
		Description:     req.Description,
		Status:          "pending",
		PaymentStatus:   "pending",
		Currency:        req.Currency,
		PaymentMethod:   "mobile_money",
	}

	// Save initial transaction
	if err := s.db.Create(transaction).Error; err != nil {
		return nil, fmt.Errorf("failed to create transaction: %w", err)
	}

	// Process payment based on provider
	var resp *PaymentResponse
	var err error

	switch req.PaymentProvider {
	case "mtn_momo":
		resp, err = s.processMTNMoMoPayment(ctx, req, transaction)
	case "airtel_money":
		resp, err = s.processAirtelMoneyPayment(ctx, req, transaction)
	default:
		return nil, errors.New("unsupported payment provider")
	}

	if err != nil {
		// Update transaction status to failed
		transaction.Status = "failed"
		transaction.PaymentStatus = "failed"
		s.db.Save(transaction)
		return nil, err
	}

	// Update transaction with provider reference
	transaction.ProviderTransactionID = resp.ReferenceID
	transaction.PaymentReference = resp.ReferenceID
	s.db.Save(transaction)

	resp.TransactionID = fmt.Sprintf("%d", transaction.ID)
	return resp, nil
}

// processMTNMoMoPayment handles MTN Mobile Money payment processing
func (s *PaymentService) processMTNMoMoPayment(ctx context.Context, req *PaymentRequest, txn *models.Transaction) (*PaymentResponse, error) {
	// MTN MoMo API Collection Request
	// Endpoint: POST /collection/v1_0/requesttopay

	if s.mtnAPIKey == "" || s.mtnBaseURL == "" {
		return nil, errors.New("MTN MoMo API credentials not configured")
	}

	requestBody := map[string]interface{}{
		"amount":     fmt.Sprintf("%.2f", req.Amount),
		"currency":   req.Currency,
		"externalId": fmt.Sprintf("%d", txn.ID),
		"payer": map[string]string{
			"partyIdType": "MSISDN",
			"partyId":     s.formatPhoneNumber(req.PhoneNumber),
		},
		"payerMessage": req.Description,
		"payeeNote":    "Land Valuation System",
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Generate unique reference ID for MTN
	referenceID := s.generateReferenceID()

	apiURL := fmt.Sprintf("%s/collection/v1_0/requesttopay", s.mtnBaseURL)
	httpReq, err := http.NewRequestWithContext(ctx, "POST", apiURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	// Set required headers for MTN MoMo API
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+s.mtnAPIKey)
	httpReq.Header.Set("X-Reference-Id", referenceID)
	httpReq.Header.Set("X-Target-Environment", s.getEnvironment())
	httpReq.Header.Set("Ocp-Apim-Subscription-Key", s.mtnAPISecret)

	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("MTN MoMo API request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusAccepted {
		return nil, fmt.Errorf("MTN MoMo payment failed: status %d, body: %s", resp.StatusCode, string(body))
	}

	return &PaymentResponse{
		Status:      "pending",
		Message:     "Payment request sent to MTN MoMo. Please approve on your phone.",
		ReferenceID: referenceID,
	}, nil
}

// processAirtelMoneyPayment handles Airtel Money payment processing
func (s *PaymentService) processAirtelMoneyPayment(ctx context.Context, req *PaymentRequest, txn *models.Transaction) (*PaymentResponse, error) {
	// Airtel Money API Push Payment Request
	// Endpoint: POST /merchant/v1/payments/

	if s.airtelAPIKey == "" || s.airtelBaseURL == "" {
		return nil, errors.New("Airtel Money API credentials not configured")
	}

	requestBody := map[string]interface{}{
		"reference": fmt.Sprintf("TXN%d", txn.ID),
		"subscriber": map[string]string{
			"country":  "RW",
			"currency": req.Currency,
			"msisdn":   s.formatPhoneNumber(req.PhoneNumber),
		},
		"transaction": map[string]interface{}{
			"amount":   req.Amount,
			"country":  "RW",
			"currency": req.Currency,
			"id":       fmt.Sprintf("%d", txn.ID),
		},
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	apiURL := fmt.Sprintf("%s/merchant/v1/payments/", s.airtelBaseURL)
	httpReq, err := http.NewRequestWithContext(ctx, "POST", apiURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	// Get Airtel OAuth token
	token, err := s.getAirtelAuthToken(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get Airtel auth token: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+token)
	httpReq.Header.Set("X-Country", "RW")
	httpReq.Header.Set("X-Currency", req.Currency)

	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("Airtel Money API request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var airtelResp struct {
		Status struct {
			Code       string `json:"code"`
			Message    string `json:"message"`
			ResultCode string `json:"result_code"`
		} `json:"status"`
		Data struct {
			Transaction struct {
				ID     string `json:"id"`
				Status string `json:"status"`
			} `json:"transaction"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &airtelResp); err != nil {
		return nil, fmt.Errorf("failed to parse Airtel response: %w", err)
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("Airtel Money payment failed: %s", airtelResp.Status.Message)
	}

	return &PaymentResponse{
		Status:      "pending",
		Message:     "Payment request sent to Airtel Money. Please approve on your phone.",
		ReferenceID: airtelResp.Data.Transaction.ID,
	}, nil
}

// CheckPaymentStatus checks the status of a payment
func (s *PaymentService) CheckPaymentStatus(ctx context.Context, transactionID string, provider string) (*PaymentResponse, error) {
	switch provider {
	case "mtn_momo":
		return s.checkMTNMoMoStatus(ctx, transactionID)
	case "airtel_money":
		return s.checkAirtelMoneyStatus(ctx, transactionID)
	default:
		return nil, errors.New("unsupported payment provider")
	}
}

// checkMTNMoMoStatus checks MTN MoMo payment status
func (s *PaymentService) checkMTNMoMoStatus(ctx context.Context, referenceID string) (*PaymentResponse, error) {
	apiURL := fmt.Sprintf("%s/collection/v1_0/requesttopay/%s", s.mtnBaseURL, referenceID)

	httpReq, err := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Authorization", "Bearer "+s.mtnAPIKey)
	httpReq.Header.Set("X-Target-Environment", s.getEnvironment())
	httpReq.Header.Set("Ocp-Apim-Subscription-Key", s.mtnAPISecret)

	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var statusResp struct {
		Status string `json:"status"`
		Reason string `json:"reason"`
	}

	if err := json.Unmarshal(body, &statusResp); err != nil {
		return nil, err
	}

	return &PaymentResponse{
		Status:      statusResp.Status,
		Message:     statusResp.Reason,
		ReferenceID: referenceID,
	}, nil
}

// checkAirtelMoneyStatus checks Airtel Money payment status
func (s *PaymentService) checkAirtelMoneyStatus(ctx context.Context, transactionID string) (*PaymentResponse, error) {
	token, err := s.getAirtelAuthToken(ctx)
	if err != nil {
		return nil, err
	}

	apiURL := fmt.Sprintf("%s/standard/v1/payments/%s", s.airtelBaseURL, transactionID)

	httpReq, err := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Authorization", "Bearer "+token)
	httpReq.Header.Set("X-Country", "RW")
	httpReq.Header.Set("X-Currency", "RWF")

	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var statusResp struct {
		Status struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		} `json:"status"`
		Data struct {
			Transaction struct {
				Status string `json:"status"`
			} `json:"transaction"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &statusResp); err != nil {
		return nil, err
	}

	return &PaymentResponse{
		Status:      statusResp.Data.Transaction.Status,
		Message:     statusResp.Status.Message,
		ReferenceID: transactionID,
	}, nil
}

// getAirtelAuthToken gets OAuth token for Airtel Money API
func (s *PaymentService) getAirtelAuthToken(ctx context.Context) (string, error) {
	apiURL := fmt.Sprintf("%s/auth/oauth2/token", s.airtelBaseURL)

	requestBody := map[string]string{
		"client_id":     s.airtelAPIKey,
		"client_secret": s.airtelAPISecret,
		"grant_type":    "client_credentials",
	}

	jsonData, _ := json.Marshal(requestBody)

	httpReq, err := http.NewRequestWithContext(ctx, "POST", apiURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}

	if err := json.Unmarshal([]byte(""), &tokenResp); err != nil {
		return "", err
	}

	return tokenResp.AccessToken, nil
}

// Helper functions
func (s *PaymentService) validatePaymentRequest(req *PaymentRequest) error {
	if req.Amount <= 0 {
		return errors.New("amount must be greater than zero")
	}
	if req.PhoneNumber == "" {
		return errors.New("phone number is required")
	}
	if req.PaymentProvider == "" {
		return errors.New("payment provider is required")
	}
	if req.Currency == "" {
		req.Currency = "RWF"
	}
	return nil
}

func (s *PaymentService) formatPhoneNumber(phone string) string {
	// Format phone number for Rwanda (250XXXXXXXXX)
	// Remove any spaces, dashes, or leading zeros/plus signs
	// Ensure it starts with country code
	if len(phone) > 0 && phone[0] == '+' {
		return phone[1:]
	}
	if len(phone) > 0 && phone[0] == '0' {
		return "250" + phone[1:]
	}
	if len(phone) == 9 {
		return "250" + phone
	}
	return phone
}

func (s *PaymentService) generateReferenceID() string {
	return fmt.Sprintf("LVS-%d-%d", time.Now().Unix(), time.Now().Nanosecond())
}

func (s *PaymentService) getEnvironment() string {
	env := os.Getenv("ENVIRONMENT")
	if env == "production" {
		return "production"
	}
	return "sandbox"
}

// ProcessCallback handles payment provider callbacks/webhooks
func (s *PaymentService) ProcessCallback(ctx context.Context, provider string, payload map[string]interface{}) error {
	// Implementation depends on specific webhook format from each provider
	// This is a placeholder for webhook processing
	return nil
}
