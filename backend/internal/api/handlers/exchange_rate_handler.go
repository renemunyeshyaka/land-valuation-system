package handlers

import (
	"fmt"
	"net/http"

	"backend/pkg/currency"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
)

type ExchangeRateHandler struct {
	exchangeRate *currency.ExchangeRateService
}

func NewExchangeRateHandler(redisClient *redis.Client) *ExchangeRateHandler {
	return &ExchangeRateHandler{
		exchangeRate: currency.NewExchangeRateService(redisClient),
	}
}

// GetCurrentRate returns the current USD/RWF exchange rate
// @Summary Get current USD/RWF exchange rate
// @Description Returns live exchange rate information for USD and RWF
// @Tags currency
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/exchange-rate [get]
func (h *ExchangeRateHandler) GetCurrentRate(c *gin.Context) {
	rateInfo, err := h.exchangeRate.GetExchangeRateInfo(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch exchange rate",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    rateInfo,
	})
}

// ConvertCurrency converts between USD and RWF
// @Summary Convert between USD and RWF
// @Description Convert an amount from one currency to another
// @Tags currency
// @Accept json
// @Produce json
// @Param amount query number true "Amount to convert"
// @Param from query string true "Source currency (USD or RWF)"
// @Param to query string true "Target currency (USD or RWF)"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/exchange-rate/convert [get]
func (h *ExchangeRateHandler) ConvertCurrency(c *gin.Context) {
	var req struct {
		Amount float64 `form:"amount" binding:"required,gt=0"`
		From   string  `form:"from" binding:"required"`
		To     string  `form:"to" binding:"required"`
	}

	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid parameters",
		})
		return
	}

	// Validate currencies
	if (req.From != "USD" && req.From != "RWF") || (req.To != "USD" && req.To != "RWF") {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Supported currencies are USD and RWF",
		})
		return
	}

	var convertedAmount float64
	var rate float64
	var err error

	ctx := c.Request.Context()

	if req.From == "RWF" && req.To == "USD" {
		convertedAmount, rate, err = h.exchangeRate.ConvertRWFToUSD(ctx, req.Amount)
	} else if req.From == "USD" && req.To == "RWF" {
		convertedAmount, rate, err = h.exchangeRate.ConvertUSDToRWF(ctx, req.Amount)
	} else {
		// Same currency
		convertedAmount = req.Amount
		rate = 1.0
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Conversion failed",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"from_amount":   req.Amount,
			"from_currency": req.From,
			"to_amount":     convertedAmount,
			"to_currency":   req.To,
			"exchange_rate": rate,
			"formatted": gin.H{
				"input":  formatAmount(req.Amount, req.From),
				"output": formatAmount(convertedAmount, req.To),
			},
		},
	})
}

// RefreshRate forces a refresh of the cached exchange rate (admin only)
// @Summary Refresh exchange rate cache
// @Description Force refresh of the cached exchange rate
// @Tags currency
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/exchange-rate/refresh [post]
// @Security BearerAuth
func (h *ExchangeRateHandler) RefreshRate(c *gin.Context) {
	if err := h.exchangeRate.RefreshCache(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to refresh exchange rate",
		})
		return
	}

	rateInfo, err := h.exchangeRate.GetExchangeRateInfo(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get updated rate",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Exchange rate refreshed successfully",
		"data":    rateInfo,
	})
}

func formatAmount(amount float64, currency string) string {
	if currency == "RWF" {
		return fmt.Sprintf("RWF %.2f", amount)
	}
	return fmt.Sprintf("$%.2f", amount)
}
