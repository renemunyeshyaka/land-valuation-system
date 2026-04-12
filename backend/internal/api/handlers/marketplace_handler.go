package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"backend/internal/models"
	"backend/internal/services"
	"backend/internal/utils"

	"gorm.io/gorm"

	"github.com/gin-gonic/gin"
)

// MarketplaceHandler handles marketplace-related API endpoints
type MarketplaceHandler struct {
	marketplaceService *services.MarketplaceService
	db                 *gorm.DB
}

// Removed invalid GetDB method for undefined MarketplaceService type.

// NewMarketplaceHandler creates a new marketplace handler
func NewMarketplaceHandler(marketplaceService *services.MarketplaceService, db *gorm.DB) *MarketplaceHandler {
	return &MarketplaceHandler{
		marketplaceService: marketplaceService,
		db:                 db,
	}
}

// GetMarketplaceListings godoc
// @Summary Get marketplace listings for property
// @Description Retrieve property listings from external marketplace APIs
// @Tags marketplace
// @Produce json
// @Param id path string true "Property ID"
// @Success 200 {object} utils.APIResponse
// @Failure 404 {object} utils.APIResponse
// @Failure 500 {object} utils.APIResponse
// @Router /properties/{id}/marketplace-listings [get]
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

// SyncMarketplaceAPIs godoc
// @Summary Sync property with marketplaces
// @Description Synchronize property data with external marketplace platforms
// @Tags marketplace
// @Produce json
// @Security BearerAuth
// @Param id path string true "Property ID"
// @Success 200 {object} utils.APIResponse
// @Failure 401 {object} utils.APIResponse
// @Failure 404 {object} utils.APIResponse
// @Failure 500 {object} utils.APIResponse
// @Router /properties/{id}/sync-marketplace [post]
func (h *MarketplaceHandler) SyncMarketplaceAPIs(c *gin.Context) {
	propertyID := c.Param("id")
	userID := c.MustGet("user_id").(string)
	userType, _ := c.Get("user_type")
	isAdmin := userType == "admin"

	result, err := h.marketplaceService.SyncPropertyWithMarketplaces(c.Request.Context(), propertyID, userID, isAdmin)
	if err != nil {
		if errors.Is(err, services.ErrMarketplacePropertyNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Marketplace sync failed", err.Error())
			return
		}
		if errors.Is(err, services.ErrMarketplaceSyncForbidden) {
			utils.ErrorResponse(c, http.StatusForbidden, "Marketplace sync failed", err.Error())
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Marketplace sync failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Marketplace sync completed", result)
}

// GetPropertyListingsOnSale godoc
// @Summary Get all properties for sale
// @Description Retrieve paginated list of all properties available for sale on marketplace
// @Tags marketplace
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Success 200 {object} utils.APIResponse
// @Failure 500 {object} utils.APIResponse
// @Router /marketplace/properties-for-sale [get]
func (h *MarketplaceHandler) GetPropertyListingsOnSale(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	listings, total, err := h.marketplaceService.GetAllPropertiesOnSale(c.Request.Context(), page, limit)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve listings", err.Error())
		return
	}

	utils.SuccessPaginatedResponse(c, http.StatusOK, "Properties on sale retrieved", listings, total, page, limit)
}

// IncrementInterested godoc
// @Summary Increment interested count for a property
// @Description Increments the interested count for a property (public, no authentication required)
// @Tags marketplace
// @Produce json
// @Param id path string true "Property ID"
// @Success 200 {object} utils.APIResponse
// @Failure 404 {object} utils.APIResponse
// @Failure 500 {object} utils.APIResponse
// @Router /marketplace/properties/:id/interested [post]
func (h *MarketplaceHandler) IncrementInterested(c *gin.Context) {
	propertyID := c.Param("id")
	id, err := strconv.Atoi(propertyID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid property ID", err.Error())
		return
	}
	db := h.db
	if err := db.Model(&models.Property{}).Where("id = ?", id).Update("interested", gorm.Expr("interested + 1")).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Property not found", err.Error())
		return
	}
	var prop models.Property
	if err := db.First(&prop, id).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Property not found", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Interested count incremented", gin.H{"interested": prop.Interested})
}
