package services

import (
	"context"
	"net/http"
)

// PaymentProvider defines the interface that all payment providers must implement.
type PaymentProvider interface {
	// Name returns the provider identifier (e.g. "pesapal", "paypal")
	Name() string

	// InitiatePayment creates a new payment and returns a redirect URL or checkout data.
	InitiatePayment(ctx context.Context, req *ProviderPaymentRequest) (*ProviderPaymentResponse, error)

	// VerifyPayment checks the status of an existing payment/transaction.
	VerifyPayment(ctx context.Context, transactionID string) (*ProviderPaymentStatus, error)

	// HandleWebhook processes an incoming webhook/IPN request from the provider.
	HandleWebhook(ctx context.Context, r *http.Request) (*WebhookResult, error)

	// GetPaymentMethods returns the list of payment methods this provider offers.
	GetPaymentMethods() []PaymentMethodInfo
}

// ProviderPaymentRequest contains common fields for initiating a payment.
type ProviderPaymentRequest struct {
	Amount      float64 `json:"amount"`
	Currency    string  `json:"currency"`
	Description string  `json:"description"`
	Reference   string  `json:"reference"` // internal transaction reference
	ReturnURL   string  `json:"return_url"`
	CancelURL   string  `json:"cancel_url"`
	IPNURL      string  `json:"ipn_url"`
	CustomerEmail string `json:"customer_email"`
	CustomerPhone string `json:"customer_phone"`
	CustomerName  string `json:"customer_name"`
}

// ProviderPaymentResponse is returned after initiating a payment.
type ProviderPaymentResponse struct {
	Success       bool   `json:"success"`
	RedirectURL   string `json:"redirect_url,omitempty"`
	CheckoutURL   string `json:"checkout_url,omitempty"`
	ProviderRef   string `json:"provider_ref"`   // provider's transaction ID
	PaymentMethod string `json:"payment_method"` // e.g. "pesapal", "paypal"
	Message       string `json:"message,omitempty"`
}

// ProviderPaymentStatus represents the status of a payment from the provider.
type ProviderPaymentStatus struct {
	ProviderRef     string `json:"provider_ref"`
	Status          string `json:"status"` // completed, pending, failed, cancelled
	Amount          float64 `json:"amount"`
	Currency        string `json:"currency"`
	PaymentMethod   string `json:"payment_method"`
	PaidAt          string `json:"paid_at,omitempty"`
	FailureReason   string `json:"failure_reason,omitempty"`
}

// WebhookResult is returned after processing a webhook.
type WebhookResult struct {
	Processed   bool   `json:"processed"`
	Status      string `json:"status"` // completed, pending, failed
	ProviderRef string `json:"provider_ref"`
	Reference   string `json:"reference"` // internal transaction reference
	Amount      float64 `json:"amount"`
	Currency    string `json:"currency"`
}

// PaymentMethodInfo describes a payment method option.
type PaymentMethodInfo struct {
	Code        string `json:"code"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Icon        string `json:"icon,omitempty"`
}
