package repository

import (
	"context"
	"fmt"
	"strconv"

	"backend/internal/models"

	"gorm.io/gorm"
)

type SubscriptionRepository struct {
	db *gorm.DB
}

func NewSubscriptionRepository(db *gorm.DB) *SubscriptionRepository {
	return &SubscriptionRepository{db: db}
}

// Create creates a new subscription
func (r *SubscriptionRepository) Create(ctx context.Context, subscription *models.Subscription) (*models.Subscription, error) {
	if err := r.db.WithContext(ctx).Create(subscription).Error; err != nil {
		return nil, err
	}
	return subscription, nil
}

// GetByID retrieves subscription by ID
func (r *SubscriptionRepository) GetByID(ctx context.Context, id string) (*models.Subscription, error) {
	var sub models.Subscription
	if err := r.db.WithContext(ctx).First(&sub, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &sub, nil
}

// GetByUserID retrieves current active subscription for user
func (r *SubscriptionRepository) GetByUserID(ctx context.Context, userID string) (*models.Subscription, error) {
	var sub models.Subscription
	userIDUint, err := strconv.ParseUint(userID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	if err := r.db.WithContext(ctx).
		Where("user_id = ? AND status = ?", uint(userIDUint), "active").
		Order("created_at DESC").
		First(&sub).Error; err != nil {
		return nil, err
	}
	return &sub, nil
}

// Update updates subscription
func (r *SubscriptionRepository) Update(ctx context.Context, subscription *models.Subscription) (*models.Subscription, error) {
	if err := r.db.WithContext(ctx).Save(subscription).Error; err != nil {
		return nil, err
	}
	return subscription, nil
}

// UpdateStatus updates subscription status
func (r *SubscriptionRepository) UpdateStatus(ctx context.Context, subscriptionID, status string) error {
	return r.db.WithContext(ctx).
		Model(&models.Subscription{}).
		Where("id = ?", subscriptionID).
		Update("status", status).Error
}

// Cancel cancels subscription
func (r *SubscriptionRepository) Cancel(ctx context.Context, subscriptionID, reason string) error {
	return r.db.WithContext(ctx).
		Model(&models.Subscription{}).
		Where("id = ?", subscriptionID).
		Updates(map[string]interface{}{
			"status":              "cancelled",
			"cancellation_reason": reason,
		}).Error
}

// GetAllActive retrieves all active subscriptions
func (r *SubscriptionRepository) GetAllActive(ctx context.Context, offset, limit int) ([]*models.Subscription, int, error) {
	var subscriptions []*models.Subscription
	var total int64

	// Get total count
	if err := r.db.WithContext(ctx).
		Model(&models.Subscription{}).
		Where("status = ?", "active").
		Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	if err := r.db.WithContext(ctx).
		Where("status = ?", "active").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&subscriptions).Error; err != nil {
		return nil, 0, err
	}

	return subscriptions, int(total), nil
}

// GetSubscriptionHistory retrieves user subscription history
func (r *SubscriptionRepository) GetSubscriptionHistory(ctx context.Context, userID string, offset, limit int) ([]*models.Subscription, int, error) {
	var subscriptions []*models.Subscription
	var total int64

	userIDUint, err := strconv.ParseUint(userID, 10, 32)
	if err != nil {
		return nil, 0, fmt.Errorf("invalid user ID: %w", err)
	}

	// Get total count
	if err := r.db.WithContext(ctx).
		Model(&models.Subscription{}).
		Where("user_id = ?", uint(userIDUint)).
		Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	if err := r.db.WithContext(ctx).
		Where("user_id = ?", uint(userIDUint)).
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&subscriptions).Error; err != nil {
		return nil, 0, err
	}

	return subscriptions, int(total), nil
}
