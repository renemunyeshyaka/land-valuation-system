package models

import "time"

// MarketplaceListing tracks a property's sync status with an external marketplace API.
// One row per (property, api_name) pair, upserted on every sync.
type MarketplaceListing struct {
	ID            uint       `gorm:"primarykey" json:"id"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	PropertyID    uint       `gorm:"not null;index;uniqueIndex:idx_property_api" json:"property_id"`
	APIName       string     `gorm:"not null;size:100;uniqueIndex:idx_property_api" json:"api_name"`
	ExternalID    string     `gorm:"size:255" json:"external_id"`
	ExternalURL   string     `gorm:"size:500" json:"external_url"`
	Title         string     `gorm:"size:255" json:"title"`
	Description   string     `gorm:"type:text" json:"description"`
	PriceRWF      float64    `gorm:"type:decimal(15,2)" json:"price_rwf"`
	ListingStatus string     `gorm:"size:50;default:not_configured" json:"listing_status"`
	LastSynced    *time.Time `json:"last_synced"`
}
