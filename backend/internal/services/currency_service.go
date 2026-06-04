package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"backend/internal/models"
	"backend/internal/repository"
)

// ExchangeRateAPIResponse represents the response from ExchangeRate-API
type ExchangeRateAPIResponse struct {
	Result             string             `json:"result"`
	Documentation      string             `json:"documentation"`
	TermsOfUse         string             `json:"terms_of_use"`
	TimeLastUpdateUnix int64              `json:"time_last_update_unix"`
	TimeLastUpdateUTC  string             `json:"time_last_update_utc"`
	TimeNextUpdateUnix int64              `json:"time_next_update_unix"`
	TimeNextUpdateUTC  string             `json:"time_next_update_utc"`
	BaseCode           string             `json:"base_code"`
	ConversionRates    map[string]float64 `json:"conversion_rates"`
}

type CurrencyService struct {
	currencyRepo *repository.CurrencyRepository
	httpClient   *http.Client
	apiKey       string
}

func NewCurrencyService(currencyRepo *repository.CurrencyRepository) *CurrencyService {
	return &CurrencyService{
		currencyRepo: currencyRepo,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		apiKey: os.Getenv("EXCHANGE_RATE_API_KEY"),
	}
}

// GetAllCurrencies returns all active currencies
func (s *CurrencyService) GetAllCurrencies(ctx context.Context) ([]models.Currency, error) {
	return s.currencyRepo.GetAllActive(ctx)
}

// GetCurrency returns a single currency by code
func (s *CurrencyService) GetCurrency(ctx context.Context, code string) (*models.Currency, error) {
	return s.currencyRepo.GetByCode(ctx, code)
}

// GetBaseCurrency returns the base currency (RWF)
func (s *CurrencyService) GetBaseCurrency(ctx context.Context) (*models.Currency, error) {
	return s.currencyRepo.GetBaseCurrency(ctx)
}

// SyncExchangeRates fetches latest rates from ExchangeRate-API and updates the database.
// Uses USD as the base from the API, then converts to RWF rates.
func (s *CurrencyService) SyncExchangeRates(ctx context.Context) error {
	if s.apiKey == "" {
		log.Println("[CurrencyService] EXCHANGE_RATE_API_KEY not set — using default rates")
		return nil
	}

	// Fetch rates from API (USD-based)
	url := fmt.Sprintf("https://v6.exchangerate-api.com/v6/%s/latest/USD", s.apiKey)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create exchange rate request: %w", err)
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to fetch exchange rates: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read exchange rate response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("exchange rate API returned status %d: %s", resp.StatusCode, string(body))
	}

	var apiResp ExchangeRateAPIResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return fmt.Errorf("failed to parse exchange rate response: %w", err)
	}

	// Get RWF rate (how many RWF per 1 USD)
	usdToRwf, ok := apiResp.ConversionRates["RWF"]
	if !ok {
		return fmt.Errorf("RWF rate not found in exchange rate API response")
	}

	// Calculate rates: for each currency X, rate_to_RWF = (USD_to_RWF / USD_to_X)
	// Because API gives us USD-based rates
	rates := make(map[string]float64)
	for code, rateToUSD := range apiResp.ConversionRates {
		if rateToUSD <= 0 {
			continue
		}
		rateToRwf := usdToRwf / rateToUSD
		rates[code] = rateToRwf
	}
	// RWF to RWF is always 1
	rates["RWF"] = 1.0

	// Update all currencies in the database
	if err := s.currencyRepo.UpdateAllExchangeRates(ctx, rates); err != nil {
		return fmt.Errorf("failed to update exchange rates: %w", err)
	}

	log.Printf("[CurrencyService] Successfully synced %d exchange rates", len(rates))
	return nil
}

// ConvertAmount converts an amount from one currency to another
func (s *CurrencyService) ConvertAmount(ctx context.Context, amount float64, fromCurrency, toCurrency string) (float64, error) {
	from, err := s.currencyRepo.GetByCode(ctx, fromCurrency)
	if err != nil {
		return 0, fmt.Errorf("source currency %s not found: %w", fromCurrency, err)
	}

	to, err := s.currencyRepo.GetByCode(ctx, toCurrency)
	if err != nil {
		return 0, fmt.Errorf("target currency %s not found: %w", toCurrency, err)
	}

	// Convert: amount_in_RWF = amount * from_rate, then amount_in_target = amount_in_RWF / to_rate
	amountInRwf := amount * from.ExchangeRateToRWF
	converted := amountInRwf / to.ExchangeRateToRWF

	return converted, nil
}

// GetRegionDefaultCurrency returns the default currency ISO code for a region
func (s *CurrencyService) GetRegionDefaultCurrency(region string) string {
	regionDefaults := map[string]string{
		"RW": "RWF",
		"EU": "EUR",
		"US": "USD",
		"CA": "CAD",
		"GB": "GBP",
		"KE": "KES",
		"UG": "UGX",
		"TZ": "TZS",
		"CD": "CDF",
	}
	if currency, ok := regionDefaults[region]; ok {
		return currency
	}
	return "USD" // Default for rest of world
}
