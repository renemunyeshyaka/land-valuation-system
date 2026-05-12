package models

import "time"

// UserPropertyView stores the latest view timestamp for a user-property pair.
type UserPropertyView struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	UserID       uint      `gorm:"not null;index;uniqueIndex:idx_user_property_view" json:"user_id"`
	PropertyID   uint      `gorm:"not null;index;uniqueIndex:idx_user_property_view" json:"property_id"`
	LastViewedAt time.Time `gorm:"not null;index" json:"last_viewed_at"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`

	User     User     `gorm:"foreignKey:UserID" json:"-"`
	Property Property `gorm:"foreignKey:PropertyID" json:"-"`
}
