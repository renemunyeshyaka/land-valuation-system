package services

import (
	"backend/internal/models"
	"backend/internal/repository"
	"context"
	"fmt"
	"strings"
	"time"
)

// LandParcelRepo returns the land parcel repository (exported accessor)
func (s *ValuationService) LandParcelRepo() *repository.LandParcelRepository {
	return s.landParcelRepo
}

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
	landParcelRepo *repository.LandParcelRepository
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
	landParcelRepo *repository.LandParcelRepository,
	valuationRepo *repository.ValuationRepository,
	gazetteService *GazetteService,
) *ValuationService {
	return &ValuationService{
		propertyRepo:   propertyRepo,
		landParcelRepo: landParcelRepo,
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

	// Fetch land parcel by UPI
	var landParcel *models.LandParcel
	if s.landParcelRepo != nil && property.UPI != "" {
		landParcel, _ = s.landParcelRepo.FindByUPI(property.UPI)
	}

	var district, sector string
	if landParcel != nil {
		district = landParcel.District
		sector = landParcel.Sector
	}

	// Get zone coefficient from gazette
	zoneCoeff, err := s.gazetteService.GetZoneCoefficient(district, sector)
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
		LocationAdjustment: s.calculateLocationAdjustmentWithParcel(property, landParcel),
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

func (s *ValuationService) calculateLocationAdjustmentWithParcel(property *models.Property, parcel *models.LandParcel) float64 {
	adjustment := 1.0
	var district string
	if parcel != nil {
		district = parcel.District
	}
	districtMultipliers := map[string]float64{
		"Kigali City": 1.3,
		"Musanze":     1.1,
		"Rubavu":      1.05,
		"Huye":        1.0,
		"Nyagatare":   0.95,
	}
	if mult, exists := districtMultipliers[district]; exists {
		adjustment *= mult
	}
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
	// UPI-only search cannot find comparables; return empty slice
	return []models.Property{}, nil
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

// UPIValuationResponse is the response structure for UPI-based valuation
type UPIValuationResponse struct {
	UPI      string `json:"upi"`
	Property struct {
		District     string  `json:"district"`
		Sector       string  `json:"sector"`
		PropertyType string  `json:"property_type"`
		AreaSqm      float64 `json:"area_sqm"`
	} `json:"property"`
	Valuation struct {
		BasePriceRWF  float64 `json:"base_price_rwf"`
		TotalValueRWF float64 `json:"total_value_rwf"`
		Coefficient   float64 `json:"coefficient"`
		GazetteRef    string  `json:"gazette_ref"`
		CalculatedAt  string  `json:"calculated_at"`
	} `json:"valuation"`
}

// GetValuationByUPI retrieves official land parcel data by UPI and calculates its valuation automatically
// This uses land_parcels as the source of truth for government official data
func (s *ValuationService) GetValuationByUPI(upi string) (*UPIValuationResponse, error) {
	cleanUPI := strings.TrimSpace(upi)
	if cleanUPI == "" {
		return nil, fmt.Errorf("UPI is required")
	}

	candidates := generateUPICandidates(cleanUPI)

	// 1) Primary source: land_parcels table
	var landParcel *models.LandParcel
	if s.landParcelRepo != nil {
		for _, candidate := range candidates {
			p, err := s.landParcelRepo.FindByUPI(candidate)
			if err == nil && p != nil {
				landParcel = p
				break
			}
		}
	}

	// 2) Backward-compatible fallback: properties table
	if landParcel == nil {
		for _, candidate := range candidates {
			property, err := s.propertyRepo.FindByUPI(candidate)
			if err == nil && property != nil {
				return s.buildResponseFromProperty(cleanUPI, property), nil
			}
		}
		return nil, fmt.Errorf("property not found for UPI: %s", cleanUPI)
	}

	// Get zone coefficient from land parcel or gazette service
	zoneCoeff := landParcel.ZoneCoefficient
	if zoneCoeff == 0 || zoneCoeff < 0.1 {
		// Fallback to gazette service if not in land parcel
		fetchedCoeff, err := s.gazetteService.GetZoneCoefficient(landParcel.District, landParcel.Sector)
		if err == nil {
			zoneCoeff = fetchedCoeff
		} else {
			zoneCoeff = 1.0
		}
	}

	// Calculate base price per sqm
	basePricePerSqm := landParcel.BasePricePerSqm
	if basePricePerSqm == 0 || basePricePerSqm < 0.01 {
		// Fallback to default pricing if not set in land parcel
		basePricePerSqm = s.getDefaultBasePriceForDistrict(landParcel.District, landParcel.PropertyType)
	}

	// Calculate total value = basePricePerSqm × landSizeSqm × zoneCoefficient
	totalValue := basePricePerSqm * landParcel.LandSizeSqm * zoneCoeff

	// Build response
	response := &UPIValuationResponse{UPI: cleanUPI}
	response.Property.District = landParcel.District
	response.Property.Sector = landParcel.Sector
	response.Property.PropertyType = landParcel.PropertyType
	response.Property.AreaSqm = landParcel.LandSizeSqm
	response.Valuation.BasePriceRWF = basePricePerSqm
	response.Valuation.TotalValueRWF = totalValue
	response.Valuation.Coefficient = zoneCoeff
	response.Valuation.GazetteRef = s.gazetteService.GetCurrentGazetteReference()
	response.Valuation.CalculatedAt = time.Now().Format(time.RFC3339)

	return response, nil
}

func (s *ValuationService) buildResponseFromProperty(upi string, property *models.Property) *UPIValuationResponse {
	// Fetch land parcel for location info
	var district, sector string
	if s.landParcelRepo != nil && property.UPI != "" {
		if parcel, err := s.landParcelRepo.FindByUPI(property.UPI); err == nil && parcel != nil {
			district = parcel.District
			sector = parcel.Sector
		}
	}
	zoneCoeff, err := s.gazetteService.GetZoneCoefficient(district, sector)
	if err != nil {
		if property.ZoneCoefficient > 0 {
			zoneCoeff = property.ZoneCoefficient
		} else {
			zoneCoeff = 1.0
		}
	}

	basePricePerSqm := 0.0
	if property.LandSize > 0 {
		basePricePerSqm = property.Price / property.LandSize
	}
	if basePricePerSqm <= 0 {
		basePricePerSqm = s.getDefaultBasePriceForDistrict(district, property.PropertyType)
	}

	totalValue := basePricePerSqm * property.LandSize * zoneCoeff

	response := &UPIValuationResponse{UPI: upi}
	response.Property.District = district
	response.Property.Sector = sector
	response.Property.PropertyType = property.PropertyType
	response.Property.AreaSqm = property.LandSize
	response.Valuation.BasePriceRWF = basePricePerSqm
	response.Valuation.TotalValueRWF = totalValue
	response.Valuation.Coefficient = zoneCoeff
	response.Valuation.GazetteRef = s.gazetteService.GetCurrentGazetteReference()
	response.Valuation.CalculatedAt = time.Now().Format(time.RFC3339)
	return response
}

func generateUPICandidates(raw string) []string {
	trimmed := strings.TrimSpace(raw)
	upper := strings.ToUpper(trimmed)

	// Remove separators users frequently type in parcel IDs.
	replacer := strings.NewReplacer(" ", "", "-", "", "/", "", ".", "")
	compact := replacer.Replace(upper)

	candidates := []string{trimmed, upper, compact}
	return uniqueStrings(candidates)
}

func uniqueStrings(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	result := make([]string, 0, len(values))
	for _, v := range values {
		if v == "" {
			continue
		}
		if _, ok := seen[v]; ok {
			continue
		}
		seen[v] = struct{}{}
		result = append(result, v)
	}
	return result
}

// getDefaultBasePriceForDistrict returns default base price per sqm for a district/property type
func (s *ValuationService) getDefaultBasePriceForDistrict(district, propertyType string) float64 {
	// Default pricing structure (RWF per sqm)
	priceMap := map[string]map[string]float64{
		"Kigali": {
			"residential":  75000,
			"commercial":   120000,
			"industrial":   95000,
			"agricultural": 15000,
			"mixed":        85000,
		},
		"Eastern Province": {
			"residential":  35000,
			"commercial":   55000,
			"industrial":   45000,
			"agricultural": 15000,
			"mixed":        40000,
		},
		"Western Province": {
			"residential":  45000,
			"commercial":   70000,
			"industrial":   55000,
			"agricultural": 20000,
			"mixed":        50000,
		},
		"Northern Province": {
			"residential":  38000,
			"commercial":   60000,
			"industrial":   48000,
			"agricultural": 18000,
			"mixed":        42000,
		},
		"Southern Province": {
			"residential":  32000,
			"commercial":   50000,
			"industrial":   42000,
			"agricultural": 12000,
			"mixed":        36000,
		},
	}

	if districtPrices, ok := priceMap[district]; ok {
		if price, ok := districtPrices[propertyType]; ok {
			return price
		}
		// Default to residential if property type not found
		if price, ok := districtPrices["residential"]; ok {
			return price
		}
	}

	// Fallback default
	return 50000.0
}
