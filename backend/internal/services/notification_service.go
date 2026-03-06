package services

import (
	"context"
	"strconv"

	"backend/internal/models"
	"backend/internal/repository"

	"gorm.io/gorm"
)

type NotificationService struct {
	notificationRepo *repository.NotificationRepository
	userRepo         *repository.UserRepository
}

type SendNotificationInput struct {
	UserID   string
	Title    string
	Message  string
	Type     string
	SentByID string
}

func NewNotificationService(db *gorm.DB) *NotificationService {
	return &NotificationService{
		notificationRepo: repository.NewNotificationRepository(db),
		userRepo:         repository.NewUserRepository(db),
	}
}

func (s *NotificationService) SendToUser(ctx context.Context, input SendNotificationInput) (*models.Notification, error) {
	user, err := s.userRepo.GetByID(ctx, input.UserID)
	if err != nil {
		return nil, err
	}

	senderID, _ := strconv.ParseUint(input.SentByID, 10, 64)

	notification := &models.Notification{
		UserID:   user.ID,
		Title:    input.Title,
		Message:  input.Message,
		Type:     input.Type,
		IsRead:   false,
		SentByID: uint(senderID),
	}

	return s.notificationRepo.Create(ctx, notification)
}

func (s *NotificationService) ListForUser(ctx context.Context, userID string, limit int) ([]models.Notification, error) {
	return s.notificationRepo.ListByUserID(ctx, userID, limit)
}

func (s *NotificationService) MarkAsRead(ctx context.Context, notificationID, userID string) error {
	return s.notificationRepo.MarkAsRead(ctx, notificationID, userID)
}

// MarkAllAsRead marks all unread notifications as read for a user
func (s *NotificationService) MarkAllAsRead(ctx context.Context, userID string) (int64, error) {
	return s.notificationRepo.MarkAllAsReadByUser(ctx, userID)
}

// GetUnreadCount returns the count of unread notifications for a user
func (s *NotificationService) GetUnreadCount(ctx context.Context, userID string) (int64, error) {
	return s.notificationRepo.GetUnreadCountByUser(ctx, userID)
}

// BroadcastNotification sends a notification to all users or a specific role
func (s *NotificationService) BroadcastNotification(ctx context.Context, title, message, notificationType, userRole string, senderID string) (int64, error) {
	// Get all active users (optionally filtered by role)
	users, err := s.userRepo.GetActiveByRole(ctx, userRole)
	if err != nil {
		return 0, err
	}

	if len(users) == 0 {
		return 0, nil
	}

	// Create notifications for each user
	notifications := make([]models.Notification, len(users))
	senderIDUint := uint(0)
	if senderID != "" {
		if id, err := strconv.ParseUint(senderID, 10, 64); err == nil {
			senderIDUint = uint(id)
		}
	}

	for i, user := range users {
		notifications[i] = models.Notification{
			UserID:   user.ID,
			Title:    title,
			Message:  message,
			Type:     notificationType,
			IsRead:   false,
			SentByID: senderIDUint,
		}
	}

	if err := s.notificationRepo.CreateMultiple(ctx, notifications); err != nil {
		return 0, err
	}

	return int64(len(users)), nil
}

// DeleteNotification removes a notification for a user
func (s *NotificationService) DeleteNotification(ctx context.Context, notificationID, userID string) error {
	return s.notificationRepo.Delete(ctx, notificationID, userID)
}
