package handlers

import (
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"backend/internal/models"
	"backend/internal/repository"
	"backend/internal/utils"
	"backend/pkg/filevalidation"

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

// CreateProperty creates a new property with file uploads
// @Router /api/v1/properties [post]
func (h *PropertyHandler) CreateProperty(c *gin.Context) {
	// Set max multipart form size to 10 MB
	c.Request.ParseMultipartForm(filevalidation.MaxUploadSize)

	// Parse form fields
	title := c.PostForm("title")
	description := c.PostForm("description")
	propertyType := c.PostForm("property_type")
	district := c.PostForm("district")
	sector := c.PostForm("sector")
	cell := c.PostForm("cell")
	village := c.PostForm("village")
	address := c.PostForm("address")
	latitude, err := strconv.ParseFloat(c.PostForm("latitude"), 64)
	if err != nil || latitude == 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid latitude", "")
		return
	}
	longitude, err := strconv.ParseFloat(c.PostForm("longitude"), 64)
	if err != nil || longitude == 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid longitude", "")
		return
	}
	landSize, err := strconv.ParseFloat(c.PostForm("land_size"), 64)
	if err != nil || landSize <= 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid land size", "")
		return
	}
	price, err := strconv.ParseFloat(c.PostForm("price"), 64)
	if err != nil || price <= 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid price", "")
		return
	}

	// Validate required fields
	if title == "" || propertyType == "" || district == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Title, property type, and district are required", "")
		return
	}

	// Get user ID from context
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized", "")
		return
	}

	// Process image files
	form, err := c.MultipartForm()
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to parse form", err.Error())
		return
	}

	imageFiles := form.File["images"]
	documentFiles := form.File["documents"]

	// Validate image count
	if err := filevalidation.ValidateImageCount(len(imageFiles)); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid image count", err.Error())
		return
	}

	// Validate document count
	if err := filevalidation.ValidateDocumentCount(len(documentFiles)); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid document count", err.Error())
		return
	}

	// Process images
	var imageDataURLs []string
	var totalUploadSize int64

	for _, fileHeader := range imageFiles {
		// Validate file size
		if err := filevalidation.ValidateFileSize(fileHeader.Size, fileHeader.Filename); err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid image file", err.Error())
			return
		}

		// Check total upload size
		totalUploadSize += fileHeader.Size
		if err := filevalidation.ValidateTotalUploadSize(totalUploadSize); err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Total upload size exceeded", err.Error())
			return
		}

		// Open file
		file, err := fileHeader.Open()
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Failed to read image", err.Error())
			return
		}
		defer file.Close()

		// Read file data
		fileData, err := io.ReadAll(file)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Failed to read image data", err.Error())
			return
		}

		// Validate image
		if err := filevalidation.ValidateImageFile(fileHeader.Filename, fileHeader.Header.Get("Content-Type"), fileHeader.Size); err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid image file", err.Error())
			return
		}

		// Convert to base64 DataURL
		mimeType := filevalidation.DetectMIMEType(fileData)
		if mimeType == "" || !strings.Contains(mimeType, "image") {
			mimeType = "image/jpeg"
		}
		dataURL := fmt.Sprintf("data:%s;base64,%s", mimeType, base64.StdEncoding.EncodeToString(fileData))
		imageDataURLs = append(imageDataURLs, dataURL)
	}

	// Process documents
	var documentDataURLs []string
	for _, fileHeader := range documentFiles {
		// Validate file size
		if err := filevalidation.ValidateFileSize(fileHeader.Size, fileHeader.Filename); err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid document file", err.Error())
			return
		}

		// Check total upload size
		totalUploadSize += fileHeader.Size
		if err := filevalidation.ValidateTotalUploadSize(totalUploadSize); err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Total upload size exceeded", err.Error())
			return
		}

		// Open file
		file, err := fileHeader.Open()
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Failed to read document", err.Error())
			return
		}
		defer file.Close()

		// Read file data
		fileData, err := io.ReadAll(file)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Failed to read document data", err.Error())
			return
		}

		// Validate document
		if err := filevalidation.ValidateDocumentFile(fileHeader.Filename, fileHeader.Header.Get("Content-Type"), fileHeader.Size); err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid document file", err.Error())
			return
		}

		// Convert to base64 DataURL
		dataURL := fmt.Sprintf("data:application/pdf;base64,%s", base64.StdEncoding.EncodeToString(fileData))
		documentDataURLs = append(documentDataURLs, dataURL)
	}

	// Create property
	property := &models.Property{
		Title:        title,
		Description:  description,
		PropertyType: propertyType,
		District:     district,
		Sector:       sector,
		Cell:         cell,
		Village:      village,
		Address:      address,
		Latitude:     latitude,
		Longitude:    longitude,
		LandSize:     landSize,
		Price:        price,
		Status:       "available",
		OwnerID:      userID.(uint),
		Currency:     "RWF",
	}

	// Store images and documents as JSON arrays
	// (In production, you'd store them in cloud storage like S3/Azure Blob)
	if len(imageDataURLs) > 0 {
		// Keep as DataURLs in the model or convert to storage paths
		property.Images = imageDataURLs
	}
	if len(documentDataURLs) > 0 {
		property.Documents = documentDataURLs
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
