package handlers

import (
	"net/http"
	"strconv"

	"backend/internal/services"
	"backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// MarketplaceHandler handles marketplace-related API endpoints
type MarketplaceHandler struct {
	marketplaceService *services.MarketplaceService
}

// NewMarketplaceHandler creates a new marketplace handler
func NewMarketplaceHandler(marketplaceService *services.MarketplaceService) *MarketplaceHandler {
	return &MarketplaceHandler{
		marketplaceService: marketplaceService,
	}
}

// GetMarketplaceListings gets property listings from external marketplaces
// @Router /properties/:id/marketplace-listings [get]
func (h *MarketplaceHandler) GetMarketplaceListings(c *gin.Context) {
	propertyID := c.Param("id")

	listings, err := h.marketplaceService.GetListingsForProperty(c.Request.Context(), propertyID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve marketplace listings", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Marketplace listings retrieved", gin.H{
		"listings": listings,
		"count":    len(listings),
	})
}

// SyncMarketplaceAPIs synchronizes property data with external marketplaces
// @Router /properties/:id/sync-marketplace [post]
func (h *MarketplaceHandler) SyncMarketplaceAPIs(c *gin.Context) {
	propertyID := c.Param("id")
	userID := c.MustGet("user_id").(string)

	result, err := h.marketplaceService.SyncPropertyWithMarketplaces(c.Request.Context(), propertyID, userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Marketplace sync failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Marketplace sync completed", result)
}

// GetPropertyListingsOnSale retrieves all properties on sale in marketplace
// @Router /marketplace/properties-for-sale [get]
func (h *MarketplaceHandler) GetPropertyListingsOnSale(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	listings, total, err := h.marketplaceService.GetAllPropertiesOnSale(c.Request.Context(), page, limit)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve listings", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Properties on sale retrieved", gin.H{
		"data":  listings,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}
