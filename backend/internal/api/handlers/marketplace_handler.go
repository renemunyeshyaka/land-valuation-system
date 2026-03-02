package handlers

import (
	"net/http"
	"strconv"

	"backend/internal/models"
	"backend/internal/services"
	"backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// parseUint safely converts string to uint
func parseUint(s string) uint {
	v, _ := strconv.ParseUint(s, 10, 64)
	return uint(v)
}

type PropertyHandler struct {
	propertyService    *services.ValuationService
	marketplaceService *services.MarketplaceService
}

func NewPropertyHandler(propertyService *services.ValuationService, marketplaceService *services.MarketplaceService) *PropertyHandler {
	return &PropertyHandler{
		propertyService:    propertyService,
		marketplaceService: marketplaceService,
	}
}

// ListProperties retrieves properties with filters
// @Router /properties [get]
func (h *PropertyHandler) ListProperties(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	propertyType := c.Query("type")
	status := c.Query("status")
	district := c.Query("district")

	properties, total, err := h.propertyService.ListProperties(c.Request.Context(), &models.PropertyFilter{
		Page:         page,
		Limit:        limit,
		PropertyType: propertyType,
		Status:       status,
		District:     district,
	})

	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve properties", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Properties retrieved", gin.H{
		"data":  properties,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// GetProperty retrieves a single property
// @Router /properties/:id [get]
func (h *PropertyHandler) GetProperty(c *gin.Context) {
	propertyID := c.Param("id")

	property, err := h.propertyService.GetPropertyByID(c.Request.Context(), propertyID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Property not found", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Property retrieved", property)
}

// CreateProperty creates a new property
// @Router /properties [post]
func (h *PropertyHandler) CreateProperty(c *gin.Context) {
	type CreatePropertyRequest struct {
		Title        string  `json:"title" binding:"required"`
		PropertyType string  `json:"property_type" binding:"required"`
		Address      string  `json:"address" binding:"required"`
		District     string  `json:"district" binding:"required"`
		AreaSquareM  float64 `json:"area_sqm" binding:"required,gt=0"`
		Latitude     float64 `json:"latitude" binding:"required"`
		Longitude    float64 `json:"longitude" binding:"required"`
		Description  string  `json:"description"`
		ZoningType   string  `json:"zoning_type"`
	}

	userID := c.MustGet("user_id").(string)

	var req CreatePropertyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	property := models.Property{
		OwnerID:      parseUint(userID),
		Title:        req.Title,
		PropertyType: req.PropertyType,
		Address:      req.Address,
		District:     req.District,
		AreaSqm:      req.AreaSquareM,
		Description:  req.Description,
		// ZoningType removed for compatibility
	}

	createdProperty, err := h.propertyService.CreateProperty(c.Request.Context(), property)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to create property", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Property created successfully", createdProperty)
}

// UpdateProperty updates a property
// @Router /properties/:id [put]
func (h *PropertyHandler) UpdateProperty(c *gin.Context) {
	propertyID := c.Param("id")
	userID := c.MustGet("user_id").(string)

	var req models.Property
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	property, err := h.propertyService.UpdateProperty(c.Request.Context(), propertyID, userID, &req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to update property", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Property updated successfully", property)
}

// DeleteProperty deletes a property
// @Router /properties/:id [delete]
func (h *PropertyHandler) DeleteProperty(c *gin.Context) {
	propertyID := c.Param("id")
	userID := c.MustGet("user_id").(string)

	if err := h.propertyService.DeleteProperty(c.Request.Context(), propertyID, userID); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to delete property", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Property deleted successfully", nil)
}

// SearchProperties searches properties by location
// @Router /properties/search [post]
func (h *PropertyHandler) SearchProperties(c *gin.Context) {
	type SearchRequest struct {
		Latitude  float64 `json:"latitude" binding:"required"`
		Longitude float64 `json:"longitude" binding:"required"`
		Radius    float64 `json:"radius"`
		Type      string  `json:"type"`
		MinPrice  float64 `json:"min_price"`
		MaxPrice  float64 `json:"max_price"`
	}

	var req SearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	if req.Radius == 0 {
		req.Radius = 5 // Default 5km radius
	}

	properties, err := h.propertyService.SearchByLocation(c.Request.Context(), req.Latitude, req.Longitude, req.Radius)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Search failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Properties found", gin.H{
		"properties": properties,
		"count":      len(properties),
	})
}

// GetMarketplaceListings gets property listings from external marketplaces
// @Router /properties/:id/marketplace-listings [get]
func (h *PropertyHandler) GetMarketplaceListings(c *gin.Context) {
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
func (h *PropertyHandler) SyncMarketplaceAPIs(c *gin.Context) {
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
func (h *PropertyHandler) GetPropertyListingsOnSale(c *gin.Context) {
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
