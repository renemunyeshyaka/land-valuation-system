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
	District           string  `json:"district" binding:"required"`
	Sector             string  `json:"sector"`
	PropertySizeSqm    float64 `json:"property_size_sqm" binding:"required,gt=0"`
	PropertyType       string  `json:"property_type" binding:"required,oneof=residential commercial agricultural industrial"`
	IncludeFactors     bool    `json:"include_factors"`
	IncludeComparables bool    `json:"include_comparables"`
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

	// For MVP, create a temporary property object for valuation
	property := &models.Property{
		LandSize:     req.PropertySizeSqm,
		PropertyType: req.PropertyType,
		District:     req.District,
		Sector:       req.Sector,
		Status:       "valuation",
	}

	// Set base price and zone coefficient based on Official Gazette
	property.Price = h.calculateBasePrice(req.District, req.PropertySizeSqm, req.PropertyType)
	property.ZoneCoefficient = h.getZoneCoefficient(req.District)

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

// ListValuations godoc
// @Summary List user's valuations
// @Description Get a list of all valuations created by the authenticated user
// @Tags valuations
// @Produce json
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

// performQuickValuation performs valuation without DB storage
func (h *ValuationHandler) performQuickValuation(property *models.Property, includeFactors, includeComparables bool) *ValuationResponse {
	// Calculate adjustments
	marketAdj := h.calculateMarketAdjustment(property.PropertyType)
	locationAdj := h.calculateLocationAdjustment(property.District)
	sizeAdj := h.calculateSizeAdjustment(property.LandSize)

	// Calculate final value
	baseValue := property.Price
	finalValue := baseValue * property.ZoneCoefficient * marketAdj * locationAdj * sizeAdj

	// Calculate confidence
	confidence := h.calculateConfidence(property)
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
		response.Recommendations = h.generateRecommendations(confidence, property)
	}

	// Add comparables if requested
	if includeComparables {
		response.Comparables = []PropertySummary{
			{
				ID:           1,
				Title:        "Similar Property A",
				District:     property.District,
				Sector:       property.Sector,
				LandSize:     property.LandSize * 0.95,
				Price:        finalValue * 0.92,
				PropertyType: property.PropertyType,
			},
			{
				ID:           2,
				Title:        "Similar Property B",
				District:     property.District,
				Sector:       property.Sector,
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

func (h *ValuationHandler) calculateConfidence(property *models.Property) float64 {
	confidence := 70.0

	if property.District != "" {
		confidence += 10.0
	}
	if property.Sector != "" {
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

func (h *ValuationHandler) generateRecommendations(confidence float64, property *models.Property) []string {
	recommendations := []string{}

	if confidence < 60 {
		recommendations = append(recommendations,
			"Consider providing more detailed location information for improved accuracy")
	}

	if property.District == "" {
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
