package models

import "time"

// Currency represents a supported currency with its exchange rate to RWF
type Currency struct {
	ID                uint       `gorm:"primarykey" json:"id"`
	ISOCode           string     `gorm:"uniqueIndex;not null;size:3" json:"iso_code"`
	Symbol            string     `gorm:"not null;size:10" json:"symbol"`
	Name              string     `gorm:"not null;size:100" json:"name"`
	ExchangeRateToRWF float64    `gorm:"not null;type:decimal(20,6)" json:"exchange_rate_to_rwf"`
	IsBase            bool       `gorm:"default:false" json:"is_base"`
	IsActive          bool       `gorm:"default:true" json:"is_active"`
	Region            string     `gorm:"size:50" json:"region"`
	LastSyncedAt      *time.Time `json:"last_synced_at,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

// TableName overrides the table name
func (Currency) TableName() string {
	return "currencies"
}
