package models

import (
	"context"
	"time"

	"gorm.io/gorm"
)

type Transaction struct {
	ProviderTransactionID string    `json:"provider_transaction_id"`
	UserID                uint      `json:"user_id"`
	SubscriptionID        uint      `json:"subscription_id"`
	AmountRWF             float64   `json:"amount_rwf"`
	PaymentProvider       string    `json:"payment_provider"`
	Description           string    `json:"description"`
	ID                    uint      `gorm:"primarykey" json:"id"`
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"updated_at"`

	// Property
	PropertyID uint     `gorm:"not null;index" json:"property_id"`
	Property   Property `json:"property,omitempty"`

	// Parties
	SellerID uint  `gorm:"not null;index" json:"seller_id"`
	Seller   User  `json:"seller,omitempty"`
	BuyerID  uint  `gorm:"not null;index" json:"buyer_id"`
	Buyer    User  `json:"buyer,omitempty"`
	AgentID  *uint `json:"agent_id,omitempty"`
	Agent    *User `json:"agent,omitempty"`

	// Transaction Details
	TransactionType string  `gorm:"size:50;not null" json:"transaction_type"` // sale, lease, exchange
	Amount          float64 `json:"amount"`
	Currency        string  `gorm:"size:3;default:RWF" json:"currency"`
	Status          string  `gorm:"size:50;default:pending" json:"status"` // pending, completed, cancelled, disputed

	// Dates
	OfferDate      *time.Time `json:"offer_date,omitempty"`
	AcceptanceDate *time.Time `json:"acceptance_date,omitempty"`
	CompletionDate *time.Time `json:"completion_date,omitempty"`

	// Payment
	PaymentMethod    string `gorm:"size:50" json:"payment_method"` // cash, mortgage, mobile_money, bank_transfer
	PaymentStatus    string `gorm:"size:50;default:pending" json:"payment_status"`
	PaymentReference string `gorm:"size:255" json:"payment_reference"`

	// Documents
	Documents JSON `gorm:"type:jsonb" json:"documents"` // sale agreement, transfer deed, etc.

	// Fees
	ServiceFee  float64 `json:"service_fee"`
	TaxAmount   float64 `json:"tax_amount"`
	TotalAmount float64 `json:"total_amount"`

	// Metadata
	Notes string `gorm:"type:text" json:"notes"`
	Terms JSON   `gorm:"type:jsonb" json:"terms"`

	// Invoice email tracking
	InvoiceEmailed bool `gorm:"default:false" json:"invoice_emailed"`

	// Audit
	CreatedBy  uint       `json:"created_by"`
	ApprovedBy *uint      `json:"approved_by,omitempty"`
	ApprovedAt *time.Time `json:"approved_at,omitempty"`
}

func (t *Transaction) BeforeSave(tx *gorm.DB) error {
	t.TotalAmount = t.Amount + t.ServiceFee + t.TaxAmount
	return nil
}

type TransactionRepository interface {
	GetByID(ctx context.Context, id uint) (*Transaction, error)
}
