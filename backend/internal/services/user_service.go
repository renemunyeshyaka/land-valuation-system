
package services

import (
	"context"

	"backend/internal/models"
	"backend/internal/repository"

	"gorm.io/gorm"
)

// ListUsers retrieves paginated users for admin
func (s *UserService) ListUsers(ctx context.Context, offset, limit int, filters map[string]string) ([]*models.User, int, error) {
	return s.userRepo.List(ctx, offset, limit, filters)
}

type UserService struct {
	userRepo *repository.UserRepository
	db       *gorm.DB
}

func NewUserService(db *gorm.DB) *UserService {
	return &UserService{
		userRepo: repository.NewUserRepository(db),
		db:       db,
	}
}

// GetUserByID retrieves user by ID
func (s *UserService) GetUserByID(ctx context.Context, userID string) (*models.User, error) {
	return s.userRepo.GetByID(ctx, userID)
}

// UpdateUser updates user information
func (s *UserService) UpdateUser(ctx context.Context, userID string, updates *models.User) (*models.User, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	if updates.FirstName != "" {
		user.FirstName = updates.FirstName
	}
	if updates.LastName != "" {
		user.LastName = updates.LastName
	}
	if updates.Phone != "" {
		user.Phone = updates.Phone
	}
	if updates.ProfilePictureURL != "" {
		user.ProfilePictureURL = updates.ProfilePictureURL
	}
	if updates.Bio != "" {
		user.Bio = updates.Bio
	}
	if updates.LanguagePreference != "" {
		user.LanguagePreference = updates.LanguagePreference
	}
	if updates.City != "" {
		user.City = updates.City
	}
	if updates.Country != "" {
		user.Country = updates.Country
	}

	return s.userRepo.Update(ctx, user)
}

// SubmitKYC submits KYC documentation
func (s *UserService) SubmitKYC(ctx context.Context, userID, nationalID, documentURL string) (*models.User, error) {
	if err := s.userRepo.UpdateKYCStatus(ctx, userID, "submitted", documentURL); err != nil {
		return nil, err
	}

	return s.userRepo.GetByID(ctx, userID)
}

// GetKYCStatus retrieves user KYC status
func (s *UserService) GetKYCStatus(ctx context.Context, userID string) (string, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return "", err
	}

	return user.KYCStatus, nil
}

// ChangePassword changes user password
func (s *UserService) ChangePassword(ctx context.Context, userID, currentPassword, newPassword string) error {
	_, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return err
	}

	// TODO: Verify current password and hash new password
	_ = currentPassword

	return s.userRepo.UpdatePassword(ctx, userID, newPassword)
}

// GetAccountSettings retrieves user account settings
func (s *UserService) GetAccountSettings(ctx context.Context, userID string) (map[string]interface{}, error) {
	// TODO: Fetch settings from database
	settings := map[string]interface{}{
		"email_notifications": true,
		"sms_notifications":   false,
		"push_notifications":  true,
		"newsletter":          false,
		"data_collection":     true,
		"privacy_level":       "public",
	}

	return settings, nil
}

// UpdateAccountSettings updates user account settings
func (s *UserService) UpdateAccountSettings(ctx context.Context, userID string, settings interface{}) (map[string]interface{}, error) {
	// TODO: Store settings in database
	_ = settings

	return s.GetAccountSettings(ctx, userID)
}

// DeleteAccount permanently deletes user account
func (s *UserService) DeleteAccount(ctx context.Context, userID, password string) error {
	// TODO: Verify password before deletion
	_ = password

	return s.userRepo.Delete(ctx, userID)
}

// GetActivityLog retrieves user activity log
func (s *UserService) GetActivityLog(ctx context.Context, userID string) ([]map[string]interface{}, error) {
	// TODO: Query activity_logs table
	return []map[string]interface{}{}, nil
}
