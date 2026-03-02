package handlers

import (
	"net/http"
	"strconv"

	"backend/internal/models"
	"backend/internal/repository"
	"backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type PropertyHandler struct {
	propertyRepo *repository.PropertyRepository
}

func NewPropertyHandler(propertyRepo *repository.PropertyRepository) *PropertyHandler {
	return &PropertyHandler{
		propertyRepo: propertyRepo,
	}
}

// ListProperties retrieves properties with filters
// @Router /api/v1/properties [get]
func (h *PropertyHandler) ListProperties(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	minPrice, _ := strconv.ParseFloat(c.Query("min_price"), 64)
	maxPrice, _ := strconv.ParseFloat(c.Query("max_price"), 64)
	minSize, _ := strconv.ParseFloat(c.Query("min_size"), 64)
	maxSize, _ := strconv.ParseFloat(c.Query("max_size"), 64)

	filter := repository.PropertyFilter{
		District:     c.Query("district"),
		PropertyType: c.Query("property_type"),
		Status:       c.DefaultQuery("status", "available"),
		MinPrice:     minPrice,
		MaxPrice:     maxPrice,
		MinSize:      minSize,
		MaxSize:      maxSize,
		Page:         page,
		PageSize:     pageSize,
		SortBy:       c.DefaultQuery("sort_by", "created_at"),
		SortOrder:    c.DefaultQuery("sort_order", "desc"),
	}

	properties, total, err := h.propertyRepo.FindAll(filter)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve properties", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Properties retrieved successfully", gin.H{
		"properties": properties,
		"pagination": gin.H{
			"page":        page,
			"page_size":   pageSize,
			"total":       total,
			"total_pages": (int(total) + pageSize - 1) / pageSize,
		},
	})
}

// GetProperty retrieves a single property by ID
// @Router /api/v1/properties/:id [get]
func (h *PropertyHandler) GetProperty(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)

	property, err := h.propertyRepo.FindByID(uint(id), "Owner")
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve property", err.Error())
		return
	}

	if property == nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Property not found", "")
		return
	}

	// Increment view count
	h.propertyRepo.IncrementViews(uint(id))

	utils.SuccessResponse(c, http.StatusOK, "Property retrieved successfully", property)
}

// CreateProperty creates a new property
// @Router /api/v1/properties [post]
func (h *PropertyHandler) CreateProperty(c *gin.Context) {
	var req struct {
		Title        string   `json:"title" binding:"required"`
		Description  string   `json:"description"`
		PropertyType string   `json:"property_type" binding:"required"`
		District     string   `json:"district" binding:"required"`
		Sector       string   `json:"sector"`
		Cell         string   `json:"cell"`
		Village      string   `json:"village"`
		Address      string   `json:"address"`
		Latitude     float64  `json:"latitude" binding:"required"`
		Longitude    float64  `json:"longitude" binding:"required"`
		LandSize     float64  `json:"land_size" binding:"required,gt=0"`
		Price        float64  `json:"price" binding:"required,gt=0"`
		Features     []string `json:"features"`
		Images       []string `json:"images"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized", "")
		return
	}

	property := &models.Property{
		Title:        req.Title,
		Description:  req.Description,
		PropertyType: req.PropertyType,
		District:     req.District,
		Sector:       req.Sector,
		Cell:         req.Cell,
		Village:      req.Village,
		Address:      req.Address,
		Latitude:     req.Latitude,
		Longitude:    req.Longitude,
		LandSize:     req.LandSize,
		Price:        req.Price,
		Status:       "available",
		OwnerID:      userID.(uint),
		Currency:     "RWF",
	}

	if err := h.propertyRepo.Create(property); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to create property", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Property created successfully", property)
}

// UpdateProperty updates an existing property
// @Router /api/v1/properties/:id [put]
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
// @Router /api/v1/properties/:id [delete]
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

// SearchNearby searches for properties near a location
// @Router /api/v1/properties/search/nearby [get]
func (h *PropertyHandler) SearchNearby(c *gin.Context) {
	lat, _ := strconv.ParseFloat(c.Query("latitude"), 64)
	lng, _ := strconv.ParseFloat(c.Query("longitude"), 64)
	radius, _ := strconv.ParseFloat(c.DefaultQuery("radius", "5000"), 64) // default 5km

	if lat == 0 || lng == 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Latitude and longitude are required", "")
		return
	}

	filter := repository.PropertyFilter{
		Latitude:  lat,
		Longitude: lng,
		Radius:    radius,
		Status:    "available",
		Page:      1,
		PageSize:  50,
	}

	properties, total, err := h.propertyRepo.FindAll(filter)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to search properties", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Properties found", gin.H{
		"properties": properties,
		"total":      total,
	})
}

// GetStatistics returns property statistics
// @Router /api/v1/properties/statistics [get]
func (h *PropertyHandler) GetStatistics(c *gin.Context) {
	stats, err := h.propertyRepo.GetStatistics()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve statistics", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Statistics retrieved successfully", stats)
}
