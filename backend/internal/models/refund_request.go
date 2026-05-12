package models

import "time"

type RefundRequest struct {
	ID uint `gorm:"primarykey" json:"id"`

	UserID uint `gorm:"not null;index" json:"user_id"`
	User   User `json:"user,omitempty"`

	TransactionID uint        `gorm:"not null;index" json:"transaction_id"`
	Transaction   Transaction `json:"transaction,omitempty"`

	RequestedAmount float64 `gorm:"not null" json:"requested_amount"`
	Reason          string  `gorm:"type:text;not null" json:"reason"`
	Status          string  `gorm:"size:30;not null;default:pending;index" json:"status"`
	AdminNote       string  `gorm:"type:text" json:"admin_note"`

	ReviewedBy *uint      `gorm:"index" json:"reviewed_by,omitempty"`
	ReviewedAt *time.Time `json:"reviewed_at,omitempty"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
