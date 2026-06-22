package services

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

// PesapalProvider implements PaymentProvider for PesaPal (East African payments).
type PesapalProvider struct {
	consumerKey    string
	consumerSecret string
	baseURL        string
	callbackURL    string
	ipnURL         string
	httpClient     *http.Client
	token          string
	tokenExpiry    time.Time
}

func NewPesapalProvider() *PesapalProvider {
	env := os.Getenv("PESAPAL_ENVIRONMENT")
	baseURL := "https://www.pesapal.com"
	if env == "sandbox" || env == "" {
		baseURL = "https://sandbox.pesapal.com"
	}

	return &PesapalProvider{
		consumerKey:    os.Getenv("PESAPAL_CONSUMER_KEY"),
		consumerSecret: os.Getenv("PESAPAL_CONSUMER_SECRET"),
		baseURL:        baseURL,
		callbackURL:    os.Getenv("PESAPAL_CALLBACK_URL"),
		ipnURL:         os.Getenv("PESAPAL_IPN_URL"),
		httpClient:     &http.Client{Timeout: 30 * time.Second},
	}
}

func (p *PesapalProvider) Name() string { return "pesapal" }

// getAuthToken obtains an OAuth 2.0 token from PesaPal.
func (p *PesapalProvider) getAuthToken(ctx context.Context) (string, error) {
	if p.token != "" && time.Now().Before(p.tokenExpiry) {
		return p.token, nil
	}

	if p.consumerKey == "" || p.consumerSecret == "" {
		return "", errors.New("PesaPal consumer key or secret not configured")
	}

	// PesaPal API expects Basic Auth with consumer_key:consumer_secret
	authStr := base64.StdEncoding.EncodeToString([]byte(p.consumerKey + ":" + p.consumerSecret))

	body := map[string]string{
		"grant_type": "client_credentials",
		"client_id":  p.consumerKey,
		"client_secret": p.consumerSecret,
	}
	jsonBody, _ := json.Marshal(body)

	req, err := http.NewRequestWithContext(ctx, "POST", p.baseURL+"/api/Auth/RequestToken", bytes.NewReader(jsonBody))
	if err != nil {
		return "", fmt.Errorf("failed to create auth request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+authStr)

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to get PesaPal token: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		Token          string `json:"token"`
		ExpiryDate     string `json:"expiry_date"`
		Error          bool   `json:"error"`
		ErrorMessage   string `json:"error_message"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to decode PesaPal token response: %w", err)
	}

	if result.Error {
		return "", fmt.Errorf("PesaPal auth error: %s", result.ErrorMessage)
	}

	p.token = result.Token
	p.tokenExpiry = time.Now().Add(50 * time.Minute) // tokens expire in 1 hour
	return p.token, nil
}

func (p *PesapalProvider) InitiatePayment(ctx context.Context, req *ProviderPaymentRequest) (*ProviderPaymentResponse, error) {
	token, err := p.getAuthToken(ctx)
	if err != nil {
		return nil, fmt.Errorf("pesapal auth: %w", err)
	}

	// Build IPN registration if not already done
	ipnID := os.Getenv("PESAPAL_IPN_ID")
	if ipnID == "" {
		registeredIPN, err := p.registerIPN(ctx, token)
		if err != nil {
			return nil, fmt.Errorf("pesapal IPN registration: %w", err)
		}
		ipnID = registeredIPN
	}

	// For PesaPal iframe/redirect we submit an Order
	orderPayload := map[string]interface{}{
		"id":          req.Reference,
		"currency":    req.Currency,
		"amount":      req.Amount,
		"description": req.Description,
		"callback_url": p.callbackURL,
		"notification_id": ipnID,
		"billing_address": map[string]string{
			"email_address": req.CustomerEmail,
			"phone_number":  req.CustomerPhone,
			"first_name":    req.CustomerName,
		},
	}

	jsonPayload, _ := json.Marshal(orderPayload)
	apiReq, err := http.NewRequestWithContext(ctx, "POST", p.baseURL+"/api/Transactions/SubmitOrderRequest", bytes.NewReader(jsonPayload))
	if err != nil {
		return nil, fmt.Errorf("failed to create PesaPal order request: %w", err)
	}
	apiReq.Header.Set("Content-Type", "application/json")
	apiReq.Header.Set("Authorization", "Bearer "+token)

	resp, err := p.httpClient.Do(apiReq)
	if err != nil {
		return nil, fmt.Errorf("failed to submit PesaPal order: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	var result struct {
		Status       string `json:"status"`
		RedirectURL  string `json:"redirect_url"`
		OrderTrackingID string `json:"order_tracking_id"`
		MerchantReference string `json:"merchant_reference"`
		Error        bool   `json:"error"`
		ErrorMessage string `json:"error_message"`
	}
	if err := json.Unmarshal(bodyBytes, &result); err != nil {
		return nil, fmt.Errorf("failed to decode PesaPal order response: %w", err)
	}

	if result.Error || result.Status != "200" {
		errMsg := result.ErrorMessage
		if errMsg == "" {
			errMsg = fmt.Sprintf("PesaPal returned status: %s", result.Status)
		}
		return nil, fmt.Errorf("pesapal order error: %s", errMsg)
	}

	return &ProviderPaymentResponse{
		Success:       true,
		RedirectURL:   result.RedirectURL,
		CheckoutURL:   result.RedirectURL,
		ProviderRef:   result.OrderTrackingID,
		PaymentMethod: "pesapal",
		Message:       "Redirect to PesaPal to complete payment",
	}, nil
}

// registerIPN registers an IPN (Instant Payment Notification) URL with PesaPal.
func (p *PesapalProvider) registerIPN(ctx context.Context, token string) (string, error) {
	ipnPayload := map[string]string{
		"url":         p.ipnURL,
		"ipn_notification_type": "GET",
	}
	jsonPayload, _ := json.Marshal(ipnPayload)

	req, err := http.NewRequestWithContext(ctx, "POST", p.baseURL+"/api/URLSetup/RegisterIPN", bytes.NewReader(jsonPayload))
	if err != nil {
		return "", fmt.Errorf("failed to create IPN request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to register IPN: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		Status       string `json:"status"`
		IPNID        string `json:"ipn_id"`
		Error        bool   `json:"error"`
		ErrorMessage string `json:"error_message"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to decode IPN response: %w", err)
	}

	if result.Error {
		return "", fmt.Errorf("IPN registration error: %s", result.ErrorMessage)
	}

	return result.IPNID, nil
}

func (p *PesapalProvider) VerifyPayment(ctx context.Context, transactionID string) (*ProviderPaymentStatus, error) {
	token, err := p.getAuthToken(ctx)
	if err != nil {
		return nil, fmt.Errorf("pesapal auth: %w", err)
	}

	queryURL := fmt.Sprintf("%s/api/Transactions/GetTransactionStatus?orderTrackingId=%s", p.baseURL, transactionID)
	req, err := http.NewRequestWithContext(ctx, "GET", queryURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create status request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to query PesaPal status: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		Status           string  `json:"status"`
		PaymentMethod    string  `json:"payment_method"`
		Amount           float64 `json:"amount"`
		Currency         string  `json:"currency"`
		OrderTrackingID  string  `json:"order_tracking_id"`
		MerchantReference string `json:"merchant_reference"`
		PaymentStatusDescription string `json:"payment_status_description"`
		Error            bool    `json:"error"`
		ErrorMessage     string  `json:"error_message"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode PesaPal status: %w", err)
	}

	if result.Error {
		return nil, fmt.Errorf("pesapal status error: %s", result.ErrorMessage)
	}

	// Map PesaPal status codes
	status := "pending"
	switch strings.ToLower(result.Status) {
	case "completed", "200":
		status = "completed"
	case "failed", "400":
		status = "failed"
	case "cancelled":
		status = "cancelled"
	}

	return &ProviderPaymentStatus{
		ProviderRef:   result.OrderTrackingID,
		Status:        status,
		Amount:        result.Amount,
		Currency:      result.Currency,
		PaymentMethod: "pesapal",
		FailureReason: result.PaymentStatusDescription,
	}, nil
}

// generateSignature creates an HMAC SHA256 signature for PesaPal callbacks.
func (p *PesapalProvider) generateSignature(message string) string {
	mac := hmac.New(sha256.New, []byte(p.consumerSecret))
	mac.Write([]byte(message))
	return base64.StdEncoding.EncodeToString(mac.Sum(nil))
}

func (p *PesapalProvider) HandleWebhook(ctx context.Context, r *http.Request) (*WebhookResult, error) {
	// PesaPal IPN callback - parse the notification
	if err := r.ParseForm(); err != nil {
		return nil, fmt.Errorf("failed to parse IPN form: %w", err)
	}

	orderTrackingID := r.Form.Get("OrderTrackingId")
	merchantReference := r.Form.Get("MerchantReference")

	if orderTrackingID == "" {
		return nil, errors.New("missing OrderTrackingId in IPN")
	}

	// Verify payment status via API
	status, err := p.VerifyPayment(ctx, orderTrackingID)
	if err != nil {
		return nil, fmt.Errorf("IPN verification failed: %w", err)
	}

	return &WebhookResult{
		Processed:   true,
		Status:      status.Status,
		ProviderRef: orderTrackingID,
		Reference:   merchantReference,
		Amount:      status.Amount,
		Currency:    status.Currency,
	}, nil
}

func (p *PesapalProvider) GetPaymentMethods() []PaymentMethodInfo {
	return []PaymentMethodInfo{
		{
			Code:        "pesapal",
			Name:        "PesaPal",
			Description: "Pay with Mobile Money, Cards, or Bank Transfer (East Africa)",
			Icon:        "pesapal",
		},
	}
}
