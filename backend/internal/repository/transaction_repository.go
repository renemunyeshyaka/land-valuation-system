package repository

import (
	"context"

	"backend/internal/models"

	"github.com/jmoiron/sqlx"
)

type TransactionRepository struct {
	db *sqlx.DB
}

func NewTransactionRepository(db *sqlx.DB) *TransactionRepository {
	return &TransactionRepository{db: db}
}

// Create creates a new transaction
func (r *TransactionRepository) Create(ctx context.Context, transaction *models.Transaction) (*models.Transaction, error) {
	query := `
		INSERT INTO transactions 
		(user_id, subscription_id, transaction_type, amount_rwf, payment_method, payment_provider, status, description)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, user_id, transaction_type, amount_rwf, payment_method, status, created_at, updated_at
	`

	var savedTx models.Transaction
	err := r.db.QueryRowContext(ctx, query,
		transaction.UserID,
		transaction.SubscriptionID,
		transaction.TransactionType,
		transaction.AmountRWF,
		transaction.PaymentMethod,
		transaction.PaymentProvider,
		transaction.Status,
		transaction.Description,
	).Scan(
		&savedTx.ID,
		&savedTx.UserID,
		&savedTx.TransactionType,
		&savedTx.AmountRWF,
		&savedTx.PaymentMethod,
		&savedTx.Status,
		&savedTx.CreatedAt,
		&savedTx.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &savedTx, nil
}

// GetByID retrieves transaction by ID
func (r *TransactionRepository) GetByID(ctx context.Context, id string) (*models.Transaction, error) {
	query := `
		SELECT id, user_id, subscription_id, transaction_type, amount_rwf, payment_method, provider_transaction_id, status, description, created_at, updated_at
		FROM transactions
		WHERE id = $1
	`

	var tx models.Transaction
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&tx.ID,
		&tx.UserID,
		&tx.SubscriptionID,
		&tx.TransactionType,
		&tx.AmountRWF,
		&tx.PaymentMethod,
		&tx.ProviderTransactionID,
		&tx.Status,
		&tx.Description,
		&tx.CreatedAt,
		&tx.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &tx, nil
}

// GetByUserID retrieves transactions by user ID with pagination
func (r *TransactionRepository) GetByUserID(ctx context.Context, userID string, offset, limit int) ([]*models.Transaction, int, error) {
	countQuery := `SELECT COUNT(*) FROM transactions WHERE user_id = $1`
	var total int
	err := r.db.QueryRowContext(ctx, countQuery, userID).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, user_id, transaction_type, amount_rwf, payment_method, status, description, created_at, updated_at
		FROM transactions
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.QueryContext(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var transactions []*models.Transaction
	for rows.Next() {
		var tx models.Transaction
		err := rows.Scan(
			&tx.ID,
			&tx.UserID,
			&tx.TransactionType,
			&tx.AmountRWF,
			&tx.PaymentMethod,
			&tx.Status,
			&tx.Description,
			&tx.CreatedAt,
			&tx.UpdatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		transactions = append(transactions, &tx)
	}

	return transactions, total, nil
}

// UpdateStatus updates transaction status
func (r *TransactionRepository) UpdateStatus(ctx context.Context, transactionID, status string) error {
	query := `UPDATE transactions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`
	_, err := r.db.ExecContext(ctx, query, status, transactionID)
	return err
}

// UpdateProviderTransactionID updates provider transaction ID
func (r *TransactionRepository) UpdateProviderTransactionID(ctx context.Context, transactionID, providerID string) error {
	query := `UPDATE transactions SET provider_transaction_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`
	_, err := r.db.ExecContext(ctx, query, providerID, transactionID)
	return err
}

// GetByProviderTransactionID retrieves transaction by provider ID
func (r *TransactionRepository) GetByProviderTransactionID(ctx context.Context, providerTransactionID string) (*models.Transaction, error) {
	query := `
		SELECT id, user_id, transaction_type, amount_rwf, status, created_at
		FROM transactions
		WHERE provider_transaction_id = $1
	`

	var tx models.Transaction
	err := r.db.QueryRowContext(ctx, query, providerTransactionID).Scan(
		&tx.ID,
		&tx.UserID,
		&tx.TransactionType,
		&tx.AmountRWF,
		&tx.Status,
		&tx.CreatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &tx, nil
}

// GetBySubscriptionID retrieves transactions by subscription ID
func (r *TransactionRepository) GetBySubscriptionID(ctx context.Context, subscriptionID string) ([]*models.Transaction, error) {
	query := `
		SELECT id, user_id, amount_rwf, status, created_at
		FROM transactions
		WHERE subscription_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, subscriptionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var transactions []*models.Transaction
	for rows.Next() {
		var tx models.Transaction
		err := rows.Scan(
			&tx.ID,
			&tx.UserID,
			&tx.AmountRWF,
			&tx.Status,
			&tx.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		transactions = append(transactions, &tx)
	}

	return transactions, nil
}
