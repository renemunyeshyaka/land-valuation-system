package services

import (
	"backend/internal/models"
)

// identifyFactors is now a standalone function for multi-field workflow
func IdentifyFactors(property *models.Property) []models.ValuationFactor {
	factors := []models.ValuationFactor{}
	// Add multi-field factor logic here as needed
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

// factorsToJSON is now a standalone function
func FactorsToJSON(factors []models.ValuationFactor) models.JSON {
	json := make(models.JSON)
	for _, factor := range factors {
		json[factor.Name] = factor
	}
	return json
}

// findComparableProperties is now a standalone function
func FindComparableProperties(property *models.Property) ([]models.Property, error) {
	// Implement multi-field comparable search as needed
	return []models.Property{}, nil
}

// getConfidenceLevel is now a standalone function
func GetConfidenceLevel(score float64) string {
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

// generateRecommendations is now a standalone function
func GenerateRecommendations(valuation *models.Valuation, factors []models.ValuationFactor) []string {
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

// UPIValuationResponse and UPI logic removed for multi-field workflow
