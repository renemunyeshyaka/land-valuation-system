package currency

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/go-redis/redis/v8"
)

// ExchangeRateService fetches and caches live currency exchange rates
type ExchangeRateService struct {
	redisClient  *redis.Client
	httpClient   *http.Client
	apiURL       string
	cacheTTL     time.Duration
	fallbackRate float64 // Fallback rate if API fails
}

// ExchangeRateResponse from ExchangeRate-API
type ExchangeRateResponse struct {
	Base  string             `json:"base"`
	Date  string             `json:"date"`
	Rates map[string]float64 `json:"rates"`
}

// NewExchangeRateService creates a new exchange rate service
func NewExchangeRateService(redisClient *redis.Client) *ExchangeRateService {
	return &ExchangeRateService{
		redisClient: redisClient,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
		// Using ExchangeRate-API (free, accurate, 1,500 req/month)
		// Alternative: https://open.er-api.com/v6/latest/USD
		apiURL:       "https://api.exchangerate-api.com/v4/latest/USD",
		cacheTTL:     6 * time.Hour, // Update every 6 hours (4 times/day = 120/month)
		fallbackRate: 0.000682,      // 1 RWF = 0.000682 USD (1/1466 - fallback if API fails)
	}
}

// GetUSDToRWFRate returns the current USD to RWF exchange rate
func (s *ExchangeRateService) GetUSDToRWFRate(ctx context.Context) (float64, error) {
	// Try to get from Redis cache first
	cacheKey := "exchange_rate:USD:RWF"

	if s.redisClient != nil {
		cachedRate, err := s.redisClient.Get(ctx, cacheKey).Result()
		if err == nil {
			rate, parseErr := strconv.ParseFloat(cachedRate, 64)
			if parseErr == nil {
				return rate, nil
			}
		}
	}

	// Fetch from API if not in cache
	rate, err := s.fetchUSDToRWF(ctx)
	if err != nil {
		// Return fallback rate if API fails
		return 1 / s.fallbackRate, nil // Convert RWF to USD rate to USD to RWF rate
	}

	// Cache the result
	if s.redisClient != nil {
		s.redisClient.Set(ctx, cacheKey, fmt.Sprintf("%.6f", rate), s.cacheTTL)
	}

	return rate, nil
}

// GetRWFToUSDRate returns the current RWF to USD exchange rate
func (s *ExchangeRateService) GetRWFToUSDRate(ctx context.Context) (float64, error) {
	usdToRwf, err := s.GetUSDToRWFRate(ctx)
	if err != nil {
		return s.fallbackRate, nil
	}

	// Convert USD to RWF rate to RWF to USD rate
	rwfToUsd := 1 / usdToRwf
	return rwfToUsd, nil
}

// ConvertRWFToUSD converts Rwandan Francs to US Dollars
func (s *ExchangeRateService) ConvertRWFToUSD(ctx context.Context, rwfAmount float64) (float64, float64, error) {
	rwfToUsd, err := s.GetRWFToUSDRate(ctx)
	if err != nil {
		return 0, 0, err
	}

	usdAmount := rwfAmount * rwfToUsd
	return usdAmount, rwfToUsd, nil
}

// ConvertUSDToRWF converts US Dollars to Rwandan Francs
func (s *ExchangeRateService) ConvertUSDToRWF(ctx context.Context, usdAmount float64) (float64, float64, error) {
	usdToRwf, err := s.GetUSDToRWFRate(ctx)
	if err != nil {
		return 0, 0, err
	}

	rwfAmount := usdAmount * usdToRwf
	return rwfAmount, usdToRwf, nil
}

// fetchUSDToRWF fetches live USD to RWF rate from API
func (s *ExchangeRateService) fetchUSDToRWF(ctx context.Context) (float64, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", s.apiURL, nil)
	if err != nil {
		return 0, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return 0, fmt.Errorf("failed to fetch exchange rates: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, fmt.Errorf("failed to read response: %w", err)
	}

	var rateData ExchangeRateResponse
	if err := json.Unmarshal(body, &rateData); err != nil {
		return 0, fmt.Errorf("failed to parse response: %w", err)
	}

	// Get RWF rate from response
	rwfRate, exists := rateData.Rates["RWF"]
	if !exists {
		return 0, fmt.Errorf("RWF rate not found in response")
	}

	return rwfRate, nil
}

// GetExchangeRateInfo returns formatted exchange rate information
func (s *ExchangeRateService) GetExchangeRateInfo(ctx context.Context) (map[string]interface{}, error) {
	usdToRwf, err := s.GetUSDToRWFRate(ctx)
	if err != nil {
		return nil, err
	}

	rwfToUsd := 1 / usdToRwf

	return map[string]interface{}{
		"usd_to_rwf": usdToRwf,
		"rwf_to_usd": rwfToUsd,
		"timestamp":  time.Now().UTC().Format(time.RFC3339),
		"formatted": map[string]string{
			"usd_to_rwf": fmt.Sprintf("1 USD = %.2f RWF", usdToRwf),
			"rwf_to_usd": fmt.Sprintf("1 RWF = %.6f USD", rwfToUsd),
		},
	}, nil
}

// RefreshCache forces a refresh of the cached exchange rate
func (s *ExchangeRateService) RefreshCache(ctx context.Context) error {
	rate, err := s.fetchUSDToRWF(ctx)
	if err != nil {
		return err
	}

	if s.redisClient != nil {
		cacheKey := "exchange_rate:USD:RWF"
		return s.redisClient.Set(ctx, cacheKey, fmt.Sprintf("%.6f", rate), s.cacheTTL).Err()
	}

	return nil
}
