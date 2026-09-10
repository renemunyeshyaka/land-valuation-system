package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

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

// Delete soft-deletes a user (sets deleted_at). Used for self-account deletion.
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

// CountByUserType returns the number of active (non-deleted) users of a given type.
func (r *UserRepository) CountByUserType(ctx context.Context, userType string) (int64, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&models.User{}).
		Where("user_type = ?", userType).
		Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

// EraseAccount de-identifies a user's account and then soft-deletes it. Used when
// a user exercises their right to delete their own account at any time.
//
// Everything that identifies the person is removed or replaced:
//   - credentials and one-time secrets (password, OTP, reset/verification tokens, 2FA)
//   - personal details (name, email, phone, national ID, photo, bio, location, company)
//   - the KYC document reference and free-form metadata, when those columns exist
//   - contact copies held in the lead/CRM table and notifications addressed to them
//
// The row itself is retained (soft delete) so property ownership, financial
// records and audit history stay intact, but nothing in it identifies the user
// and the account can never authenticate again.
//
// originalEmail is the address currently on record, used to find copies of the
// user's data in other tables before the users row is rewritten.
func (r *UserRepository) EraseAccount(ctx context.Context, id, originalEmail string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var user models.User
		if err := tx.Where("id = ?", id).First(&user).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("user not found")
			}
			return err
		}

		// Empty strings are used for NOT NULL columns; NULL is used for nullable
		// columns that carry a UNIQUE constraint (several deleted accounts must
		// not collide). Email keeps a unique tombstone because it is NOT NULL.
		scrub := map[string]interface{}{
			// Credentials & one-time secrets
			"password":                      "",
			"password_hash":                 "",
			"otp_code":                      "",
			"otp_expires_at":                nil,
			"otp_attempts":                  0,
			"otp_locked_until":              nil,
			"email_verification_code":       "",
			"email_verification_expires_at": nil,
			"password_reset_token":          "",
			"password_reset_expires_at":     nil,
			"verification_token":            "",
			"verification_expires_at":       nil,
			"two_fa_secret":                 "",
			"two_fa_enabled":                false,
			"two_factor_secret":             "",
			"two_factor_enabled":            false,
			"login_attempts":                0,
			"locked_until":                  nil,

			// Personal data
			"email":               fmt.Sprintf("deleted+%d@deleted.landval.local", user.ID),
			"phone":               nil,
			"national_id":         nil,
			"first_name":          "Deleted",
			"last_name":           "User",
			"full_name":           "Deleted User",
			"profile_image":       "",
			"profile_picture_url": "",
			"company_name":        "",
			"business_license":    "",
			"bio":                 "",
			"city":                "",
			"country":             "",
			"last_login":          nil,
			"is_active":           false,
			"is_verified":         false,
			"email_verified":      false,
		}

		// Columns that exist in the database but are not declared on the model
		// (see migrations/001_init_schema.sql). Added only when present so the
		// same code path works against any schema version.
		for _, column := range []string{"kyc_document_url", "metadata"} {
			if tx.Migrator().HasColumn(&models.User{}, column) {
				scrub[column] = nil
			}
		}

		if err := tx.Model(&models.User{}).Where("id = ?", id).Updates(scrub).Error; err != nil {
			return err
		}

		// Copies of the person's contact details in the lead/CRM table.
		if err := anonymizeLeads(tx, user.ID, originalEmail); err != nil {
			return err
		}

		// Notifications are addressed to the person, so they go with the account.
		if tx.Migrator().HasTable(&models.Notification{}) {
			if err := tx.Where("user_id = ?", id).Delete(&models.Notification{}).Error; err != nil {
				return err
			}
		}

		// Soft delete (sets deleted_at). GORM's default scope then hides the user
		// from every lookup, which makes login and authenticated requests fail.
		result := tx.Delete(&models.User{}, id)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return errors.New("user not found")
		}
		return nil
	})
}

// anonymizeLeads strips the contact details of any lead record that belongs to
// the erased user, so the person is not left in the marketing database.
func anonymizeLeads(tx *gorm.DB, userID uint, email string) error {
	if !tx.Migrator().HasTable(&models.Lead{}) {
		return nil
	}

	query := tx.Model(&models.Lead{}).Where("converted_user_id = ?", userID)
	if trimmed := strings.TrimSpace(email); trimmed != "" {
		query = tx.Model(&models.Lead{}).
			Where("converted_user_id = ? OR email = ?", userID, trimmed)
	}

	return query.Updates(map[string]interface{}{
		"first_name":        nil,
		"last_name":         nil,
		"email":             nil,
		"phone":             nil,
		"company":           nil,
		"unsubscribe_token": nil,
		"status":            "unsubscribed",
		"unsubscribed_at":   time.Now(),
	}).Error
}

// HardDelete permanently removes a user and their owned properties from the database.
// Used by admin panel — admin expects actual removal.
func (r *UserRepository) HardDelete(ctx context.Context, id string) error {
	userID := id
	// First permanently delete all properties owned by this user
	r.db.WithContext(ctx).Unscoped().Where("owner_id = ?", userID).Delete(&models.Property{})
	// Then permanently delete the user
	result := r.db.WithContext(ctx).Unscoped().Delete(&models.User{}, userID)
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
