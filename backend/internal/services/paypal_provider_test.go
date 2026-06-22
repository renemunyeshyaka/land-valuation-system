package services

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestPayPalProvider_InitiatePayment_NoCredentials tests that InitiatePayment errors without credentials.
func TestPayPalProvider_InitiatePayment_NoCredentials(t *testing.T) {
	t.Setenv("PAYPAL_CLIENT_ID", "")
	t.Setenv("PAYPAL_CLIENT_SECRET", "")

	p := NewPayPalProvider()
	req := &ProviderPaymentRequest{
		Amount:      5000,
		Currency:    "USD",
		Description: "Test payment",
		Reference:   "ref-123",
	}

	resp, err := p.InitiatePayment(context.Background(), req)
	assert.Error(t, err)
	assert.Nil(t, resp)
	assert.Contains(t, err.Error(), "PayPal client ID or secret not configured")
}

// TestPayPalProvider_GetPaymentMethods verifies the returned payment methods.
func TestPayPalProvider_GetPaymentMethods(t *testing.T) {
	p := NewPayPalProvider()
	methods := p.GetPaymentMethods()
	require.Len(t, methods, 1)
	assert.Equal(t, "paypal", methods[0].Code)
	assert.Equal(t, "PayPal", methods[0].Name)
	assert.Contains(t, methods[0].Description, "International")
}

// TestPayPalProvider_Name verifies the provider name.
func TestPayPalProvider_Name(t *testing.T) {
	p := NewPayPalProvider()
	assert.Equal(t, "paypal", p.Name())
}

// TestPayPalProvider_InitiatePayment_WithMockServer tests the full PayPal order creation with a mock server.
func TestPayPalProvider_InitiatePayment_WithMockServer(t *testing.T) {
	callCount := 0
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount++
		switch {
		case strings.Contains(r.URL.Path, "oauth2/token"):
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"access_token": "mock-access-token",
				"expires_in":   32400,
			})
		case strings.Contains(r.URL.Path, "v2/checkout/orders"):
			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"id":     "PAYPAL-ORDER-123",
				"status": "CREATED",
				"links": []map[string]interface{}{
					{
						"href":   "https://www.sandbox.paypal.com/checkoutnow?token=PAYPAL-ORDER-123",
						"rel":    "payer-action",
						"method": "GET",
					},
				},
			})
		default:
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "NOT_FOUND"})
		}
	}))
	defer mockServer.Close()

	t.Setenv("PAYPAL_CLIENT_ID", "test-client-id")
	t.Setenv("PAYPAL_CLIENT_SECRET", "test-client-secret")
	t.Setenv("PAYPAL_RETURN_URL", "http://localhost:3001/dashboard/subscription?payment=success")
	t.Setenv("PAYPAL_CANCEL_URL", "http://localhost:3001/subscribe?payment=cancelled")
	t.Setenv("PAYPAL_BRAND_NAME", "LandVal")

	p := NewPayPalProvider()
	p.baseURL = mockServer.URL

	req := &ProviderPaymentRequest{
		Amount:        99.99,
		Currency:      "USD",
		Description:   "Professional Plan - Monthly Subscription",
		Reference:     "ref-paypal-123",
		CustomerEmail: "buyer@example.com",
		CustomerName:  "Test Buyer",
	}

	resp, err := p.InitiatePayment(context.Background(), req)
	require.NoError(t, err)
	require.NotNil(t, resp)
	assert.True(t, resp.Success)
	assert.Equal(t, "https://www.sandbox.paypal.com/checkoutnow?token=PAYPAL-ORDER-123", resp.RedirectURL)
	assert.Equal(t, "PAYPAL-ORDER-123", resp.ProviderRef)
	assert.Equal(t, "paypal", resp.PaymentMethod)
	assert.Equal(t, 2, callCount) // token request + order creation
}

// TestPayPalProvider_CapturePayment_WithMockServer tests capturing an approved order.
func TestPayPalProvider_CapturePayment_WithMockServer(t *testing.T) {
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.Contains(r.URL.Path, "oauth2/token"):
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"access_token": "mock-token",
				"expires_in":   32400,
			})
		case strings.Contains(r.URL.Path, "capture"):
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"id":     "CAPTURE-123",
				"status": "COMPLETED",
				"purchase_units": []map[string]interface{}{
					{
						"payments": map[string]interface{}{
							"captures": []map[string]interface{}{
								{
									"id":     "CAPTURE-123",
									"status": "COMPLETED",
									"amount": map[string]interface{}{
										"currency_code": "USD",
										"value":         "99.99",
									},
									"create_time": "2026-06-22T12:00:00Z",
								},
							},
						},
					},
				},
			})
		default:
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "NOT_FOUND"})
		}
	}))
	defer mockServer.Close()

	t.Setenv("PAYPAL_CLIENT_ID", "test-client-id")
	t.Setenv("PAYPAL_CLIENT_SECRET", "test-client-secret")

	p := NewPayPalProvider()
	p.baseURL = mockServer.URL

	status, err := p.CapturePayment(context.Background(), "PAYPAL-ORDER-123")
	require.NoError(t, err)
	require.NotNil(t, status)
	assert.Equal(t, "completed", status.Status)
	assert.Equal(t, "CAPTURE-123", status.ProviderRef)
	assert.Equal(t, 99.99, status.Amount)
	assert.Equal(t, "USD", status.Currency)
}

// TestPayPalProvider_VerifyPayment_WithMockServer tests order status query.
func TestPayPalProvider_VerifyPayment_WithMockServer(t *testing.T) {
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.Contains(r.URL.Path, "oauth2/token"):
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"access_token": "mock-token",
				"expires_in":   32400,
			})
		case strings.Contains(r.URL.Path, "v2/checkout/orders"):
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"id":     "PAYPAL-ORDER-123",
				"status": "APPROVED",
				"purchase_units": []map[string]interface{}{
					{
						"amount": map[string]interface{}{
							"currency_code": "USD",
							"value":         "99.99",
						},
					},
				},
			})
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer mockServer.Close()

	t.Setenv("PAYPAL_CLIENT_ID", "test-client-id")
	t.Setenv("PAYPAL_CLIENT_SECRET", "test-client-secret")

	p := NewPayPalProvider()
	p.baseURL = mockServer.URL

	status, err := p.VerifyPayment(context.Background(), "PAYPAL-ORDER-123")
	require.NoError(t, err)
	require.NotNil(t, status)
	assert.Equal(t, "completed", status.Status)
	assert.Equal(t, "PAYPAL-ORDER-123", status.ProviderRef)
	assert.Equal(t, 99.99, status.Amount)
}

// TestPayPalProvider_HandleWebhook_InvalidSignature tests webhook with missing headers.
func TestPayPalProvider_HandleWebhook_InvalidSignature(t *testing.T) {
	t.Setenv("PAYPAL_CLIENT_ID", "test-client-id")
	t.Setenv("PAYPAL_CLIENT_SECRET", "test-client-secret")
	t.Setenv("PAYPAL_WEBHOOK_ID", "test-webhook-id")

	p := NewPayPalProvider()
	body := `{"event_type":"PAYMENT.CAPTURE.COMPLETED","resource":{"id":"CAP-123"}}`
	r := httptest.NewRequest(http.MethodPost, "/api/v1/payments/paypal/webhook", strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")

	result, err := p.HandleWebhook(context.Background(), r)
	// Should fail because webhook signature verification requires PayPal headers
	assert.Error(t, err)
	assert.Nil(t, result)
}

// TestParseFloat verifies the parseFloat helper.
func TestParseFloat(t *testing.T) {
	v, err := parseFloat("99.99")
	assert.NoError(t, err)
	assert.Equal(t, 99.99, v)

	v, err = parseFloat("0")
	assert.NoError(t, err)
	assert.Equal(t, 0.0, v)

	v, err = parseFloat("invalid")
	assert.Error(t, err)
	assert.Equal(t, 0.0, v)
}
