package handlers

import (
	"backend/internal/models"
	"backend/internal/services"
	"backend/internal/utils"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type ValuationHandler struct {
	valuationService *services.ValuationService
}

func NewValuationHandler(valuationService *services.ValuationService) *ValuationHandler {
	return &ValuationHandler{
		valuationService: valuationService,
	}
}

// CreateValuationRequest represents the API request for valuation
type CreateValuationRequest struct {
	UPI                string `json:"upi" binding:"required"`
	IncludeFactors     bool   `json:"include_factors"`
	IncludeComparables bool   `json:"include_comparables"`
}

// ValuationResponse represents the API response for valuation
type ValuationResponse struct {
	EstimatedValueRWF float64                  `json:"estimated_value_rwf"`
	Confidence        float64                  `json:"confidence"`
	ConfidenceLevel   string                   `json:"confidence_level"`
	UpdatedAt         string                   `json:"updated_at"`
	ZoneCoefficient   float64                  `json:"zone_coefficient"`
	BasePrice         float64                  `json:"base_price"`
	Adjustments       map[string]float64       `json:"adjustments"`
	Factors           []models.ValuationFactor `json:"factors,omitempty"`
	Comparables       []PropertySummary        `json:"comparables,omitempty"`
	Recommendations   []string                 `json:"recommendations,omitempty"`
	GazetteReference  string                   `json:"gazette_reference"`
}

type PropertySummary struct {
	ID           uint    `json:"id"`
	Title        string  `json:"title"`
	District     string  `json:"district"`
	Sector       string  `json:"sector"`
	LandSize     float64 `json:"land_size"`
	Price        float64 `json:"price"`
	PropertyType string  `json:"property_type"`
}

// CreateValuation godoc
// @Summary Calculate property valuation
// @Description Calculate estimated property value based on location, size, and type
// @Tags valuations
// @Accept json
// @Produce json
// @Param request body CreateValuationRequest true "Valuation request"
// @Success 200 {object} utils.APIResponse{data=ValuationResponse}
// @Failure 400 {object} utils.APIResponse
// @Failure 500 {object} utils.APIResponse
// @Router /api/v1/valuations [post]
func (h *ValuationHandler) CreateValuation(c *gin.Context) {
	var req CreateValuationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	// Fetch land parcel by UPI using repository
	landParcel, err := h.valuationService.LandParcelRepo().FindByUPI(req.UPI)
	if err != nil || landParcel == nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Land parcel not found for UPI", req.UPI)
		return
	}

	// Create a temporary property object for valuation using land parcel info
	property := &models.Property{
		UPI:          landParcel.UPI,
		LandSize:     landParcel.LandSizeSqm,
		PropertyType: landParcel.PropertyType,
		// Add other fields as needed
	}

	// Set base price and zone coefficient based on Official Gazette
	property.Price = h.calculateBasePrice(landParcel.District, landParcel.LandSizeSqm, landParcel.PropertyType)
	property.ZoneCoefficient = h.getZoneCoefficient(landParcel.District)

	// Perform valuation calculation
	result := h.performQuickValuation(property, req.IncludeFactors, req.IncludeComparables)

	utils.SuccessResponse(c, http.StatusOK, "Valuation calculated successfully", result)
}

// GetValuationByID godoc
// @Summary Get valuation by ID
// @Description Retrieve a specific valuation result by ID
// @Tags valuations
// @Produce json
// @Param id path string true "Valuation ID"
// @Success 200 {object} utils.APIResponse{data=ValuationResponse}
// @Failure 404 {object} utils.APIResponse
// @Failure 500 {object} utils.APIResponse
// @Router /api/v1/valuations/{id} [get]
func (h *ValuationHandler) GetValuationByID(c *gin.Context) {
	id := c.Param("id")

	// Convert to uint
	if _, err := strconv.ParseUint(id, 10, 32); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid valuation ID", err.Error())
		return
	}

	// TODO: Implement fetching valuation from database when needed
	utils.ErrorResponse(c, http.StatusNotImplemented, "Endpoint not yet implemented for ID: "+id, "")
}

// GetValuationByUPI godoc
// @Summary Get property valuation by UPI
// @Description Automatically calculate property valuation by providing a Unique Parcel Identifier (UPI)
// @Tags valuations
// @Produce json
// @Param upi path string true "Unique Parcel Identifier" example("3711")
// @Success 200 {object} utils.APIResponse{data=services.UPIValuationResponse}
// @Failure 400 {object} utils.APIResponse
// @Failure 404 {object} utils.APIResponse
// @Failure 500 {object} utils.APIResponse
// @Router /api/v1/valuations/by-upi/{upi} [get]
func (h *ValuationHandler) GetValuationByUPI(c *gin.Context) {
	upi := c.Param("upi")

	// Validate UPI
	if upi == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "UPI is required", "")
		return
	}

	// Get valuation from service
	result, err := h.valuationService.GetValuationByUPI(upi)
	if err != nil {
		if err.Error() == "property not found for UPI: "+upi {
			utils.ErrorResponse(c, http.StatusNotFound, "Property not found", err.Error())
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to calculate valuation", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Valuation calculated successfully", result)
}

// ListValuations godoc
// @Summary List user's valuations
// @Description Get a list of all valuations created by the authenticated user
// @Tags valuations
// @Produce json
// @Security BearerAuth
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(10)
// @Success 200 {object} utils.APIResponse{data=[]ValuationResponse}
// @Failure 500 {object} utils.APIResponse
// @Router /api/v1/valuations [get]
func (h *ValuationHandler) ListValuations(c *gin.Context) {
	// Get pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	// TODO: Implement fetching valuations from database
	utils.SuccessResponse(c, http.StatusOK, "Valuations retrieved", gin.H{
		"valuations": []ValuationResponse{},
		"page":       page,
		"limit":      limit,
		"total":      0,
	})
}

// ApproveValuationRequest represents admin approval request
type ApproveValuationRequest struct {
	Comment string `json:"comment" binding:"max=500" example:"Valuation approved after review"`
}

// RejectValuationRequest represents admin rejection request
type RejectValuationRequest struct {
	Reason  string `json:"reason" binding:"required,max=500" example:"Incorrect property type classification"`
	Comment string `json:"comment" binding:"max=500" example:"Additional details on rejection"`
}

// ApproveValuation godoc
// @Summary Approve a valuation (Admin)
// @Description Admin endpoint to approve a property valuation
// @Tags admin,valuations
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Valuation ID"
// @Param request body ApproveValuationRequest true "Approval details"
// @Success 200 {object} utils.APIResponse
// @Failure 400 {object} utils.APIResponse
// @Failure 404 {object} utils.APIResponse
// @Failure 500 {object} utils.APIResponse
// @Router /admin/valuations/{id}/approve [post]
func (h *ValuationHandler) ApproveValuation(c *gin.Context) {
	id := c.Param("id")

	var req ApproveValuationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	// Convert to uint
	valuationID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid valuation ID", err.Error())
		return
	}

	// TODO: Implement actual approval in database
	// For now, return success response
	utils.SuccessResponse(c, http.StatusOK, "Valuation approved successfully", gin.H{
		"valuation_id": valuationID,
		"status":       "approved",
		"comment":      req.Comment,
		"approved_at":  "2026-03-04T10:00:00Z",
	})
}

// RejectValuation godoc
// @Summary Reject a valuation (Admin)
// @Description Admin endpoint to reject a property valuation with reason
// @Tags admin,valuations
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Valuation ID"
// @Param request body RejectValuationRequest true "Rejection details"
// @Success 200 {object} utils.APIResponse
// @Failure 400 {object} utils.APIResponse
// @Failure 404 {object} utils.APIResponse
// @Failure 500 {object} utils.APIResponse
// @Router /admin/valuations/{id}/reject [post]
func (h *ValuationHandler) RejectValuation(c *gin.Context) {
	id := c.Param("id")

	var req RejectValuationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	// Convert to uint
	valuationID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid valuation ID", err.Error())
		return
	}

	// TODO: Implement actual rejection in database
	// For now, return success response
	utils.SuccessResponse(c, http.StatusOK, "Valuation rejected", gin.H{
		"valuation_id": valuationID,
		"status":       "rejected",
		"reason":       req.Reason,
		"comment":      req.Comment,
		"rejected_at":  "2026-03-04T10:00:00Z",
	})
}

// GetValuationHistory godoc
// @Summary Get valuation history for a property
// @Description Retrieve all valuations performed on a specific property
// @Tags valuations
// @Produce json
// @Security BearerAuth
// @Param property_id query string true "Property ID"
// @Param limit query int false "Maximum number of records" default(10)
// @Success 200 {object} utils.APIResponse{data=[]ValuationResponse}
// @Failure 400 {object} utils.APIResponse
// @Failure 500 {object} utils.APIResponse
// @Router /api/v1/valuations/history [get]
func (h *ValuationHandler) GetValuationHistory(c *gin.Context) {
	propertyID := c.Query("property_id")
	if propertyID == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "property_id query parameter is required", "")
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if limit < 1 || limit > 100 {
		limit = 10
	}

	// TODO: Implement fetching valuation history from database
	utils.SuccessResponse(c, http.StatusOK, "Valuation history retrieved", gin.H{
		"property_id": propertyID,
		"valuations":  []ValuationResponse{},
		"total":       0,
	})
}

// performQuickValuation performs valuation without DB storage
func (h *ValuationHandler) performQuickValuation(property *models.Property, includeFactors, includeComparables bool) *ValuationResponse {
	// For location info, fetch land parcel by UPI using repository
	landParcel, _ := h.valuationService.LandParcelRepo().FindByUPI(property.UPI)
	if landParcel == nil {
		landParcel = &models.LandParcel{}
	}

	// Calculate adjustments
	marketAdj := h.calculateMarketAdjustment(property.PropertyType)
	locationAdj := h.calculateLocationAdjustment(landParcel.District)
	sizeAdj := h.calculateSizeAdjustment(property.LandSize)

	// Calculate final value
	baseValue := property.Price
	finalValue := baseValue * property.ZoneCoefficient * marketAdj * locationAdj * sizeAdj

	// Calculate confidence
	confidence := h.calculateConfidenceWithParcel(property, landParcel)
	confidenceLevel := h.getConfidenceLevel(confidence)

	response := &ValuationResponse{
		EstimatedValueRWF: finalValue,
		Confidence:        confidence,
		ConfidenceLevel:   confidenceLevel,
		UpdatedAt:         "2026-03-03T10:00:00Z",
		ZoneCoefficient:   property.ZoneCoefficient,
		BasePrice:         baseValue,
		Adjustments: map[string]float64{
			"market_adjustment":   marketAdj,
			"location_adjustment": locationAdj,
			"size_adjustment":     sizeAdj,
		},
		GazetteReference: "Official Gazette No. 12 of 2024",
	}

	// Add factors if requested
	if includeFactors {
		response.Factors = h.identifyFactors(property)
		response.Recommendations = h.generateRecommendationsWithParcel(confidence, property, landParcel)
	}

	// Add comparables if requested
	if includeComparables {
		response.Comparables = []PropertySummary{
			{
				ID:           1,
				Title:        "Similar Property A",
				District:     landParcel.District,
				Sector:       landParcel.Sector,
				LandSize:     property.LandSize * 0.95,
				Price:        finalValue * 0.92,
				PropertyType: property.PropertyType,
			},
			{
				ID:           2,
				Title:        "Similar Property B",
				District:     landParcel.District,
				Sector:       landParcel.Sector,
				LandSize:     property.LandSize * 1.05,
				Price:        finalValue * 1.08,
				PropertyType: property.PropertyType,
			},
		}
	}

	return response
}

// calculateBasePrice returns base price total based on district and type
func (h *ValuationHandler) calculateBasePrice(district string, sizeSqm float64, propertyType string) float64 {
	// Official Gazette base rates (RWF per sqm) - simplified for MVP
	baseRates := map[string]map[string]float64{
		"Kigali City": {
			"residential":  15000.0,
			"commercial":   25000.0,
			"agricultural": 5000.0,
			"industrial":   18000.0,
		},
		"Musanze": {
			"residential":  8000.0,
			"commercial":   12000.0,
			"agricultural": 3000.0,
			"industrial":   10000.0,
		},
		"Rubavu": {
			"residential":  7000.0,
			"commercial":   11000.0,
			"agricultural": 2500.0,
			"industrial":   9000.0,
		},
	}

	// Get base rate
	baseRate := 5000.0 // Default fallback
	if rates, ok := baseRates[district]; ok {
		if rate, ok := rates[propertyType]; ok {
			baseRate = rate
		}
	}

	return baseRate * sizeSqm
}

// getZoneCoefficient returns the Official Gazette zone coefficient
func (h *ValuationHandler) getZoneCoefficient(district string) float64 {
	// Official Gazette coefficients - simplified for MVP
	coefficients := map[string]float64{
		"Kigali City": 2.5,
		"Musanze":     1.8,
		"Rubavu":      1.6,
		"Huye":        1.5,
		"Nyagatare":   1.3,
	}

	if coeff, ok := coefficients[district]; ok {
		return coeff
	}

	return 1.0 // Default coefficient
}

// Helper functions
func (h *ValuationHandler) calculateMarketAdjustment(propertyType string) float64 {
	adjustments := map[string]float64{
		"residential":  1.05,
		"commercial":   1.10,
		"agricultural": 0.95,
		"industrial":   1.08,
	}

	if adj, ok := adjustments[propertyType]; ok {
		return adj
	}
	return 1.0
}

func (h *ValuationHandler) calculateLocationAdjustment(district string) float64 {
	adjustments := map[string]float64{
		"Kigali City": 1.3,
		"Musanze":     1.1,
		"Rubavu":      1.05,
		"Huye":        1.0,
		"Nyagatare":   0.95,
	}

	if adj, ok := adjustments[district]; ok {
		return adj
	}
	return 1.0
}

func (h *ValuationHandler) calculateSizeAdjustment(size float64) float64 {
	switch {
	case size < 500:
		return 1.10
	case size < 1000:
		return 1.05
	case size < 5000:
		return 1.00
	case size < 10000:
		return 0.95
	default:
		return 0.90
	}
}

func (h *ValuationHandler) calculateConfidenceWithParcel(property *models.Property, parcel *models.LandParcel) float64 {
	confidence := 70.0
	if parcel.District != "" {
		confidence += 10.0
	}
	if parcel.Sector != "" {
		confidence += 10.0
	}
	if property.ZoneCoefficient > 0 {
		confidence += 10.0
	}
	if confidence > 100 {
		confidence = 100
	}
	return confidence
}

func (h *ValuationHandler) getConfidenceLevel(score float64) string {
	switch {
	case score >= 90:
		return "Very High"
	case score >= 75:
		return "High"
	case score >= 60:
		return "Moderate"
	case score >= 40:
		return "Low"
	default:
		return "Very Low"
	}
}

func (h *ValuationHandler) identifyFactors(property *models.Property) []models.ValuationFactor {
	factors := []models.ValuationFactor{}

	if property.ZoneCoefficient > 1.5 {
		factors = append(factors, models.ValuationFactor{
			Name:        "High Zone Coefficient",
			Value:       property.ZoneCoefficient,
			Weight:      0.20,
			Impact:      "positive",
			Description: "Located in high-value zone per Official Gazette",
		})
	}

	if property.PropertyType == "commercial" {
		factors = append(factors, models.ValuationFactor{
			Name:        "Commercial Property",
			Value:       1.10,
			Weight:      0.15,
			Impact:      "positive",
			Description: "Commercial properties have higher market demand",
		})
	}

	return factors
}

func (h *ValuationHandler) generateRecommendationsWithParcel(confidence float64, property *models.Property, parcel *models.LandParcel) []string {
	recommendations := []string{}
	if confidence < 60 {
		recommendations = append(recommendations,
			"Consider providing more detailed location information for improved accuracy")
	}
	if parcel.District == "" {
		recommendations = append(recommendations,
			"Add district information to get location-specific adjustments")
	}
	if property.LandSize > 10000 {
		recommendations = append(recommendations,
			"Large properties may benefit from subdivision for better market value")
	}
	if len(recommendations) == 0 {
		recommendations = append(recommendations,
			"Valuation confidence is good. Consider professional inspection for final confirmation")
	}
	return recommendations
}
