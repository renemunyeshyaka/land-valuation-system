package models

import "time"

// Subscription is a placeholder struct for repository usage
// TODO: Define actual fields as needed
type Subscription struct {
	ID               uint      `gorm:"primarykey" json:"id"`
	UserID           uint      `json:"user_id"`
	PlanType         string    `json:"plan_type"`
	Status           string    `json:"status"`
	StartDate        time.Time `json:"start_date"`
	EndDate          time.Time `json:"end_date"`
	AutoRenew        bool      `json:"auto_renew"`
	Amount           float64   `json:"amount"`
	Currency         string    `json:"currency"`
	PaymentMethod    string    `json:"payment_method"`
	PaymentReference string    `json:"payment_reference"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}
