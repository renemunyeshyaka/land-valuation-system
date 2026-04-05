package handlers

import (
	"backend/internal/models"
	"backend/internal/repository"
	"backend/internal/services"
	"backend/internal/utils"
	"errors"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/lib/pq"
)

// ListProperties returns a list of properties with optional filters
func (h *PropertyHandler) ListProperties(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	query := h.propertyRepo.DB().Model(&models.Property{})

	userID, _, isAuthenticated := getOptionalAuthFromHeader(c)
	if isAuthenticated {
		query = query.Where("visibility IN ? OR owner_id = ?", []string{"public", "registered"}, userID)
	} else {
		query = query.Where("visibility = ?", "public")
	}

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}
	if propertyType := c.Query("property_type"); propertyType != "" {
		query = query.Where("property_type = ?", propertyType)
	}
	if district := c.Query("district"); district != "" {
		query = query.Where("district = ?", district)
	}
	if sector := c.Query("sector"); sector != "" {
		query = query.Where("sector = ?", sector)
	}
	if upi := c.Query("upi"); upi != "" {
		query = query.Where("upi = ?", upi)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to count properties", err.Error())
		return
	}

	var properties []models.Property
	offset := (page - 1) * limit
	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&properties).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to list properties", err.Error())
		return
	}

	utils.SuccessPaginatedResponse(c, http.StatusOK, "Properties retrieved successfully", properties, int(total), page, limit)
}

// GetProperty returns a property by ID
func (h *PropertyHandler) GetProperty(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid property ID", err.Error())
		return
	}

	property, err := h.propertyRepo.FindByID(uint(id), "Owner")
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve property", err.Error())
		return
	}
	if property == nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Property not found", "")
		return
	}

	authUserID, userType, isAuthenticated := getOptionalAuthFromHeader(c)
	if property.Visibility == "only_me" {
		if !isAuthenticated || (authUserID != property.OwnerID && userType != "admin") {
			utils.ErrorResponse(c, http.StatusForbidden, "This property is private", "Only the owner can view this property")
			return
		}
	}
	if property.Visibility == "registered" {
		if !isAuthenticated {
			utils.ErrorResponse(c, http.StatusUnauthorized, "Authentication required", "Please sign in to view this property")
			return
		}
	}

	_ = h.propertyRepo.IncrementViews(uint(id))
	utils.SuccessResponse(c, http.StatusOK, "Property retrieved successfully", property)
}

// SearchNearby searches for properties using UPI or geo/type/price filters.
// It returns a paginated envelope with data, total, page, and limit.
func (h *PropertyHandler) SearchNearby(c *gin.Context) {
	var req struct {
		UPI          string  `json:"upi"`
		Latitude     float64 `json:"latitude"`
		Longitude    float64 `json:"longitude"`
		RadiusKm     float64 `json:"radius_km"`
		PropertyType string  `json:"property_type"`
		MaxPrice     float64 `json:"max_price"`
		Page         int     `json:"page"`
		Limit        int     `json:"limit"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	hasUPI := req.UPI != ""
	hasGeo := req.Latitude != 0 && req.Longitude != 0 && req.RadiusKm > 0
	hasType := req.PropertyType != ""
	hasPrice := req.MaxPrice > 0
	if !hasUPI && !hasGeo && !hasType && !hasPrice {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", "provide at least one search criterion: upi, property_type, max_price, or latitude+longitude+radius_km")
		return
	}

	page := req.Page
	limit := req.Limit
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	// Backward-compatible UPI-only search path.
	if req.UPI != "" {
		results, total, err := h.propertyRepo.FindByUPIPaginated(req.UPI, page, limit)
		if err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to search property", err.Error())
			return
		}
		if total == 0 {
			utils.SuccessPaginatedResponse(c, http.StatusOK, "No property found for given UPI", []models.Property{}, 0, page, limit)
			return
		}

		utils.SuccessPaginatedResponse(c, http.StatusOK, "Property found", results, total, page, limit)
		return
	}

	searchService := services.NewMarketplaceService(h.propertyRepo.DB())
	properties, total, err := searchService.SearchPropertiesPaginated(
		c.Request.Context(),
		req.Latitude,
		req.Longitude,
		req.RadiusKm,
		req.PropertyType,
		req.MaxPrice,
		page,
		limit,
	)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to search properties", err.Error())
		return
	}

	utils.SuccessPaginatedResponse(c, http.StatusOK, "Properties found", properties, total, page, limit)
}

// CreateProperty creates a new property
func (h *PropertyHandler) CreateProperty(c *gin.Context) {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized", err.Error())
		return
	}

	var req struct {
		Title            string   `json:"title" binding:"required"`
		Description      string   `json:"description"`
		PropertyType     string   `json:"property_type" binding:"required"`
		Status           string   `json:"status"`
		Visibility       string   `json:"visibility"`
		UPI              string   `json:"upi" binding:"required"`
		District         string   `json:"district" binding:"required"`
		Sector           string   `json:"sector" binding:"required"`
		Address          string   `json:"address"`
		Latitude         float64  `json:"latitude"`
		Longitude        float64  `json:"longitude"`
		LandSize         float64  `json:"land_size" binding:"required"`
		SizeUnit         string   `json:"size_unit"`
		ZoneCoefficient  float64  `json:"zone_coefficient"`
		GazetteReference string   `json:"gazette_reference"`
		Price            float64  `json:"price" binding:"required"`
		Currency         string   `json:"currency"`
		Features         []string `json:"features"`
		Images           []string `json:"images"`
		Documents        []string `json:"documents"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	property := &models.Property{
		District:         req.District,
		Sector:           req.Sector,
		Title:            req.Title,
		Description:      req.Description,
		PropertyType:     req.PropertyType,
		Status:           "available",
		Visibility:       normalizeVisibility(req.Visibility),
		UPI:              req.UPI,
		Address:          req.Address,
		Latitude:         req.Latitude,
		Longitude:        req.Longitude,
		LandSize:         req.LandSize,
		SizeUnit:         req.SizeUnit,
		ZoneCoefficient:  req.ZoneCoefficient,
		GazetteReference: req.GazetteReference,
		Price:            req.Price,
		Currency:         req.Currency,
		Features:         pq.StringArray(req.Features),
		Images:           pq.StringArray(req.Images),
		Documents:        pq.StringArray(req.Documents),
		OwnerID:          userID,
	}

	if req.Status != "" {
		property.Status = normalizeStatus(req.Status)
	}

	if err := h.propertyRepo.Create(property); err != nil {
		var pgErr *pq.Error
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			if pgErr.Constraint == "properties_upi_key" || strings.Contains(strings.ToLower(pgErr.Detail), "(upi)") {
				utils.ErrorResponse(c, http.StatusConflict, "Property with this UPI already exists", "UPI/Parcel ID must be unique. Please use a different UPI.")
				return
			}
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to create property", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Property created successfully", property)
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
	userIDUint, err := getUserIDFromContext(c)
	if err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized", err.Error())
		return
	}

	property, err := h.propertyRepo.FindByID(uint(id))
	if err != nil || property == nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Property not found", "")
		return
	}

	// Allow admins to update any property, otherwise check ownership
	userType, _ := c.Get("user_type")
	if userType != "admin" {
		if property.OwnerID != userIDUint {
			utils.ErrorResponse(c, http.StatusForbidden, "You don't have permission to update this property", "")
			return
		}
	}

	var req struct {
		Title        string   `json:"title"`
		Description  string   `json:"description"`
		PropertyType string   `json:"property_type"`
		Price        float64  `json:"price"`
		Status       string   `json:"status"`
		Visibility   string   `json:"visibility"`
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
		property.Status = normalizeStatus(req.Status)
	}
	if req.Visibility != "" {
		property.Visibility = normalizeVisibility(req.Visibility)
	}
	// Update images if provided (allow empty array to clear images)
	if req.Images != nil {
		property.Images = pq.StringArray(req.Images)
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
	userID, err := getUserIDFromContext(c)
	if err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized", err.Error())
		return
	}

	property, err := h.propertyRepo.FindByID(uint(id))
	if err != nil || property == nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Property not found", "")
		return
	}

	// Admin can delete any property, non-admin users can only delete their own.
	userType, _ := c.Get("user_type")
	if userType != "admin" && property.OwnerID != userID {
		utils.ErrorResponse(c, http.StatusForbidden, "You don't have permission to delete this property", "")
		return
	}

	if err := h.propertyRepo.Delete(uint(id)); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to delete property", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Property deleted successfully", nil)
}

func getUserIDFromContext(c *gin.Context) (uint, error) {
	userIDRaw, exists := c.Get("user_id")
	if !exists {
		return 0, strconv.ErrSyntax
	}

	userIDStr, ok := userIDRaw.(string)
	if !ok || userIDStr == "" {
		return 0, strconv.ErrSyntax
	}

	parsed, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		return 0, err
	}

	return uint(parsed), nil
}

func normalizeVisibility(visibility string) string {
	normalized := strings.TrimSpace(strings.ToLower(visibility))
	switch normalized {
	case "only_me", "private":
		return "only_me"
	case "registered", "registered_users":
		return "registered"
	case "public", "":
		return "public"
	default:
		return "public"
	}
}

func normalizeStatus(status string) string {
	normalized := strings.TrimSpace(strings.ToLower(status))
	switch normalized {
	case "available", "availlable", "for_sale", "for sale":
		return "available"
	case "pending":
		return "pending"
	case "sold":
		return "sold"
	case "rented":
		return "rented"
	case "":
		return "available"
	default:
		return normalized
	}
}

func getOptionalAuthFromHeader(c *gin.Context) (uint, string, bool) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return 0, "", false
	}
	if !strings.HasPrefix(authHeader, "Bearer ") {
		return 0, "", false
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "your-secret-key"
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return []byte(jwtSecret), nil
	})
	if err != nil || !token.Valid {
		return 0, "", false
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return 0, "", false
	}

	rawUserID, ok := claims["user_id"]
	if !ok {
		return 0, "", false
	}

	var userID uint
	switch v := rawUserID.(type) {
	case string:
		parsed, err := strconv.ParseUint(v, 10, 32)
		if err != nil {
			return 0, "", false
		}
		userID = uint(parsed)
	case float64:
		userID = uint(v)
	default:
		return 0, "", false
	}

	userType, _ := claims["user_type"].(string)
	return userID, userType, true
}

// ListMyProperties returns properties created by the currently authenticated user
func (h *PropertyHandler) ListMyProperties(c *gin.Context) {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized", err.Error())
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	query := h.propertyRepo.DB().Model(&models.Property{}).Where("owner_id = ?", userID)

	var total int64
	if err := query.Count(&total).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to count your properties", err.Error())
		return
	}

	var properties []models.Property
	offset := (page - 1) * limit
	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&properties).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to list your properties", err.Error())
		return
	}

	utils.SuccessPaginatedResponse(c, http.StatusOK, "Your properties retrieved successfully", properties, int(total), page, limit)
}

// SearchNearby godoc
// @Summary Search properties by UPI or filters
// @Description Search properties using either an exact UPI match or one or more filters: property_type, max_price, or latitude+longitude+radius_km. Returns a paginated response envelope.
// @Tags properties
// @Accept json
// @Produce json
// @Param request body object{upi=string,latitude=number,longitude=number,radius_km=number,property_type=string,max_price=number,page=integer,limit=integer} true "Search criteria and pagination"
// @Success 200 {object} utils.APIResponse "Paginated property search result"
// @Failure 400 {object} utils.APIResponse "Invalid request"
// @Failure 500 {object} utils.APIResponse "Server error"
// @Router /api/v1/properties/search [post]

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
