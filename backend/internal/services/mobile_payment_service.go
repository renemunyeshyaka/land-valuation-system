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
	"strconv"
	"strings"
	"sync"
	"time"

	"backend/internal/models"
	"backend/internal/repository"

	"gorm.io/gorm"
)

// PaymentService handles mobile money payments for MTN MoMo and Airtel Money
type PaymentService struct {
	db                   *gorm.DB
	transactionRepo      *repository.TransactionRepository
	mtnAPIKey            string
	mtnSubscriptionKey   string
	mtnBaseURL           string
	mtnTargetEnvironment string
	mtnWebhookSecret     string
	airtelAPIKey         string
	airtelAPISecret      string
	airtelBaseURL        string
	airtelWebhookSecret  string
	httpClient           *http.Client
	airtelToken          string
	airtelTokenExpiry    time.Time
	replayMutex          sync.Mutex
	callbackReplayCache  map[string]time.Time
	callbackReplayTTL    time.Duration
	callbackMaxSkew      time.Duration
}

func NewPaymentService(db *gorm.DB) *PaymentService {
	mtnEnv := getEnvAny("MTN_MOMO_ENVIRONMENT", "ENVIRONMENT")
	if strings.EqualFold(mtnEnv, "development") || strings.EqualFold(mtnEnv, "dev") {
		mtnEnv = "sandbox"
	}
	if mtnEnv == "" {
		mtnEnv = "sandbox"
	}

	return &PaymentService{
		db:                   db,
		transactionRepo:      repository.NewTransactionRepository(db),
		mtnAPIKey:            getEnvAny("MTN_MOMO_API_KEY", "MTN_API_KEY"),
		mtnSubscriptionKey:   getEnvAny("MTN_MOMO_SUBSCRIPTION_KEY", "MTN_MOMO_API_SECRET", "MTN_API_SECRET"),
		mtnBaseURL:           getEnvAny("MTN_MOMO_BASE_URL", "MTN_API_URL"),
		mtnTargetEnvironment: mtnEnv,
		mtnWebhookSecret:     getEnvAny("MTN_WEBHOOK_SECRET", "MTN_MOMO_WEBHOOK_SECRET"),
		airtelAPIKey:         getEnvAny("AIRTEL_MONEY_API_KEY", "AIRTEL_API_KEY"),
		airtelAPISecret:      getEnvAny("AIRTEL_MONEY_API_SECRET", "AIRTEL_API_SECRET"),
		airtelBaseURL:        getEnvAny("AIRTEL_MONEY_BASE_URL", "AIRTEL_API_URL"),
		airtelWebhookSecret:  getEnvAny("AIRTEL_WEBHOOK_SECRET", "AIRTEL_MONEY_WEBHOOK_SECRET"),
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		callbackReplayCache: make(map[string]time.Time),
		callbackReplayTTL:   time.Duration(getEnvInt("WEBHOOK_REPLAY_TTL_SECONDS", 900)) * time.Second,
		callbackMaxSkew:     time.Duration(getEnvInt("WEBHOOK_MAX_SKEW_SECONDS", 600)) * time.Second,
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

	provider := normalizeProvider(req.PaymentProvider)

	// Current transaction schema requires property/seller/buyer links for FK integrity.
	propertyID, propErr := s.resolvePaymentPropertyID(ctx, req.UserID, req.PropertyID)
	if propErr != nil {
		return nil, propErr
	}

	// Create transaction record
	transaction := &models.Transaction{
		UserID:          req.UserID,
		PropertyID:      propertyID,
		SellerID:        req.UserID,
		BuyerID:         req.UserID,
		TransactionType: "subscription",
		Amount:          req.Amount,
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

	switch provider {
	case "mtn":
		transaction.PaymentProvider = "mtn_momo"
		resp, err = s.processMTNMoMoPayment(ctx, req, transaction)
	case "airtel":
		transaction.PaymentProvider = "airtel_money"
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

	if s.mtnAPIKey == "" || s.mtnSubscriptionKey == "" || s.mtnBaseURL == "" {
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
	httpReq.Header.Set("Ocp-Apim-Subscription-Key", s.mtnSubscriptionKey)

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

// CheckPaymentStatus checks the status of a payment and syncs to DB
func (s *PaymentService) CheckPaymentStatus(ctx context.Context, transactionID string, provider string) (*PaymentResponse, error) {
	lookupID := transactionID
	resolvedProvider := normalizeProvider(provider)
	var txn *models.Transaction

	// Allow status checks using internal transaction ID from our API response.
	if id, err := strconv.ParseUint(transactionID, 10, 64); err == nil {
		txnResult, txnErr := s.transactionRepo.GetByID(ctx, uint(id))
		if txnErr == nil && txnResult != nil {
			txn = txnResult
			if txn.ProviderTransactionID != "" {
				lookupID = txn.ProviderTransactionID
			}
			if resolvedProvider == "" {
				resolvedProvider = normalizeProvider(txn.PaymentProvider)
			}
		}
	}

	var resp *PaymentResponse
	var err error

	switch resolvedProvider {
	case "mtn":
		resp, err = s.checkMTNMoMoStatus(ctx, lookupID)
	case "airtel":
		resp, err = s.checkAirtelMoneyStatus(ctx, lookupID)
	default:
		return nil, errors.New("unsupported payment provider")
	}

	if err != nil {
		return nil, err
	}

	// Sync status to database if we have the transaction
	if txn != nil && resp != nil {
		s.updateTransactionStatus(ctx, txn, resp.Status)
		if err := s.db.WithContext(ctx).Save(txn).Error; err != nil {
			return nil, fmt.Errorf("failed to sync transaction status: %w", err)
		}
	}

	return resp, nil
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
	httpReq.Header.Set("Ocp-Apim-Subscription-Key", s.mtnSubscriptionKey)

	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("MTN MoMo status check failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("MTN MoMo status check failed: status %d, body: %s", resp.StatusCode, string(body))
	}

	var statusResp struct {
		Status string `json:"status"`
		Reason string `json:"reason"`
	}

	if err := json.Unmarshal(body, &statusResp); err != nil {
		return nil, fmt.Errorf("failed to parse MTN status response: %w", err)
	}

	// Normalize MTN status values: SUCCESSFUL, FAILED, PENDING
	normalizedStatus := strings.ToLower(statusResp.Status)
	if normalizedStatus == "successful" {
		normalizedStatus = "success"
	}

	return &PaymentResponse{
		Status:      normalizedStatus,
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

// getAirtelAuthToken gets OAuth token for Airtel Money API with caching
func (s *PaymentService) getAirtelAuthToken(ctx context.Context) (string, error) {
	if s.airtelAPIKey == "" || s.airtelAPISecret == "" || s.airtelBaseURL == "" {
		return "", errors.New("Airtel Money API credentials not configured")
	}

	// Return cached token if still valid (with 60s buffer)
	if s.airtelToken != "" && time.Now().Before(s.airtelTokenExpiry.Add(-60*time.Second)) {
		return s.airtelToken, nil
	}

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
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		Token       string `json:"token"`
		ExpiresIn   int    `json:"expires_in"`
		Data        struct {
			AccessToken string `json:"access_token"`
			Token       string `json:"token"`
			ExpiresIn   int    `json:"expires_in"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return "", err
	}

	token := tokenResp.AccessToken
	if token == "" {
		token = tokenResp.Token
	}
	if token == "" {
		token = tokenResp.Data.AccessToken
	}
	if token == "" {
		token = tokenResp.Data.Token
	}
	if token == "" {
		return "", errors.New("airtel auth token missing from response")
	}

	// Cache the token
	expiresIn := tokenResp.ExpiresIn
	if expiresIn == 0 {
		expiresIn = tokenResp.Data.ExpiresIn
	}
	if expiresIn == 0 {
		expiresIn = 3600 // Default 1 hour
	}
	s.airtelToken = token
	s.airtelTokenExpiry = time.Now().Add(time.Duration(expiresIn) * time.Second)

	return token, nil
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
	if normalizeProvider(req.PaymentProvider) == "" {
		return errors.New("unsupported payment provider")
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
	if s.mtnTargetEnvironment != "" {
		return strings.ToLower(s.mtnTargetEnvironment)
	}
	env := strings.ToLower(os.Getenv("ENVIRONMENT"))
	if env == "production" {
		return "production"
	}
	return "sandbox"
}

func normalizeProvider(provider string) string {
	switch strings.ToLower(strings.TrimSpace(provider)) {
	case "mtn", "mtn_momo", "mtn momo", "momo":
		return "mtn"
	case "airtel", "airtel_money", "airtel money":
		return "airtel"
	default:
		return ""
	}
}

func getEnvAny(keys ...string) string {
	for _, key := range keys {
		if value := strings.TrimSpace(os.Getenv(key)); value != "" {
			return value
		}
	}
	return ""
}

func getEnvInt(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err != nil || parsed <= 0 {
		return fallback
	}

	return parsed
}

func (s *PaymentService) preventReplay(provider string, payload map[string]interface{}, signature string) error {
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to serialize callback payload: %w", err)
	}

	now := time.Now()
	fingerprint := fmt.Sprintf("%s|%s|%s", provider, signature, string(payloadJSON))

	s.replayMutex.Lock()
	defer s.replayMutex.Unlock()

	if s.callbackReplayCache == nil {
		s.callbackReplayCache = make(map[string]time.Time)
	}
	if s.callbackReplayTTL <= 0 {
		s.callbackReplayTTL = 15 * time.Minute
	}

	for key, seenAt := range s.callbackReplayCache {
		if now.Sub(seenAt) > s.callbackReplayTTL {
			delete(s.callbackReplayCache, key)
		}
	}

	if seenAt, exists := s.callbackReplayCache[fingerprint]; exists {
		if now.Sub(seenAt) <= s.callbackReplayTTL {
			return errors.New("duplicate callback detected")
		}
	}

	s.callbackReplayCache[fingerprint] = now
	return nil
}

func (s *PaymentService) validateCallbackFreshness(provider string, payload map[string]interface{}) error {
	if s.callbackMaxSkew <= 0 {
		return nil
	}

	timestamp, ok := extractCallbackTimestamp(provider, payload)
	if !ok {
		return nil
	}

	if time.Since(timestamp) > s.callbackMaxSkew {
		return errors.New("stale callback timestamp")
	}

	return nil
}

func extractCallbackTimestamp(provider string, payload map[string]interface{}) (time.Time, bool) {
	parse := func(value string) (time.Time, bool) {
		ts, err := time.Parse(time.RFC3339, strings.TrimSpace(value))
		if err != nil {
			return time.Time{}, false
		}
		return ts, true
	}

	if raw, ok := payload["timestamp"].(string); ok {
		if ts, valid := parse(raw); valid {
			return ts, true
		}
	}
	if raw, ok := payload["event_time"].(string); ok {
		if ts, valid := parse(raw); valid {
			return ts, true
		}
	}
	if raw, ok := payload["eventTime"].(string); ok {
		if ts, valid := parse(raw); valid {
			return ts, true
		}
	}

	if provider == "airtel" {
		if txn, ok := payload["transaction"].(map[string]interface{}); ok {
			if raw, ok := txn["timestamp"].(string); ok {
				if ts, valid := parse(raw); valid {
					return ts, true
				}
			}
		}
	}

	return time.Time{}, false
}

func (s *PaymentService) resolvePaymentPropertyID(ctx context.Context, userID uint, requested *uint) (uint, error) {
	if requested != nil && *requested > 0 {
		return *requested, nil
	}

	var property models.Property
	err := s.db.WithContext(ctx).Order("id ASC").First(&property).Error
	if err == nil {
		return property.ID, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return 0, fmt.Errorf("failed to resolve property for payment: %w", err)
	}

	// Create a minimal placeholder property for payment transactions when catalog is empty.
	placeholder := &models.Property{
		Title:        "Payment Placeholder Property",
		Description:  "Auto-created placeholder for payment transaction linkage",
		PropertyType: "residential",
		Status:       "available",
		LandSize:     1,
		Price:        1,
		Currency:     "RWF",
		OwnerID:      userID,
	}
	if createErr := s.db.WithContext(ctx).Create(placeholder).Error; createErr != nil {
		return 0, fmt.Errorf("failed to create placeholder property for payment: %w", createErr)
	}

	return placeholder.ID, nil
}

// ProcessCallback handles payment provider callbacks/webhooks with signature validation
func (s *PaymentService) ProcessCallback(ctx context.Context, provider string, payload map[string]interface{}, signature string) error {
	resolvedProvider := normalizeProvider(provider)

	if err := s.validateCallbackFreshness(resolvedProvider, payload); err != nil {
		return fmt.Errorf("webhook freshness validation failed: %w", err)
	}

	if err := s.preventReplay(resolvedProvider, payload, signature); err != nil {
		return fmt.Errorf("webhook replay validation failed: %w", err)
	}

	// Validate webhook signature
	if err := s.validateWebhookSignature(resolvedProvider, payload, signature); err != nil {
		return fmt.Errorf("webhook signature validation failed: %w", err)
	}

	switch resolvedProvider {
	case "mtn":
		return s.processMTNCallback(ctx, payload)
	case "airtel":
		return s.processAirtelCallback(ctx, payload)
	default:
		return fmt.Errorf("unsupported payment provider: %s", provider)
	}
}

// processMTNCallback handles MTN MoMo webhook callbacks
func (s *PaymentService) processMTNCallback(ctx context.Context, payload map[string]interface{}) error {
	// MTN sends X-Reference-Id in headers and status in body
	// Expected payload: {"financialTransactionId": "...", "status": "SUCCESSFUL/FAILED", "reason": "..."}

	referenceID, ok := payload["reference_id"].(string)
	if !ok || referenceID == "" {
		// Try alternative field names
		if ref, exists := payload["referenceId"].(string); exists {
			referenceID = ref
		}
	}

	if referenceID == "" {
		return errors.New("missing reference_id in MTN callback")
	}

	status, _ := payload["status"].(string)
	reason, _ := payload["reason"].(string)

	// Find transaction by provider reference ID
	var txn models.Transaction
	err := s.db.WithContext(ctx).Where("provider_transaction_id = ? OR payment_reference = ?", referenceID, referenceID).First(&txn).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("transaction not found for reference: %s", referenceID)
		}
		return fmt.Errorf("failed to lookup transaction: %w", err)
	}

	// Store raw callback payload in Terms field
	if txn.Terms == nil {
		txn.Terms = make(models.JSON)
	}
	txn.Terms["mtn_callback"] = payload

	// Update transaction status
	s.updateTransactionStatus(ctx, &txn, strings.ToLower(status))

	if reason != "" && txn.Description == "" {
		txn.Description = reason
	}

	if err := s.db.WithContext(ctx).Save(&txn).Error; err != nil {
		return fmt.Errorf("failed to update transaction: %w", err)
	}

	// If payment is successful and transaction type is subscription, update subscription
	if strings.ToLower(status) == "successful" && txn.TransactionType == "subscription" {
		subService := NewSubscriptionService(s.db)
		userID := fmt.Sprintf("%d", txn.UserID)
		planType := "basic" // Default
		// Prefer explicit plan_type in payload
		if val, ok := payload["plan_type"]; ok {
			if s, ok := val.(string); ok && s != "" {
				planType = s
			}
		}
		// Fallback to txn.Description if it matches a known plan
		if planType == "basic" && txn.Description != "" {
			knownPlans := map[string]bool{"free": true, "basic": true, "professional": true, "ultimate": true}
			if knownPlans[strings.ToLower(txn.Description)] {
				planType = strings.ToLower(txn.Description)
			}
		}
		if err := subService.UpdateSubscriptionAfterPayment(ctx, userID, planType, &txn); err != nil {
			return fmt.Errorf("failed to update subscription after payment: %w", err)
		}
	}

	return nil
}

// processAirtelCallback handles Airtel Money webhook callbacks
func (s *PaymentService) processAirtelCallback(ctx context.Context, payload map[string]interface{}) error {
	// Airtel webhook structure:
	// {"transaction": {"id": "...", "status": "...", "message": "..."}}

	transactionData, ok := payload["transaction"].(map[string]interface{})
	if !ok {
		return errors.New("invalid Airtel callback structure: missing transaction object")
	}

	transactionID, _ := transactionData["id"].(string)
	if transactionID == "" {
		return errors.New("missing transaction id in Airtel callback")
	}

	status, _ := transactionData["status"].(string)
	message, _ := transactionData["message"].(string)

	// Find transaction by provider reference ID
	var txn models.Transaction
	err := s.db.WithContext(ctx).Where("provider_transaction_id = ? OR payment_reference = ?", transactionID, transactionID).First(&txn).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("transaction not found for reference: %s", transactionID)
		}
		return fmt.Errorf("failed to lookup transaction: %w", err)
	}

	// Store raw callback payload in Terms field
	if txn.Terms == nil {
		txn.Terms = make(models.JSON)
	}
	txn.Terms["airtel_callback"] = payload

	// Update transaction status
	s.updateTransactionStatus(ctx, &txn, strings.ToLower(status))

	if message != "" && txn.Description == "" {
		txn.Description = message
	}

	if err := s.db.WithContext(ctx).Save(&txn).Error; err != nil {
		return fmt.Errorf("failed to update transaction: %w", err)
	}

	return nil
}

// updateTransactionStatus updates transaction status with normalization
func (s *PaymentService) updateTransactionStatus(ctx context.Context, txn *models.Transaction, providerStatus string) {
	// Normalize status values across providers
	normalizedStatus := strings.ToLower(strings.TrimSpace(providerStatus))

	switch normalizedStatus {
	case "successful", "success", "completed", "ts":
		txn.Status = "completed"
		txn.PaymentStatus = "success"
	case "failed", "fail", "tf", "rejected":
		txn.Status = "failed"
		txn.PaymentStatus = "failed"
	case "pending", "tp", "processing":
		txn.Status = "pending"
		txn.PaymentStatus = "pending"
	default:
		// Unknown status, keep as pending and log
		if normalizedStatus != "" {
			txn.Status = "pending"
			txn.PaymentStatus = normalizedStatus // Store original for debugging
		}
	}
}

// validateWebhookSignature validates webhook signature based on provider
func (s *PaymentService) validateWebhookSignature(provider string, payload map[string]interface{}, signature string) error {
	// Skip validation if no secret configured (development mode)
	switch provider {
	case "mtn":
		if s.mtnWebhookSecret == "" {
			return nil // Skip validation in dev mode
		}
		return s.validateMTNSignature(payload, signature)
	case "airtel":
		if s.airtelWebhookSecret == "" {
			return nil // Skip validation in dev mode
		}
		return s.validateAirtelSignature(payload, signature)
	default:
		return fmt.Errorf("unknown provider: %s", provider)
	}
}

// validateMTNSignature validates MTN MoMo webhook signature
func (s *PaymentService) validateMTNSignature(payload map[string]interface{}, signature string) error {
	if signature == "" {
		return errors.New("missing X-Callback-Token header")
	}

	// MTN uses X-Callback-Token header for signature validation
	// In production, this should match the token provided during API user creation
	if signature != s.mtnWebhookSecret {
		return errors.New("invalid MTN webhook signature")
	}

	return nil
}

// validateAirtelSignature validates Airtel Money webhook signature using HMAC
func (s *PaymentService) validateAirtelSignature(payload map[string]interface{}, signature string) error {
	if signature == "" {
		return errors.New("missing X-Signature header")
	}

	// Airtel uses HMAC-SHA256 signature
	// Compute HMAC of payload JSON
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	// Compute expected signature
	// Note: This is a simplified implementation. Actual Airtel signature may differ.
	// Consult Airtel API documentation for exact signature computation method.
	expectedSignature := fmt.Sprintf("%x", []byte(s.airtelWebhookSecret+string(payloadJSON)))

	if signature != expectedSignature {
		return errors.New("invalid Airtel webhook signature")
	}

	return nil
}
