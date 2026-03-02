package models

// Subscription is a placeholder struct for repository usage
// TODO: Define actual fields as needed
type Subscription struct {
	CreatedAt int64  `json:"created_at"`
	UpdatedAt int64  `json:"updated_at"`
	ID        uint   `json:"id"`
	UserID    uint   `json:"user_id"`
	Tier      string `json:"tier"`
	ExpiresAt int64  `json:"expires_at"`
	PlanType  string `json:"plan_type"`
	Status    string `json:"status"`
	StartDate int64  `json:"start_date"`
	EndDate   int64  `json:"end_date"`
	AutoRenew bool   `json:"auto_renew"`
}
