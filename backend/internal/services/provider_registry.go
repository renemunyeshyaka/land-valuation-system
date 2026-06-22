package services

import (
	"context"
	"fmt"
	"net/http"
	"sync"
)

// ProviderRegistry manages all registered payment providers.
type ProviderRegistry struct {
	mu        sync.RWMutex
	providers map[string]PaymentProvider
}

// NewProviderRegistry creates a new registry and registers default providers.
func NewProviderRegistry() *ProviderRegistry {
	r := &ProviderRegistry{
		providers: make(map[string]PaymentProvider),
	}

	// Register default providers
	pesapal := NewPesapalProvider()
	paypal := NewPayPalProvider()

	r.Register(pesapal)
	r.Register(paypal)

	return r
}

// Register adds a payment provider to the registry.
func (r *ProviderRegistry) Register(p PaymentProvider) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.providers[p.Name()] = p
}

// Get returns a provider by name.
func (r *ProviderRegistry) Get(name string) (PaymentProvider, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	p, ok := r.providers[name]
	if !ok {
		return nil, fmt.Errorf("payment provider %q not found", name)
	}
	return p, nil
}

// GetAll returns all registered providers.
func (r *ProviderRegistry) GetAll() []PaymentProvider {
	r.mu.RLock()
	defer r.mu.RUnlock()
	result := make([]PaymentProvider, 0, len(r.providers))
	for _, p := range r.providers {
		result = append(result, p)
	}
	return result
}

// GetAvailableMethods returns all payment methods from all providers.
func (r *ProviderRegistry) GetAvailableMethods() []PaymentMethodInfo {
	var methods []PaymentMethodInfo
	for _, p := range r.GetAll() {
		methods = append(methods, p.GetPaymentMethods()...)
	}
	return methods
}

// InitiatePayment delegates to the specified provider.
func (r *ProviderRegistry) InitiatePayment(ctx context.Context, providerName string, req *ProviderPaymentRequest) (*ProviderPaymentResponse, error) {
	p, err := r.Get(providerName)
	if err != nil {
		return nil, err
	}
	return p.InitiatePayment(ctx, req)
}

// HandleWebhook dispatches to the appropriate provider based on URL path or headers.
func (r *ProviderRegistry) HandleWebhook(ctx context.Context, providerName string, httpReq *http.Request) (*WebhookResult, error) {
	p, err := r.Get(providerName)
	if err != nil {
		return nil, err
	}
	return p.HandleWebhook(ctx, httpReq)
}
