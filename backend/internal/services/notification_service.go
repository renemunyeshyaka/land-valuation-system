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
