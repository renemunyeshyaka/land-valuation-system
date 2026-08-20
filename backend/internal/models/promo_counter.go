package models

import "time"

// PromoCounter tracks how many users have been granted a promotional benefit.
// Used by the early-adopter promotion (the first 20,000 new sign-ups get a
// one-month free membership).
type PromoCounter struct {
	ID         uint      `gorm:"primarykey" json:"id"`
	Name       string    `gorm:"size:100;uniqueIndex;not null" json:"name"`
	Granted    int       `gorm:"not null;default:0" json:"granted"`
	GrantLimit int       `gorm:"column:grant_limit;not null;default:20000" json:"limit"`
	UpdatedAt  time.Time `json:"updated_at"`
}
