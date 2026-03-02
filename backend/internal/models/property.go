package models

import (
	"time"

	"github.com/lib/pq"
	"gorm.io/gorm"
)

// PropertyFilter is used for filtering property queries
type PropertyFilter struct {
	Page         int
	Limit        int
	PropertyType string
	Status       string
	District     string
	MinPrice     float64
	MaxPrice     float64
	MinSize      float64
	MaxSize      float64
	IsVerified   *bool
	IsDiaspora   *bool
	Latitude     float64
	Longitude    float64
	Radius       float64
	SortBy       string
	SortOrder    string
}

type Property struct {
	AreaSqm          float64        `json:"area_sqm"`
	MarketPriceRWF   float64        `json:"market_price_rwf"`
	GeometryBoundary string         `json:"geometry_boundary"`
	LocationName     string         `json:"location_name"`
	ID               uint           `gorm:"primarykey" json:"id"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`

	// Basic Information
	Title        string `gorm:"not null;size:255" json:"title"`
	Description  string `gorm:"type:text" json:"description"`
	PropertyType string `gorm:"not null;size:50" json:"property_type"`            // residential, commercial, agricultural, industrial
	Status       string `gorm:"not null;size:50;default:available" json:"status"` // available, pending, sold, rented

	// Location
	District  string  `gorm:"not null;size:100;index" json:"district"`
	Sector    string  `gorm:"size:100" json:"sector"`
	Cell      string  `gorm:"size:100" json:"cell"`
	Village   string  `gorm:"size:100" json:"village"`
	Address   string  `gorm:"size:255" json:"address"`
	Latitude  float64 `gorm:"type:decimal(10,8)" json:"latitude"`
	Longitude float64 `gorm:"type:decimal(11,8)" json:"longitude"`

	// Property Details
	LandSize         float64 `gorm:"not null" json:"land_size"` // in square meters
	SizeUnit         string  `gorm:"size:10;default:sqm" json:"size_unit"`
	ZoneCoefficient  float64 `gorm:"type:decimal(5,2)" json:"zone_coefficient"`
	GazetteReference string  `gorm:"size:100;index" json:"gazette_reference"`

	// Pricing
	Price       float64 `gorm:"not null" json:"price"`
	PricePerSqm float64 `gorm:"-" json:"price_per_sqm"` // computed
	Currency    string  `gorm:"size:3;default:RWF" json:"currency"`

	// Features
	Features  pq.StringArray `gorm:"type:text[]" json:"features"`
	Images    pq.StringArray `gorm:"type:text[]" json:"images"`
	Documents pq.StringArray `gorm:"type:text[]" json:"documents"`

	// Ownership
	OwnerID    uint `gorm:"not null;index" json:"owner_id"`
	Owner      User `gorm:"foreignKey:OwnerID" json:"owner,omitempty"`
	IsVerified bool `gorm:"default:false" json:"is_verified"`
	IsDiaspora bool `gorm:"default:false" json:"is_diaspora"`

	// Statistics
	Views      int `gorm:"default:0" json:"views"`
	Interested int `gorm:"default:0" json:"interested"`

	// Metadata
	LastValuation  *time.Time `json:"last_valuation,omitempty"`
	ValuationCount int        `gorm:"default:0" json:"valuation_count"`

	// Relationships
	Valuations []Valuation `json:"valuations,omitempty"`
	SavedBy    []User      `gorm:"many2many:user_saved_properties;" json:"-"`
}

func (p *Property) BeforeSave(tx *gorm.DB) error {
	if p.LandSize > 0 {
		p.PricePerSqm = p.Price / p.LandSize
	}
	return nil
}
