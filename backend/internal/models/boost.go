package models

import (
	"time"

	"gorm.io/gorm"
)

// Boost/Featured Listing for a property
// Each boost is tied to a property and has a start/end time and status
// Optionally, a payment/transaction ID can be linked

type PropertyBoost struct {
	ID         uint           `gorm:"primarykey" json:"id"`
	PropertyID uint           `gorm:"index;not null" json:"property_id"`
	UserID     uint           `gorm:"index;not null" json:"user_id"`
	StartTime  time.Time      `json:"start_time"`
	EndTime    time.Time      `json:"end_time"`
	Status     string         `gorm:"size:20;default:active" json:"status"` // active, expired, cancelled
	Type       string         `gorm:"size:20;default:featured" json:"type"` // featured, boost
	PaymentID  *uint          `gorm:"index" json:"payment_id,omitempty"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}
