package handlers

import (
	"fmt"
	"net/http"
	"strings"

	"backend/internal/services"
	"backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type CurrencyHandler struct {
	currencyService *services.CurrencyService
}

func NewCurrencyHandler(currencyService *services.CurrencyService) *CurrencyHandler {
	return &CurrencyHandler{
		currencyService: currencyService,
	}
}

// GetCurrencies returns all active currencies
// @Summary Get all active currencies
// @Description Returns list of supported currencies with exchange rates
// @Tags currencies
// @Produce json
// @Success 200 {object} utils.APIResponse
// @Router /currencies [get]
func (h *CurrencyHandler) GetCurrencies(c *gin.Context) {
	currencies, err := h.currencyService.GetAllCurrencies(c.Request.Context())
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve currencies", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Currencies retrieved successfully", currencies)
}

// GetCurrency returns a single currency by ISO code
// @Summary Get currency by ISO code
// @Tags currencies
// @Produce json
// @Param code path string true "ISO currency code (e.g., USD, EUR)"
// @Success 200 {object} utils.APIResponse
// @Router /currencies/{code} [get]
func (h *CurrencyHandler) GetCurrency(c *gin.Context) {
	code := strings.ToUpper(c.Param("code"))
	if code == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Currency code is required", "")
		return
	}

	currency, err := h.currencyService.GetCurrency(c.Request.Context(), code)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Currency not found", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Currency retrieved successfully", currency)
}

// SyncExchangeRates manually triggers an exchange rate sync
// @Summary Sync exchange rates from external API
// @Tags currencies
// @Produce json
// @Success 200 {object} utils.APIResponse
// @Router /currencies/sync [post]
func (h *CurrencyHandler) SyncExchangeRates(c *gin.Context) {
	if err := h.currencyService.SyncExchangeRates(c.Request.Context()); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to sync exchange rates", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Exchange rates synced successfully", nil)
}

// ConvertAmount converts an amount between currencies
// @Summary Convert amount between currencies
// @Tags currencies
// @Produce json
// @Param from query string true "Source currency ISO code"
// @Param to query string true "Target currency ISO code"
// @Param amount query number true "Amount to convert"
// @Success 200 {object} utils.APIResponse
// @Router /currencies/convert [get]
func (h *CurrencyHandler) ConvertAmount(c *gin.Context) {
	from := strings.ToUpper(c.Query("from"))
	to := strings.ToUpper(c.Query("to"))

	// Parse amount from query
	var amountFloat float64
	if _, err := fmt.Sscanf(c.Query("amount"), "%f", &amountFloat); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid amount", err.Error())
		return
	}

	if from == "" || to == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Both 'from' and 'to' currency codes are required", "")
		return
	}

	converted, err := h.currencyService.ConvertAmount(c.Request.Context(), amountFloat, from, to)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Conversion failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Amount converted successfully", gin.H{
		"from":             from,
		"to":               to,
		"original_amount":  amountFloat,
		"converted_amount": converted,
	})
}
