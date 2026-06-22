package services

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestPesapalProvider_InitiatePayment_NoCredentials tests that InitiatePayment returns an error
// when credentials are not configured.
func TestPesapalProvider_InitiatePayment_NoCredentials(t *testing.T) {
	// Temporarily clear env vars
	t.Setenv("PESAPAL_CONSUMER_KEY", "")
	t.Setenv("PESAPAL_CONSUMER_SECRET", "")

	p := NewPesapalProvider()
	req := &ProviderPaymentRequest{
		Amount:      5000,
		Currency:    "USD",
		Description: "Test payment",
		Reference:   "ref-123",
	}

	resp, err := p.InitiatePayment(context.Background(), req)
	assert.Error(t, err)
	assert.Nil(t, resp)
	assert.Contains(t, err.Error(), "PesaPal consumer key or secret not configured")
}

// TestPesapalProvider_GetPaymentMethods verifies the returned payment methods.
func TestPesapalProvider_GetPaymentMethods(t *testing.T) {
	p := NewPesapalProvider()
	methods := p.GetPaymentMethods()
	require.Len(t, methods, 1)
	assert.Equal(t, "pesapal", methods[0].Code)
	assert.Equal(t, "PesaPal", methods[0].Name)
	assert.Contains(t, methods[0].Description, "East Africa")
}

// TestPesapalProvider_Name verifies the provider name.
func TestPesapalProvider_Name(t *testing.T) {
	p := NewPesapalProvider()
	assert.Equal(t, "pesapal", p.Name())
}

// TestPesapalProvider_VerifyPayment_NoCredentials tests that VerifyPayment errors without credentials.
func TestPesapalProvider_VerifyPayment_NoCredentials(t *testing.T) {
	t.Setenv("PESAPAL_CONSUMER_KEY", "")
	t.Setenv("PESAPAL_CONSUMER_SECRET", "")

	p := NewPesapalProvider()
	status, err := p.VerifyPayment(context.Background(), "order-123")
	assert.Error(t, err)
	assert.Nil(t, status)
	assert.Contains(t, err.Error(), "PesaPal consumer key or secret not configured")
}

// TestPesapalProvider_HandleWebhook_MissingParams tests IPN with missing OrderTrackingId.
func TestPesapalProvider_HandleWebhook_MissingParams(t *testing.T) {
	t.Setenv("PESAPAL_CONSUMER_KEY", "test-key")
	t.Setenv("PESAPAL_CONSUMER_SECRET", "test-secret")

	p := NewPesapalProvider()
	r := httptest.NewRequest(http.MethodPost, "/api/payments/pesapal/ipn", nil)
	r.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	result, err := p.HandleWebhook(context.Background(), r)
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "missing OrderTrackingId")
}

// TestProviderRegistry_RegisterAndGet tests basic registry operations.
func TestProviderRegistry_RegisterAndGet(t *testing.T) {
	registry := NewProviderRegistry()

	// Providers should be auto-registered
	p, err := registry.Get("pesapal")
	assert.NoError(t, err)
	assert.Equal(t, "pesapal", p.Name())

	p, err = registry.Get("paypal")
	assert.NoError(t, err)
	assert.Equal(t, "paypal", p.Name())

	// Unknown provider
	_, err = registry.Get("nonexistent")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not found")
}

// TestProviderRegistry_GetAvailableMethods verifies methods from all providers.
func TestProviderRegistry_GetAvailableMethods(t *testing.T) {
	registry := NewProviderRegistry()
	methods := registry.GetAvailableMethods()
	require.Len(t, methods, 2)

	codes := make([]string, len(methods))
	for i, m := range methods {
		codes[i] = m.Code
	}
	assert.Contains(t, codes, "pesapal")
	assert.Contains(t, codes, "paypal")
}

// TestProviderRegistry_InitiatePayment_UnknownProvider tests error for unknown provider.
func TestProviderRegistry_InitiatePayment_UnknownProvider(t *testing.T) {
	registry := NewProviderRegistry()
	_, err := registry.InitiatePayment(context.Background(), "nonexistent", &ProviderPaymentRequest{})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not found")
}

// TestPesapalProvider_InitiatePayment_WithMockServer tests the full flow with a mock server.
func TestPesapalProvider_InitiatePayment_WithMockServer(t *testing.T) {
	// Create a mock server that simulates PesaPal's API
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/api/Auth/RequestToken":
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"token":       "mock-token-123",
				"expiry_date": "2027-01-01",
				"error":       false,
			})
		case "/api/URLSetup/RegisterIPN":
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"status":        "200",
				"ipn_id":        "ipn-456",
				"error":         false,
				"error_message": "",
			})
		case "/api/Transactions/SubmitOrderRequest":
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"status":             "200",
				"redirect_url":       "https://sandbox.pesapal.com/checkout?token=mock",
				"order_tracking_id":  "order-789",
				"merchant_reference": "ref-123",
				"error":              false,
				"error_message":      "",
			})
		default:
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "not found"})
		}
	}))
	defer mockServer.Close()

	t.Setenv("PESAPAL_CONSUMER_KEY", "test-consumer-key")
	t.Setenv("PESAPAL_CONSUMER_SECRET", "test-consumer-secret")
	t.Setenv("PESAPAL_CALLBACK_URL", "http://localhost:3001/payment/callback")
	t.Setenv("PESAPAL_IPN_URL", "http://localhost:5001/api/payments/pesapal/ipn")

	p := NewPesapalProvider()
	p.baseURL = mockServer.URL

	req := &ProviderPaymentRequest{
		Amount:        5000,
		Currency:      "USD",
		Description:   "Test subscription",
		Reference:     "ref-123",
		CustomerEmail: "test@example.com",
		CustomerName:  "Test User",
	}

	resp, err := p.InitiatePayment(context.Background(), req)
	require.NoError(t, err)
	require.NotNil(t, resp)
	assert.True(t, resp.Success)
	assert.Equal(t, "https://sandbox.pesapal.com/checkout?token=mock", resp.RedirectURL)
	assert.Equal(t, "order-789", resp.ProviderRef)
	assert.Equal(t, "pesapal", resp.PaymentMethod)
}

// TestPesapalProvider_VerifyPayment_WithMockServer tests payment status with a mock server.
func TestPesapalProvider_VerifyPayment_WithMockServer(t *testing.T) {
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":                      "completed",
			"payment_method":              "mobile_money",
			"amount":                      5000.0,
			"currency":                    "USD",
			"order_tracking_id":           "order-789",
			"merchant_reference":          "ref-123",
			"payment_status_description":  "Payment completed successfully",
			"error":                       false,
		})
	}))
	defer mockServer.Close()

	t.Setenv("PESAPAL_CONSUMER_KEY", "test-consumer-key")
	t.Setenv("PESAPAL_CONSUMER_SECRET", "test-consumer-secret")

	p := NewPesapalProvider()
	p.baseURL = mockServer.URL

	status, err := p.VerifyPayment(context.Background(), "order-789")
	require.NoError(t, err)
	require.NotNil(t, status)
	assert.Equal(t, "completed", status.Status)
	assert.Equal(t, 5000.0, status.Amount)
	assert.Equal(t, "order-789", status.ProviderRef)
}
