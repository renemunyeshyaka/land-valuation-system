package models

import (
	"time"
)

type Valuation struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Property
	PropertyID uint     `gorm:"not null;index" json:"property_id"`
	Property   Property `json:"property,omitempty"`

	// Valuation Details
	ValuatorID uint `gorm:"not null;index" json:"valuator_id"`
	Valuator   User `json:"valuator,omitempty"`

	// Base Values
	BasePrice          float64 `json:"base_price"`
	ZoneCoefficient    float64 `json:"zone_coefficient"`
	MarketAdjustment   float64 `json:"market_adjustment"`
	LocationAdjustment float64 `json:"location_adjustment"`
	SizeAdjustment     float64 `json:"size_adjustment"`

	// Computed Values
	FinalPrice  float64 `json:"final_price"`
	PricePerSqm float64 `json:"price_per_sqm"`

	// Gazette Reference
	GazetteReference string     `gorm:"size:100" json:"gazette_reference"`
	GazetteDate      *time.Time `json:"gazette_date,omitempty"`

	// Additional Factors
	Factors JSON `gorm:"type:jsonb" json:"factors"` // proximity to amenities, road access, etc.

	// Confidence
	ConfidenceScore float64 `json:"confidence_score"` // 0-100
	ComparableCount int     `json:"comparable_count"`

	// Status
	Status string `gorm:"size:50;default:draft" json:"status"` // draft, published, archived
}

type ValuationFactor struct {
	Name        string  `json:"name"`
	Value       float64 `json:"value"`
	Weight      float64 `json:"weight"`
	Impact      string  `json:"impact"` // positive, negative, neutral
	Description string  `json:"description"`
}

// Custom JSON type for PostgreSQL
type JSON map[string]interface{}

func (v *Valuation) CalculateFinalPrice() {
	v.FinalPrice = v.BasePrice * v.ZoneCoefficient * v.MarketAdjustment * v.LocationAdjustment * v.SizeAdjustment

	if v.PricePerSqm == 0 && v.Property.LandSize > 0 {
		v.PricePerSqm = v.FinalPrice / v.Property.LandSize
	}

	// Calculate confidence score based on number of comparables and data quality
	v.calculateConfidenceScore()
}

func (v *Valuation) calculateConfidenceScore() {
	score := 70.0 // Base score

	// Add for comparables
	if v.ComparableCount > 0 {
		score += float64(v.ComparableCount) * 5
		if score > 100 {
			score = 100
		}
	}

	// Subtract for missing data
	if v.GazetteReference == "" {
		score -= 20
	}
	if v.Property.ZoneCoefficient == 0 {
		score -= 15
	}

	if score < 0 {
		score = 0
	}

	v.ConfidenceScore = score
}
