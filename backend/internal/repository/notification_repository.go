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
