package repository

import (
	"context"
	"errors"

	"backend/internal/models"

	"gorm.io/gorm"
)

// UpdatePasswordResetToken sets the password reset token and expiry for a user
func (r *UserRepository) UpdatePasswordResetToken(ctx context.Context, userID, token string, expiresAt interface{}) error {
	result := r.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", userID).
		Updates(map[string]interface{}{
			"password_reset_token":      token,
			"password_reset_expires_at": expiresAt,
		})
	return result.Error
}

// GetByPasswordResetToken retrieves user by password reset token (and checks expiry)
func (r *UserRepository) GetByPasswordResetToken(ctx context.Context, token string) (*models.User, error) {
	var user models.User
	result := r.db.WithContext(ctx).Where("password_reset_token = ?", token).First(&user)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, result.Error
	}
	return &user, nil
}

type UserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

// Create creates a new user
func (r *UserRepository) Create(ctx context.Context, user *models.User) (*models.User, error) {
	result := r.db.WithContext(ctx).Create(user)
	if result.Error != nil {
		return nil, result.Error
	}
	return user, nil
}

// GetByID retrieves user by ID
func (r *UserRepository) GetByID(ctx context.Context, id string) (*models.User, error) {
	var user models.User
	result := r.db.WithContext(ctx).Where("id = ?", id).First(&user)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, result.Error
	}
	return &user, nil
}

// GetByEmail retrieves user by email
func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	result := r.db.WithContext(ctx).Where("email = ?", email).First(&user)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, result.Error
	}
	return &user, nil
}

// Update updates user information
func (r *UserRepository) Update(ctx context.Context, user *models.User) (*models.User, error) {
	result := r.db.WithContext(ctx).Save(user)
	if result.Error != nil {
		return nil, result.Error
	}
	return user, nil
}

// Delete soft-deletes a user
func (r *UserRepository) Delete(ctx context.Context, id string) error {
	result := r.db.WithContext(ctx).Delete(&models.User{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("user not found")
	}
	return nil
}

// UpdateKYCStatus updates user KYC status
func (r *UserRepository) UpdateKYCStatus(ctx context.Context, userID, status, documentURL string) error {
	result := r.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", userID).
		Updates(map[string]interface{}{
			"kyc_status": status,
		})
	return result.Error
}

// UpdatePassword updates user password hash
func (r *UserRepository) UpdatePassword(ctx context.Context, userID, newPasswordHash string) error {
	result := r.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", userID).
		Update("password_hash", newPasswordHash)
	return result.Error
}

// UpdateLastLogin updates last login timestamp
func (r *UserRepository) UpdateLastLogin(ctx context.Context, userID string) error {
	result := r.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", userID).
		Update("last_login", gorm.Expr("CURRENT_TIMESTAMP"))
	return result.Error
}

// UpdateTwoFAStatus updates 2FA status
func (r *UserRepository) UpdateTwoFAStatus(ctx context.Context, userID string, enabled bool, secret string) error {
	result := r.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", userID).
		Updates(map[string]interface{}{
			"two_fa_enabled": enabled,
			"two_fa_secret":  secret,
		})
	return result.Error
}

// GetByVerificationToken retrieves user by verification token
func (r *UserRepository) GetByVerificationToken(ctx context.Context, token string) (*models.User, error) {
	var user models.User
	result := r.db.WithContext(ctx).Where("verification_token = ?", token).First(&user)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, result.Error
	}
	return &user, nil
}

// List retrieves paginated users
func (r *UserRepository) List(ctx context.Context, offset, limit int, filters map[string]string) ([]*models.User, int, error) {
	var users []*models.User
	var total int64

	query := r.db.WithContext(ctx).Model(&models.User{})

	// Apply filters
	if status, ok := filters["status"]; ok {
		query = query.Where("kyc_status = ?", status)
	}
	if userType, ok := filters["type"]; ok {
		query = query.Where("user_type = ?", userType)
	}
	if search, ok := filters["search"]; ok && search != "" {
		like := "%" + search + "%"
		query = query.Where(
			r.db.Where("first_name ILIKE ?", like).
				Or("last_name ILIKE ?", like).
				Or("email ILIKE ?", like).
				Or("phone ILIKE ?", like).
				Or("national_id ILIKE ?", like),
		)
	}

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	result := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&users)
	if result.Error != nil {
		return nil, 0, result.Error
	}

	return users, int(total), nil
}

// UpdateEmailVerification updates email verification code and expiration
func (r *UserRepository) UpdateEmailVerification(ctx context.Context, userID, code string, expiresAt interface{}) error {
	result := r.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", userID).
		Updates(map[string]interface{}{
			"email_verification_code":       code,
			"email_verification_expires_at": expiresAt,
		})
	return result.Error
}

// VerifyEmail marks user email as verified
func (r *UserRepository) VerifyEmail(ctx context.Context, userID string) error {
	result := r.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", userID).
		Updates(map[string]interface{}{
			"email_verified":                true,
			"is_verified":                   true,
			"email_verification_code":       nil,
			"email_verification_expires_at": nil,
		})
	return result.Error
}

// UpdateOTP updates OTP code and expiration
func (r *UserRepository) UpdateOTP(ctx context.Context, userID, code string, expiresAt interface{}) error {
	result := r.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", userID).
		Updates(map[string]interface{}{
			"otp_code":         code,
			"otp_expires_at":   expiresAt,
			"last_otp_sent_at": gorm.Expr("CURRENT_TIMESTAMP"),
		})
	return result.Error
}

// IncrementOTPAttempts increments failed OTP attempts counter
func (r *UserRepository) IncrementOTPAttempts(ctx context.Context, userID string) error {
	result := r.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", userID).
		UpdateColumn("otp_attempts", gorm.Expr("otp_attempts + 1"))
	return result.Error
}

// ResetOTPAttempts resets OTP attempts to zero
func (r *UserRepository) ResetOTPAttempts(ctx context.Context, userID string) error {
	result := r.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", userID).
		Updates(map[string]interface{}{
			"otp_attempts":   0,
			"otp_code":       nil,
			"otp_expires_at": nil,
		})
	return result.Error
}

// LockOTPVerification locks OTP verification for a period
func (r *UserRepository) LockOTPVerification(ctx context.Context, userID string, lockedUntil interface{}) error {
	result := r.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", userID).
		Updates(map[string]interface{}{
			"otp_locked_until": lockedUntil,
			"otp_attempts":     0,
		})
	return result.Error
}

// GetByEmailVerificationCode retrieves user by email verification code
func (r *UserRepository) GetByEmailVerificationCode(ctx context.Context, code string) (*models.User, error) {
	var user models.User
	result := r.db.WithContext(ctx).Where("email_verification_code = ?", code).First(&user)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("invalid verification code")
		}
		return nil, result.Error
	}
	return &user, nil
}

// GetActiveByRole retrieves active users by their role (user_type)
func (r *UserRepository) GetActiveByRole(ctx context.Context, userRole string) ([]models.User, error) {
	var users []models.User

	query := r.db.WithContext(ctx).Where("is_active = ?", true)

	if userRole != "" && userRole != "all" {
		query = query.Where("user_type = ?", userRole)
	}

	result := query.Find(&users)
	if result.Error != nil {
		return nil, result.Error
	}

	return users, nil
}
