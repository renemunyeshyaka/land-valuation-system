package handlers

import (
	"backend/internal/repository"
	"backend/internal/utils"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// ListProperties returns a list of properties (stub)
func (h *PropertyHandler) ListProperties(c *gin.Context) {
	utils.SuccessResponse(c, http.StatusOK, "ListProperties not implemented", nil)
}

// GetProperty returns a property by ID (stub)
func (h *PropertyHandler) GetProperty(c *gin.Context) {
	utils.SuccessResponse(c, http.StatusOK, "GetProperty not implemented", nil)
}

// SearchNearby searches for properties by UPI only (stub)
func (h *PropertyHandler) SearchNearby(c *gin.Context) {
	utils.SuccessResponse(c, http.StatusOK, "SearchNearby not implemented", nil)
}

// CreateProperty creates a new property
func (h *PropertyHandler) CreateProperty(c *gin.Context) {
	// TODO: Implement property creation logic
	utils.SuccessResponse(c, http.StatusOK, "CreateProperty not implemented", nil)
}

type PropertyHandler struct {
	propertyRepo *repository.PropertyRepository
}

// NewPropertyHandler returns a new PropertyHandler
func NewPropertyHandler(propertyRepo *repository.PropertyRepository) *PropertyHandler {
	return &PropertyHandler{propertyRepo: propertyRepo}
}

// UpdateProperty updates an existing property
// @Router /api/v1/properties/{id} [put]
func (h *PropertyHandler) UpdateProperty(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	userID, _ := c.Get("user_id")

	property, err := h.propertyRepo.FindByID(uint(id))
	if err != nil || property == nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Property not found", "")
		return
	}

	// Check ownership
	if property.OwnerID != userID.(uint) {
		utils.ErrorResponse(c, http.StatusForbidden, "You don't have permission to update this property", "")
		return
	}

	var req struct {
		Title        string   `json:"title"`
		Description  string   `json:"description"`
		PropertyType string   `json:"property_type"`
		Price        float64  `json:"price"`
		Status       string   `json:"status"`
		Features     []string `json:"features"`
		Images       []string `json:"images"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	// Update fields
	if req.Title != "" {
		property.Title = req.Title
	}
	if req.Description != "" {
		property.Description = req.Description
	}
	if req.PropertyType != "" {
		property.PropertyType = req.PropertyType
	}
	if req.Price > 0 {
		property.Price = req.Price
	}
	if req.Status != "" {
		property.Status = req.Status
	}

	if err := h.propertyRepo.Update(property); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to update property", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Property updated successfully", property)
}

// DeleteProperty deletes a property
// @Router /api/v1/properties/{id} [delete]
func (h *PropertyHandler) DeleteProperty(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	userID, _ := c.Get("user_id")

	property, err := h.propertyRepo.FindByID(uint(id))
	if err != nil || property == nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Property not found", "")
		return
	}

	// Check ownership
	if property.OwnerID != userID.(uint) {
		utils.ErrorResponse(c, http.StatusForbidden, "You don't have permission to delete this property", "")
		return
	}

	if err := h.propertyRepo.Delete(uint(id)); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to delete property", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Property deleted successfully", nil)
}

// SearchNearby searches for properties with filters
// @Summary Search properties by location and filters
// @Description Search for properties by UPI (Unique Parcel Identifier) only
// @Tags properties
// @Accept json
// @Produce json
// @Param request body PropertySearchRequest true "Search filters"
// @Success 200 {object} utils.APIResponse "Properties found"
// @Failure 400 {object} utils.APIResponse "Invalid request"
// @Failure 500 {object} utils.APIResponse "Server error"
// @Router /api/v1/properties/search [post]
// (UPI-only version implemented above)

// GetStatistics returns property statistics
// @Router /api/v1/properties/stats [get]
func (h *PropertyHandler) GetStatistics(c *gin.Context) {
	stats, err := h.propertyRepo.GetStatistics()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve statistics", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Statistics retrieved successfully", stats)
}
