package repository

import (
	"context"
	"errors"
	"time"

	"backend/internal/models"

	"gorm.io/gorm"
)

type NotificationRepository struct {
	db *gorm.DB
}

func NewNotificationRepository(db *gorm.DB) *NotificationRepository {
	return &NotificationRepository{db: db}
}

func (r *NotificationRepository) Create(ctx context.Context, notification *models.Notification) (*models.Notification, error) {
	result := r.db.WithContext(ctx).Create(notification)
	if result.Error != nil {
		return nil, result.Error
	}
	return notification, nil
}

func (r *NotificationRepository) ListByUserID(ctx context.Context, userID string, limit int) ([]models.Notification, error) {
	var notifications []models.Notification

	query := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&notifications).Error; err != nil {
		return nil, err
	}

	return notifications, nil
}

func (r *NotificationRepository) MarkAsRead(ctx context.Context, notificationID, userID string) error {
	now := time.Now().UTC()

	result := r.db.WithContext(ctx).
		Model(&models.Notification{}).
		Where("id = ? AND user_id = ?", notificationID, userID).
		Updates(map[string]interface{}{
			"is_read": true,
			"read_at": now,
		})

	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return errors.New("notification not found")
	}

	return nil
}

// MarkAllAsReadByUser marks all unread notifications as read for a user
func (r *NotificationRepository) MarkAllAsReadByUser(ctx context.Context, userID string) (int64, error) {
	now := time.Now().UTC()

	result := r.db.WithContext(ctx).
		Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ?", userID, false).
		Updates(map[string]interface{}{
			"is_read": true,
			"read_at": now,
		})

	if result.Error != nil {
		return 0, result.Error
	}

	return result.RowsAffected, nil
}

// GetUnreadCountByUser returns the count of unread notifications for a user
func (r *NotificationRepository) GetUnreadCountByUser(ctx context.Context, userID string) (int64, error) {
	var count int64

	result := r.db.WithContext(ctx).
		Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ?", userID, false).
		Count(&count)

	if result.Error != nil {
		return 0, result.Error
	}

	return count, nil
}

// CreateMultiple creates multiple notifications (for broadcasting)
func (r *NotificationRepository) CreateMultiple(ctx context.Context, notifications []models.Notification) error {
	result := r.db.WithContext(ctx).CreateInBatches(notifications, 100)
	if result.Error != nil {
		return result.Error
	}
	return nil
}

// Delete removes a notification
func (r *NotificationRepository) Delete(ctx context.Context, notificationID, userID string) error {
	result := r.db.WithContext(ctx).
		Where("id = ? AND user_id = ?", notificationID, userID).
		Delete(&models.Notification{})

	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return errors.New("notification not found")
	}

	return nil
}
