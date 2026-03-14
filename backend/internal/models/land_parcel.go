package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// LandParcel represents official government land parcel data (from lands.rw or similar authority)
// This is the source of truth for land valuation and pricing
type LandParcel struct {
	ID uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`

	// UPI - Unique Parcel Identifier (official government identifier)
	UPI string `gorm:"size:50;not null;unique;index" json:"upi"`

	// Location
	District string `gorm:"not null;size:100;index" json:"district"`
	Sector   string `gorm:"not null;size:100;index" json:"sector"`
	Cell     string `gorm:"size:100" json:"cell"`
	Village  string `gorm:"size:100" json:"village"`

	// Land dimensions
	LandSizeSqm float64 `gorm:"not null;type:decimal(15,2)" json:"land_size_sqm"`
	AreaSqm     float64 `gorm:"type:decimal(15,2)" json:"area_sqm"` // Total area including buildings

	// Pricing & Valuation
	BasePricePerSqm float64 `gorm:"type:decimal(15,2)" json:"base_price_per_sqm"`
	ZoneCoefficient float64 `gorm:"type:decimal(5,3);default:1.0" json:"zone_coefficient"`

	// Classification
	PropertyType  string `gorm:"size:50" json:"property_type"` // residential, commercial, agricultural, mixed, unknown
	ZoningType    string `gorm:"size:100" json:"zoning_type"`
	BuildingRests string `gorm:"type:text" json:"building_restrictions"`

	// Geolocation
	Latitude  float64 `gorm:"type:decimal(10,8)" json:"latitude"`
	Longitude float64 `gorm:"type:decimal(11,8)" json:"longitude"`

	// Data tracking
	Source   string          `gorm:"size:100;default:lands.rw;index" json:"source"` // lands.rw, manual_entry, etc.
	SyncedAt *time.Time      `json:"synced_at"`                                     // When this data was synced from source
	Metadata json.RawMessage `gorm:"type:jsonb" json:"metadata"`                    // Additional arbitrary data

	// Auditlog
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Properties []Property `gorm:"foreignKey:LandParcelID" json:"properties,omitempty"`
}

// BeforeCreate generates UUID if not set
func (lp *LandParcel) BeforeCreate(tx *gorm.DB) error {
	if lp.ID == uuid.Nil {
		lp.ID = uuid.New()
	}
	return nil
}

// ToJSON converts LandParcel to JSON for API responses
func (lp *LandParcel) ToJSON() map[string]interface{} {
	return map[string]interface{}{
		"id":                    lp.ID,
		"upi":                   lp.UPI,
		"district":              lp.District,
		"sector":                lp.Sector,
		"cell":                  lp.Cell,
		"village":               lp.Village,
		"land_size_sqm":         lp.LandSizeSqm,
		"area_sqm":              lp.AreaSqm,
		"base_price_per_sqm":    lp.BasePricePerSqm,
		"zone_coefficient":      lp.ZoneCoefficient,
		"property_type":         lp.PropertyType,
		"zoning_type":           lp.ZoningType,
		"building_restrictions": lp.BuildingRests,
		"latitude":              lp.Latitude,
		"longitude":             lp.Longitude,
		"source":                lp.Source,
		"synced_at":             lp.SyncedAt,
		"created_at":            lp.CreatedAt,
		"updated_at":            lp.UpdatedAt,
	}
}

// LandParcelFilter is used for filtering land parcel queries
type LandParcelFilter struct {
	UPI          string
	District     string
	Sector       string
	Cell         string
	PlotNumber   string // for partial/suffix search
	PropertyType string
	Source       string
	MinSize      float64
	MaxSize      float64
	Page         int
	Limit        int
	SortBy       string
	SortOrder    string
}
