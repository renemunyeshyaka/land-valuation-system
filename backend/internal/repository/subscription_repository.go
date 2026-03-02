package repository

import (
	"context"

	"backend/internal/models"

	"github.com/jmoiron/sqlx"
)

type SubscriptionRepository struct {
	db *sqlx.DB
}

func NewSubscriptionRepository(db *sqlx.DB) *SubscriptionRepository {
	return &SubscriptionRepository{db: db}
}

// Create creates a new subscription
func (r *SubscriptionRepository) Create(ctx context.Context, subscription *models.Subscription) (*models.Subscription, error) {
	query := `
		INSERT INTO subscriptions (user_id, plan_type, status, start_date, end_date, auto_renew)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, user_id, plan_type, status, start_date, end_date, auto_renew, created_at, updated_at
	`

	var savedSub models.Subscription
	err := r.db.QueryRowContext(ctx, query,
		subscription.UserID,
		subscription.PlanType,
		subscription.Status,
		subscription.StartDate,
		subscription.EndDate,
		subscription.AutoRenew,
	).Scan(
		&savedSub.ID,
		&savedSub.UserID,
		&savedSub.PlanType,
		&savedSub.Status,
		&savedSub.StartDate,
		&savedSub.EndDate,
		&savedSub.AutoRenew,
		&savedSub.CreatedAt,
		&savedSub.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &savedSub, nil
}

// GetByID retrieves subscription by ID
func (r *SubscriptionRepository) GetByID(ctx context.Context, id string) (*models.Subscription, error) {
	query := `
		SELECT id, user_id, plan_type, status, start_date, end_date, auto_renew, created_at, updated_at
		FROM subscriptions
		WHERE id = $1
	`

	var sub models.Subscription
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&sub.ID,
		&sub.UserID,
		&sub.PlanType,
		&sub.Status,
		&sub.StartDate,
		&sub.EndDate,
		&sub.AutoRenew,
		&sub.CreatedAt,
		&sub.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &sub, nil
}

// GetByUserID retrieves current active subscription for user
func (r *SubscriptionRepository) GetByUserID(ctx context.Context, userID string) (*models.Subscription, error) {
	query := `
		SELECT id, user_id, plan_type, status, start_date, end_date, auto_renew, created_at, updated_at
		FROM subscriptions
		WHERE user_id = $1 AND status = 'active'
		ORDER BY created_at DESC
		LIMIT 1
	`

	var sub models.Subscription
	err := r.db.QueryRowContext(ctx, query, userID).Scan(
		&sub.ID,
		&sub.UserID,
		&sub.PlanType,
		&sub.Status,
		&sub.StartDate,
		&sub.EndDate,
		&sub.AutoRenew,
		&sub.CreatedAt,
		&sub.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &sub, nil
}

// Update updates subscription
func (r *SubscriptionRepository) Update(ctx context.Context, subscription *models.Subscription) (*models.Subscription, error) {
	query := `
		UPDATE subscriptions 
		SET plan_type = $1, status = $2, end_date = $3, auto_renew = $4, updated_at = CURRENT_TIMESTAMP
		WHERE id = $5
		RETURNING id, user_id, plan_type, status, start_date, end_date, auto_renew, created_at, updated_at
	`

	var updatedSub models.Subscription
	err := r.db.QueryRowContext(ctx, query,
		subscription.PlanType,
		subscription.Status,
		subscription.EndDate,
		subscription.AutoRenew,
		subscription.ID,
	).Scan(
		&updatedSub.ID,
		&updatedSub.UserID,
		&updatedSub.PlanType,
		&updatedSub.Status,
		&updatedSub.StartDate,
		&updatedSub.EndDate,
		&updatedSub.AutoRenew,
		&updatedSub.CreatedAt,
		&updatedSub.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &updatedSub, nil
}

// UpdateStatus updates subscription status
func (r *SubscriptionRepository) UpdateStatus(ctx context.Context, subscriptionID, status string) error {
	query := `UPDATE subscriptions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`
	_, err := r.db.ExecContext(ctx, query, status, subscriptionID)
	return err
}

// Cancel cancels subscription
func (r *SubscriptionRepository) Cancel(ctx context.Context, subscriptionID, reason string) error {
	query := `
		UPDATE subscriptions 
		SET status = 'cancelled', cancellation_date = CURRENT_TIMESTAMP, cancellation_reason = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`
	_, err := r.db.ExecContext(ctx, query, reason, subscriptionID)
	return err
}

// GetAllActive retrieves all active subscriptions
func (r *SubscriptionRepository) GetAllActive(ctx context.Context, offset, limit int) ([]*models.Subscription, int, error) {
	countQuery := `SELECT COUNT(*) FROM subscriptions WHERE status = 'active'`
	var total int
	err := r.db.QueryRowContext(ctx, countQuery).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, user_id, plan_type, status, start_date, end_date, auto_renew, created_at
		FROM subscriptions
		WHERE status = 'active'
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := r.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var subscriptions []*models.Subscription
	for rows.Next() {
		var sub models.Subscription
		err := rows.Scan(
			&sub.ID,
			&sub.UserID,
			&sub.PlanType,
			&sub.Status,
			&sub.StartDate,
			&sub.EndDate,
			&sub.AutoRenew,
			&sub.CreatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		subscriptions = append(subscriptions, &sub)
	}

	return subscriptions, total, nil
}

// GetSubscriptionHistory retrieves user subscription history
func (r *SubscriptionRepository) GetSubscriptionHistory(ctx context.Context, userID string, offset, limit int) ([]*models.Subscription, int, error) {
	countQuery := `SELECT COUNT(*) FROM subscriptions WHERE user_id = $1`
	var total int
	err := r.db.QueryRowContext(ctx, countQuery, userID).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, user_id, plan_type, status, start_date, end_date, auto_renew, created_at, updated_at
		FROM subscriptions
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.QueryContext(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var subscriptions []*models.Subscription
	for rows.Next() {
		var sub models.Subscription
		err := rows.Scan(
			&sub.ID,
			&sub.UserID,
			&sub.PlanType,
			&sub.Status,
			&sub.StartDate,
			&sub.EndDate,
			&sub.AutoRenew,
			&sub.CreatedAt,
			&sub.UpdatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		subscriptions = append(subscriptions, &sub)
	}

	return subscriptions, total, nil
}
