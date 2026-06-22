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
	"strings"
	"time"
)

// PayPalProvider implements PaymentProvider for PayPal standard checkout.
type PayPalProvider struct {
	clientID     string
	clientSecret string
	baseURL      string
	webhookID    string
	httpClient   *http.Client
	token        string
	tokenExpiry  time.Time
}

func NewPayPalProvider() *PayPalProvider {
	env := os.Getenv("PAYPAL_ENVIRONMENT")
	baseURL := "https://api-m.paypal.com"
	if env == "sandbox" || env == "" {
		baseURL = "https://api-m.sandbox.paypal.com"
	}

	return &PayPalProvider{
		clientID:     os.Getenv("PAYPAL_CLIENT_ID"),
		clientSecret: os.Getenv("PAYPAL_CLIENT_SECRET"),
		baseURL:      baseURL,
		webhookID:    os.Getenv("PAYPAL_WEBHOOK_ID"),
		httpClient:   &http.Client{Timeout: 30 * time.Second},
	}
}

func (p *PayPalProvider) Name() string { return "paypal" }

// getAccessToken obtains an OAuth 2.0 access token from PayPal.
func (p *PayPalProvider) getAccessToken(ctx context.Context) (string, error) {
	if p.token != "" && time.Now().Before(p.tokenExpiry) {
		return p.token, nil
	}

	if p.clientID == "" || p.clientSecret == "" {
		return "", errors.New("PayPal client ID or secret not configured")
	}

	body := "grant_type=client_credentials"
	req, err := http.NewRequestWithContext(ctx, "POST", p.baseURL+"/v1/oauth2/token", strings.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("failed to create PayPal auth request: %w", err)
	}
	req.SetBasicAuth(p.clientID, p.clientSecret)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to get PayPal token: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to decode PayPal token response: %w", err)
	}

	if result.AccessToken == "" {
		return "", errors.New("PayPal returned empty access token")
	}

	p.token = result.AccessToken
	expiry := result.ExpiresIn
	if expiry <= 0 {
		expiry = 32400 // default 9 hours
	}
	p.tokenExpiry = time.Now().Add(time.Duration(expiry-300) * time.Second) // 5 min buffer
	return p.token, nil
}

func (p *PayPalProvider) InitiatePayment(ctx context.Context, req *ProviderPaymentRequest) (*ProviderPaymentResponse, error) {
	token, err := p.getAccessToken(ctx)
	if err != nil {
		return nil, fmt.Errorf("paypal auth: %w", err)
	}

	// Build PayPal Order API request
	returnURL := req.ReturnURL
	if returnURL == "" {
		returnURL = os.Getenv("PAYPAL_RETURN_URL")
	}
	cancelURL := req.CancelURL
	if cancelURL == "" {
		cancelURL = os.Getenv("PAYPAL_CANCEL_URL")
	}

	currency := req.Currency
	if currency == "" {
		currency = "USD"
	}

	orderPayload := map[string]interface{}{
		"intent": "CAPTURE",
		"purchase_units": []map[string]interface{}{
			{
				"reference_id": req.Reference,
				"description":  req.Description,
				"amount": map[string]interface{}{
					"currency_code": currency,
					"value":         fmt.Sprintf("%.2f", req.Amount),
				},
			},
		},
		"payment_source": map[string]interface{}{
			"paypal": map[string]interface{}{
				"experience_context": map[string]interface{}{
					"payment_method_preference": "IMMEDIATE_PAYMENT_REQUIRED",
					"brand_name":               os.Getenv("PAYPAL_BRAND_NAME"),
					"locale":                   "en-US",
					"landing_page":             "LOGIN",
					"user_action":              "PAY_NOW",
					"return_url":               returnURL,
					"cancel_url":               cancelURL,
				},
			},
		},
	}

	jsonPayload, _ := json.Marshal(orderPayload)
	apiReq, err := http.NewRequestWithContext(ctx, "POST", p.baseURL+"/v2/checkout/orders", bytes.NewReader(jsonPayload))
	if err != nil {
		return nil, fmt.Errorf("failed to create PayPal order request: %w", err)
	}
	apiReq.Header.Set("Content-Type", "application/json")
	apiReq.Header.Set("Authorization", "Bearer "+token)

	resp, err := p.httpClient.Do(apiReq)
	if err != nil {
		return nil, fmt.Errorf("failed to submit PayPal order: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	var orderResult struct {
		ID     string `json:"id"`
		Status string `json:"status"`
		Links  []struct {
			Href   string `json:"href"`
			Rel    string `json:"rel"`
			Method string `json:"method"`
		} `json:"links"`
		Message string `json:"message"`
		Details []struct {
			Issue       string `json:"issue"`
			Description string `json:"description"`
		} `json:"details"`
	}
	if err := json.Unmarshal(bodyBytes, &orderResult); err != nil {
		return nil, fmt.Errorf("failed to decode PayPal order response: %w", err)
	}

	if orderResult.Status == "" && orderResult.Message != "" {
		errMsg := orderResult.Message
		if len(orderResult.Details) > 0 {
			errMsg = orderResult.Details[0].Description
		}
		return nil, fmt.Errorf("paypal order error: %s", errMsg)
	}

	// Find the approval URL from the HATEOAS links
	approvalURL := ""
	for _, link := range orderResult.Links {
		if link.Rel == "payer-action" {
			approvalURL = link.Href
			break
		}
	}

	return &ProviderPaymentResponse{
		Success:       true,
		RedirectURL:   approvalURL,
		CheckoutURL:   approvalURL,
		ProviderRef:   orderResult.ID,
		PaymentMethod: "paypal",
		Message:       "Redirect to PayPal to complete payment",
	}, nil
}

// CapturePayment captures an approved PayPal order.
func (p *PayPalProvider) CapturePayment(ctx context.Context, orderID string) (*ProviderPaymentStatus, error) {
	token, err := p.getAccessToken(ctx)
	if err != nil {
		return nil, fmt.Errorf("paypal auth: %w", err)
	}

	apiReq, err := http.NewRequestWithContext(ctx, "POST", p.baseURL+"/v2/checkout/orders/"+orderID+"/capture", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create capture request: %w", err)
	}
	apiReq.Header.Set("Content-Type", "application/json")
	apiReq.Header.Set("Authorization", "Bearer "+token)

	resp, err := p.httpClient.Do(apiReq)
	if err != nil {
		return nil, fmt.Errorf("failed to capture PayPal order: %w", err)
	}
	defer resp.Body.Close()

	var captureResult struct {
		ID     string `json:"id"`
		Status string `json:"status"`
		PurchaseUnits []struct {
			Payments struct {
				Captures []struct {
					ID     string `json:"id"`
					Status string `json:"status"`
					Amount struct {
						CurrencyCode string `json:"currency_code"`
						Value        string `json:"value"`
					} `json:"amount"`
					CreateTime string `json:"create_time"`
				} `json:"captures"`
			} `json:"payments"`
		} `json:"purchase_units"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&captureResult); err != nil {
		return nil, fmt.Errorf("failed to decode PayPal capture response: %w", err)
	}

	status := "pending"
	switch strings.ToUpper(captureResult.Status) {
	case "COMPLETED":
		status = "completed"
	case "DECLINED", "FAILED":
		status = "failed"
	case "CANCELLED", "VOIDED":
		status = "cancelled"
	}

	paidAt := ""
	var amount float64
	var currency string
	if len(captureResult.PurchaseUnits) > 0 && len(captureResult.PurchaseUnits[0].Payments.Captures) > 0 {
		c := captureResult.PurchaseUnits[0].Payments.Captures[0]
		paidAt = c.CreateTime
		amount, _ = parseFloat(c.Amount.Value)
		currency = c.Amount.CurrencyCode
	}

	return &ProviderPaymentStatus{
		ProviderRef:   captureResult.ID,
		Status:        status,
		Amount:        amount,
		Currency:      currency,
		PaymentMethod: "paypal",
		PaidAt:        paidAt,
	}, nil
}

func parseFloat(s string) (float64, error) {
	var f float64
	_, err := fmt.Sscanf(s, "%f", &f)
	return f, err
}

func (p *PayPalProvider) VerifyPayment(ctx context.Context, orderID string) (*ProviderPaymentStatus, error) {
	token, err := p.getAccessToken(ctx)
	if err != nil {
		return nil, fmt.Errorf("paypal auth: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "GET", p.baseURL+"/v2/checkout/orders/"+orderID, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create status request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to query PayPal order: %w", err)
	}
	defer resp.Body.Close()

	var orderResult struct {
		ID     string `json:"id"`
		Status string `json:"status"`
		PurchaseUnits []struct {
			Amount struct {
				CurrencyCode string `json:"currency_code"`
				Value        string `json:"value"`
			} `json:"amount"`
		} `json:"purchase_units"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&orderResult); err != nil {
		return nil, fmt.Errorf("failed to decode PayPal order: %w", err)
	}

	status := "pending"
	switch strings.ToUpper(orderResult.Status) {
	case "COMPLETED", "APPROVED":
		status = "completed"
	case "CREATED", "SAVED", "PAYER_ACTION_REQUIRED":
		status = "pending"
	case "DECLINED", "FAILED":
		status = "failed"
	case "CANCELLED", "VOIDED":
		status = "cancelled"
	}

	var amount float64
	currency := "USD"
	if len(orderResult.PurchaseUnits) > 0 {
		amount, _ = parseFloat(orderResult.PurchaseUnits[0].Amount.Value)
		currency = orderResult.PurchaseUnits[0].Amount.CurrencyCode
	}

	return &ProviderPaymentStatus{
		ProviderRef:   orderResult.ID,
		Status:        status,
		Amount:        amount,
		Currency:      currency,
		PaymentMethod: "paypal",
	}, nil
}

// verifyWebhookSignature validates that a webhook notification came from PayPal.
func (p *PayPalProvider) verifyWebhookSignature(ctx context.Context, r *http.Request, body []byte) (bool, error) {
	token, err := p.getAccessToken(ctx)
	if err != nil {
		return false, err
	}

	headers := map[string]string{
		"PAYPAL-AUTH-ALGO":         r.Header.Get("PAYPAL-AUTH-ALGO"),
		"PAYPAL-CERT-URL":          r.Header.Get("PAYPAL-CERT-URL"),
		"PAYPAL-TRANSMISSION-ID":   r.Header.Get("PAYPAL-TRANSMISSION-ID"),
		"PAYPAL-TRANSMISSION-SIG":  r.Header.Get("PAYPAL-TRANSMISSION-SIG"),
		"PAYPAL-TRANSMISSION-TIME": r.Header.Get("PAYPAL-TRANSMISSION-TIME"),
	}

	verifyPayload := map[string]interface{}{
		"auth_algo":         headers["PAYPAL-AUTH-ALGO"],
		"cert_url":          headers["PAYPAL-CERT-URL"],
		"transmission_id":   headers["PAYPAL-TRANSMISSION-ID"],
		"transmission_sig":  headers["PAYPAL-TRANSMISSION-SIG"],
		"transmission_time": headers["PAYPAL-TRANSMISSION-TIME"],
		"webhook_id":        p.webhookID,
		"webhook_event":     json.RawMessage(body),
	}

	jsonPayload, _ := json.Marshal(verifyPayload)
	apiReq, err := http.NewRequestWithContext(ctx, "POST", p.baseURL+"/v1/notifications/verify-webhook-signature", bytes.NewReader(jsonPayload))
	if err != nil {
		return false, fmt.Errorf("failed to create verification request: %w", err)
	}
	apiReq.Header.Set("Content-Type", "application/json")
	apiReq.Header.Set("Authorization", "Bearer "+token)

	resp, err := p.httpClient.Do(apiReq)
	if err != nil {
		return false, fmt.Errorf("failed to verify webhook: %w", err)
	}
	defer resp.Body.Close()

	var verifyResult struct {
		VerificationStatus string `json:"verification_status"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&verifyResult); err != nil {
		return false, fmt.Errorf("failed to decode verification response: %w", err)
	}

	return verifyResult.VerificationStatus == "SUCCESS", nil
}

func (p *PayPalProvider) HandleWebhook(ctx context.Context, r *http.Request) (*WebhookResult, error) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read webhook body: %w", err)
	}

	// Verify webhook signature
	valid, err := p.verifyWebhookSignature(ctx, r, body)
	if err != nil {
		return nil, fmt.Errorf("webhook signature verification error: %w", err)
	}
	if !valid {
		return nil, errors.New("invalid PayPal webhook signature")
	}

	var event struct {
		EventType string `json:"event_type"`
		Resource  struct {
			ID     string `json:"id"`
			Status string `json:"status"`
			Amount struct {
				CurrencyCode string `json:"currency_code"`
				Value        string `json:"value"`
			} `json:"amount"`
			PurchaseUnits []struct {
				ReferenceID string `json:"reference_id"`
			} `json:"purchase_units"`
			CreateTime string `json:"create_time"`
		} `json:"resource"`
	}
	if err := json.Unmarshal(body, &event); err != nil {
		return nil, fmt.Errorf("failed to parse webhook event: %w", err)
	}

	reference := ""
	if len(event.Resource.PurchaseUnits) > 0 {
		reference = event.Resource.PurchaseUnits[0].ReferenceID
	}

	// Map PayPal event types to our status
	status := "pending"
	switch event.EventType {
	case "CHECKOUT.ORDER.APPROVED":
		status = "pending" // needs capture
	case "PAYMENT.CAPTURE.COMPLETED":
		status = "completed"
	case "PAYMENT.CAPTURE.DENIED", "PAYMENT.CAPTURE.REFUNDED":
		status = "failed"
	case "CHECKOUT.ORDER.VOIDED":
		status = "cancelled"
	}

	amount, _ := parseFloat(event.Resource.Amount.Value)

	return &WebhookResult{
		Processed:   true,
		Status:      status,
		ProviderRef: event.Resource.ID,
		Reference:   reference,
		Amount:      amount,
		Currency:    event.Resource.Amount.CurrencyCode,
	}, nil
}

func (p *PayPalProvider) GetPaymentMethods() []PaymentMethodInfo {
	return []PaymentMethodInfo{
		{
			Code:        "paypal",
			Name:        "PayPal",
			Description: "Pay with PayPal or Credit/Debit Card (International)",
			Icon:        "paypal",
		},
	}
}
