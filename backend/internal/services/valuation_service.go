package services

import (
	"backend/internal/models"
	"backend/internal/repository"
	"context"
	"fmt"
	"time"
)

// GazetteService is a placeholder for build compatibility
type GazetteService struct{}

func (g *GazetteService) GetZoneCoefficient(district, sector string) (float64, error) {
	return 1.0, nil
}

func (g *GazetteService) GetCurrentGazetteReference() string {
	return "GAZ-REF-2026"
}

func (g *GazetteService) GetCurrentGazetteDate() string {
	return "2026-03-01"
}

type ValuationService struct {
	propertyRepo   *repository.PropertyRepository
	valuationRepo  *repository.ValuationRepository
	gazetteService *GazetteService
}

func (s *ValuationService) ListProperties(ctx context.Context, filter *models.PropertyFilter) ([]models.Property, int64, error) {
	return []models.Property{}, 0, nil
}

func (s *ValuationService) GetPropertyByID(ctx context.Context, id string) (*models.Property, error) {
	return nil, nil
}

func (s *ValuationService) CreateProperty(ctx context.Context, property models.Property) (*models.Property, error) {
	return nil, nil
}

func (s *ValuationService) UpdateProperty(ctx context.Context, id string, userID string, req interface{}) (*models.Property, error) {
	return nil, nil
}

func (s *ValuationService) DeleteProperty(ctx context.Context, id string, userID string) error {
	return nil
}

func (s *ValuationService) SearchByLocation(ctx context.Context, lat, lng, radius float64) ([]models.Property, error) {
	return []models.Property{}, nil
}

func NewValuationService(
	propertyRepo *repository.PropertyRepository,
	valuationRepo *repository.ValuationRepository,
	gazetteService *GazetteService,
) *ValuationService {
	return &ValuationService{
		propertyRepo:   propertyRepo,
		valuationRepo:  valuationRepo,
		gazetteService: gazetteService,
	}
}

type ValuationRequest struct {
	PropertyID     uint `json:"property_id"`
	ValuatorID     uint `json:"valuator_id"`
	IncludeFactors bool `json:"include_factors"`
}

type ValuationResult struct {
	Property        *models.Property         `json:"property"`
	Valuation       *models.Valuation        `json:"valuation"`
	Factors         []models.ValuationFactor `json:"factors,omitempty"`
	Comparables     []models.Property        `json:"comparables,omitempty"`
	ConfidenceLevel string                   `json:"confidence_level"`
	Recommendations []string                 `json:"recommendations,omitempty"`
}

func (s *ValuationService) CalculateValuation(req ValuationRequest) (*ValuationResult, error) {
	// Fetch property
	property, err := s.propertyRepo.FindByID(req.PropertyID, "Owner")
	if err != nil {
		return nil, fmt.Errorf("property not found: %w", err)
	}

	// Get zone coefficient from gazette
	zoneCoeff, err := s.gazetteService.GetZoneCoefficient(property.District, property.Sector)
	if err != nil {
		return nil, fmt.Errorf("failed to get zone coefficient: %w", err)
	}

	// Create valuation
	valuation := &models.Valuation{
		PropertyID:         property.ID,
		ValuatorID:         req.ValuatorID,
		BasePrice:          property.Price,
		ZoneCoefficient:    zoneCoeff,
		MarketAdjustment:   s.calculateMarketAdjustment(property),
		LocationAdjustment: s.calculateLocationAdjustment(property),
		SizeAdjustment:     s.calculateSizeAdjustment(property.LandSize),
		GazetteReference:   s.gazetteService.GetCurrentGazetteReference(),
		GazetteDate:        nil,
	}

	// Calculate factors
	factors := s.identifyFactors(property)
	valuation.Factors = s.factorsToJSON(factors)

	// Find comparable properties
	comparables, err := s.findComparableProperties(property)
	if err == nil {
		valuation.ComparableCount = len(comparables)
	}

	// Calculate final price
	valuation.CalculateFinalPrice()

	// Save valuation
	if err := s.valuationRepo.Create(valuation); err != nil {
		return nil, fmt.Errorf("failed to save valuation: %w", err)
	}

	// Generate result
	result := &ValuationResult{
		Property:        property,
		Valuation:       valuation,
		Factors:         factors,
		Comparables:     comparables,
		ConfidenceLevel: s.getConfidenceLevel(valuation.ConfidenceScore),
	}

	// Generate recommendations
	if req.IncludeFactors {
		result.Recommendations = s.generateRecommendations(valuation, factors)
	}

	return result, nil
}

func (s *ValuationService) calculateMarketAdjustment(property *models.Property) float64 {
	// Base adjustment
	adjustment := 1.0

	// Adjust based on market trends
	// This would typically come from market analysis
	switch property.PropertyType {
	case "residential":
		adjustment *= 1.05 // 5% premium for residential
	case "commercial":
		adjustment *= 1.10 // 10% premium for commercial
	case "agricultural":
		adjustment *= 0.95 // 5% discount for agricultural
	case "industrial":
		adjustment *= 1.08 // 8% premium for industrial
	}

	return adjustment
}

func (s *ValuationService) calculateLocationAdjustment(property *models.Property) float64 {
	adjustment := 1.0

	// Adjust based on district
	districtMultipliers := map[string]float64{
		"Kigali City": 1.3,
		"Musanze":     1.1,
		"Rubavu":      1.05,
		"Huye":        1.0,
		"Nyagatare":   0.95,
	}

	if mult, exists := districtMultipliers[property.District]; exists {
		adjustment *= mult
	}

	// Adjust based on proximity to amenities
	// This would require geolocation analysis

	return adjustment
}

func (s *ValuationService) calculateSizeAdjustment(size float64) float64 {
	// Economies of scale - larger plots typically have lower per-unit price
	if size < 500 {
		return 1.10 // Small plots premium
	} else if size < 1000 {
		return 1.05
	} else if size < 5000 {
		return 1.00
	} else if size < 10000 {
		return 0.95
	} else {
		return 0.90 // Large plots discount
	}
}

// parseGazetteDate converts string to *time.Time
func parseGazetteDate(dateStr string) *time.Time {
	t, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return nil
	}
	return &t
}
func (s *ValuationService) identifyFactors(property *models.Property) []models.ValuationFactor {
	factors := []models.ValuationFactor{}

	// Road access
	for _, feature := range property.Features {
		if feature == "Road Access" {
			factors = append(factors, models.ValuationFactor{
				Name:        "Road Access",
				Value:       1.05,
				Weight:      0.15,
				Impact:      "positive",
				Description: "Direct road access increases property value",
			})
		}
	}

	// Utilities
	utilities := []string{"Water", "Electricity", "Sewage"}
	utilityCount := 0
	for _, feature := range property.Features {
		for _, util := range utilities {
			if feature == util {
				utilityCount++
			}
		}
	}

	if utilityCount > 0 {
		factor := models.ValuationFactor{
			Name:        "Utilities Available",
			Value:       1.0 + float64(utilityCount)*0.03,
			Weight:      0.10,
			Impact:      "positive",
			Description: fmt.Sprintf("%d utility connections available", utilityCount),
		}
		factors = append(factors, factor)
	}

	// Zoning benefits
	if property.ZoneCoefficient > 1.5 {
		factors = append(factors, models.ValuationFactor{
			Name:        "High Zone Coefficient",
			Value:       property.ZoneCoefficient,
			Weight:      0.20,
			Impact:      "positive",
			Description: "Located in high-value zone",
		})
	}

	return factors
}

func (s *ValuationService) factorsToJSON(factors []models.ValuationFactor) models.JSON {
	json := make(models.JSON)
	for _, factor := range factors {
		json[factor.Name] = factor
	}
	return json
}

func (s *ValuationService) findComparableProperties(property *models.Property) ([]models.Property, error) {
	// Find similar properties in the same district
	filter := repository.PropertyFilter{
		District:     property.District,
		PropertyType: property.PropertyType,
		Status:       "available",
		MinPrice:     property.Price * 0.7,
		MaxPrice:     property.Price * 1.3,
		MinSize:      property.LandSize * 0.8,
		MaxSize:      property.LandSize * 1.2,
	}

	properties, _, err := s.propertyRepo.FindAll(filter)
	if err != nil {
		return nil, err
	}

	// Limit to 10 comparables
	if len(properties) > 10 {
		properties = properties[:10]
	}

	return properties, nil
}

func (s *ValuationService) getConfidenceLevel(score float64) string {
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

func (s *ValuationService) generateRecommendations(valuation *models.Valuation, factors []models.ValuationFactor) []string {
	recommendations := []string{}

	if valuation.ConfidenceScore < 60 {
		recommendations = append(recommendations,
			"Consider a professional physical inspection for more accurate valuation")
	}

	if valuation.GazetteReference == "" {
		recommendations = append(recommendations,
			"Update gazette reference to improve valuation accuracy")
	}

	if valuation.ComparableCount < 3 {
		recommendations = append(recommendations,
			"Expand search area for more comparable properties")
	}

	return recommendations
}
