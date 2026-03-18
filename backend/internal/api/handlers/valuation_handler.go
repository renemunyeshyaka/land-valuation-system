package handlers

// getZoneCoefficient returns the Official Gazette zone coefficient
func getZoneCoefficient(district string) float64 {
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
func calculateMarketAdjustment(propertyType string) float64 {
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

func calculateLocationAdjustment(district string) float64 {
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

func calculateSizeAdjustment(size float64) float64 {
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

// Removed: calculateConfidenceWithParcel (legacy, references obsolete types)

func getConfidenceLevel(score float64) string {
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

// Removed: identifyFactors (legacy, references obsolete types)

// Removed: generateRecommendationsWithParcel (legacy, references obsolete types)
