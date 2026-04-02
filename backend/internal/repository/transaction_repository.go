// (removed duplicate/misplaced ListPending)
package repository

import (
	"context"
	"errors"
	"strconv"

	"backend/internal/models"

	"gorm.io/gorm"
)

type TransactionRepository struct {
	db *gorm.DB
}

func NewTransactionRepository(db *gorm.DB) *TransactionRepository {
	return &TransactionRepository{db: db}
}

// Create creates a new transaction
func (r *TransactionRepository) Create(ctx context.Context, transaction *models.Transaction) (*models.Transaction, error) {
	result := r.db.WithContext(ctx).Create(transaction)
	if result.Error != nil {
		return nil, result.Error
	}
	return transaction, nil
}

// GetByID retrieves a transaction by ID
func (r *TransactionRepository) GetByID(ctx context.Context, id uint) (*models.Transaction, error) {
	var transaction models.Transaction
	result := r.db.WithContext(ctx).Where("id = ?", id).First(&transaction)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("transaction not found")
		}
		return nil, result.Error
	}
	return &transaction, nil
}

// GetByProviderTransactionID retrieves transaction by provider reference
func (r *TransactionRepository) GetByProviderTransactionID(ctx context.Context, providerID string) (*models.Transaction, error) {
	var transaction models.Transaction
	result := r.db.WithContext(ctx).Where("provider_transaction_id = ?", providerID).First(&transaction)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("transaction not found")
		}
		return nil, result.Error
	}
	return &transaction, nil
}

// Update updates a transaction
func (r *TransactionRepository) Update(ctx context.Context, transaction *models.Transaction) error {
	return r.db.WithContext(ctx).Save(transaction).Error
}

// UpdateStatus updates transaction status
func (r *TransactionRepository) UpdateStatus(ctx context.Context, transactionID uint, status string) error {
	return r.db.WithContext(ctx).Model(&models.Transaction{}).
		Where("id = ?", transactionID).
		Update("status", status).Error
}

// ListByUser retrieves transactions for a user with pagination
func (r *TransactionRepository) ListByUser(ctx context.Context, userID uint, page, pageSize int) ([]models.Transaction, int64, error) {
	var transactions []models.Transaction
	var total int64

	query := r.db.WithContext(ctx).Model(&models.Transaction{}).Where("user_id = ? OR buyer_id = ?", userID, userID)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	result := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&transactions)
	if result.Error != nil {
		return nil, 0, result.Error
	}

	return transactions, total, nil
}

// GetByUserID alias for ListByUser - accepts string userID for compatibility
func (r *TransactionRepository) GetByUserID(ctx context.Context, userID string, offset, limit int) ([]models.Transaction, int64, error) {
	userIDUint, _ := strconv.ParseUint(userID, 10, 32)
	page := (offset / limit) + 1

	return r.ListByUser(ctx, uint(userIDUint), page, limit)
}

// ListBySubscription retrieves transactions for a subscription
func (r *TransactionRepository) ListBySubscription(ctx context.Context, subscriptionID uint) ([]models.Transaction, error) {
	var transactions []models.Transaction
	result := r.db.WithContext(ctx).Where("subscription_id = ?", subscriptionID).Order("created_at DESC").Find(&transactions)
	if result.Error != nil {
		return nil, result.Error
	}
	return transactions, nil
}

// GetStatistics returns transaction statistics (incomplete, not implemented)
// func (r *TransactionRepository) GetStatistics(ctx context.Context, userID uint) (map[string]interface{}, error) {
//     stats := make(map[string]interface{})
//     // Not implemented
//     return nil, nil
// }

// ListPending returns all transactions with status 'pending'
func (r *TransactionRepository) ListPending(ctx context.Context) ([]models.Transaction, error) {
	var txns []models.Transaction
	if err := r.db.WithContext(ctx).Where("status = ?", "pending").Find(&txns).Error; err != nil {
		return nil, err
	}
	return txns, nil
}
