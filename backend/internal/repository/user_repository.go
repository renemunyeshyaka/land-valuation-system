package repository

import (
	"context"
	"errors"

	"backend/internal/models"

	"github.com/jmoiron/sqlx"
)

type UserRepository struct {
	db *sqlx.DB
}

func NewUserRepository(db *sqlx.DB) *UserRepository {
	return &UserRepository{db: db}
}

// Create creates a new user
func (r *UserRepository) Create(ctx context.Context, user *models.User) (*models.User, error) {
	query := `
		INSERT INTO users (email, phone, password_hash, first_name, last_name, full_name, user_type, kyc_status, is_verified, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, email, phone, password_hash, first_name, last_name, full_name, user_type, kyc_status, is_verified, is_active, created_at, updated_at
	`

	var savedUser models.User
	err := r.db.QueryRowContext(ctx, query,
		user.Email,
		user.Phone,
		user.PasswordHash,
		user.FirstName,
		user.LastName,
		user.FirstName+" "+user.LastName,
		user.UserType,
		user.KYCStatus,
		user.IsVerified,
		user.IsActive,
	).Scan(
		&savedUser.ID,
		&savedUser.Email,
		&savedUser.Phone,
		&savedUser.PasswordHash,
		&savedUser.FirstName,
		&savedUser.LastName,
		&savedUser.FullName,
		&savedUser.UserType,
		&savedUser.KYCStatus,
		&savedUser.IsVerified,
		&savedUser.IsActive,
		&savedUser.CreatedAt,
		&savedUser.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &savedUser, nil
}

// GetByID retrieves user by ID
func (r *UserRepository) GetByID(ctx context.Context, id string) (*models.User, error) {
	query := `
		SELECT id, email, phone, first_name, last_name, full_name, user_type, kyc_status, is_verified, is_active, 
		       two_fa_enabled, last_login, language_preference, profile_picture_url, created_at, updated_at
		FROM users
		WHERE id = $1 AND deleted_at IS NULL
	`

	var user models.User
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&user.ID, &user.Email, &user.Phone, &user.FirstName, &user.LastName, &user.FullName,
		&user.UserType, &user.KYCStatus, &user.IsVerified, &user.IsActive,
		&user.TwoFAEnabled, &user.LastLogin, &user.LanguagePreference, &user.ProfilePictureURL,
		&user.CreatedAt, &user.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &user, nil
}

// GetByEmail retrieves user by email
func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `
		SELECT id, email, phone, password_hash, first_name, last_name, full_name, user_type, kyc_status, is_verified, is_active,
		       two_fa_enabled, last_login, language_preference, profile_picture_url, created_at, updated_at
		FROM users
		WHERE email = $1 AND deleted_at IS NULL
	`

	var user models.User
	err := r.db.QueryRowContext(ctx, query, email).Scan(
		&user.ID, &user.Email, &user.Phone, &user.PasswordHash, &user.FirstName, &user.LastName, &user.FullName,
		&user.UserType, &user.KYCStatus, &user.IsVerified, &user.IsActive,
		&user.TwoFAEnabled, &user.LastLogin, &user.LanguagePreference, &user.ProfilePictureURL,
		&user.CreatedAt, &user.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &user, nil
}

// Update updates user information
func (r *UserRepository) Update(ctx context.Context, user *models.User) (*models.User, error) {
	query := `
		UPDATE users 
		SET first_name = $1, last_name = $2, phone = $3, profile_picture_url = $4, bio = $5,
		    language_preference = $6, city = $7, country = $8, updated_at = CURRENT_TIMESTAMP
		WHERE id = $9 AND deleted_at IS NULL
		RETURNING id, email, phone, first_name, last_name, full_name, user_type, kyc_status, is_verified, is_active, created_at, updated_at
	`

	var updatedUser models.User
	err := r.db.QueryRowContext(ctx, query,
		user.FirstName, user.LastName, user.Phone, user.ProfilePictureURL, user.Bio,
		user.LanguagePreference, user.City, user.Country, user.ID,
	).Scan(
		&updatedUser.ID, &updatedUser.Email, &updatedUser.Phone, &updatedUser.FirstName, &updatedUser.LastName,
		&updatedUser.FullName, &updatedUser.UserType, &updatedUser.KYCStatus, &updatedUser.IsVerified, &updatedUser.IsActive,
		&updatedUser.CreatedAt, &updatedUser.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &updatedUser, nil
}

// Delete soft-deletes a user
func (r *UserRepository) Delete(ctx context.Context, id string) error {
	query := `UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return errors.New("user not found")
	}

	return nil
}

// UpdateKYCStatus updates user KYC status
func (r *UserRepository) UpdateKYCStatus(ctx context.Context, userID, status, documentURL string) error {
	query := `
		UPDATE users 
		SET kyc_status = $1, kyc_document_url = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $3 AND deleted_at IS NULL
	`

	_, err := r.db.ExecContext(ctx, query, status, documentURL, userID)
	return err
}

// UpdatePassword updates user password hash
func (r *UserRepository) UpdatePassword(ctx context.Context, userID, newPasswordHash string) error {
	query := `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`
	_, err := r.db.ExecContext(ctx, query, newPasswordHash, userID)
	return err
}

// UpdateLastLogin updates last login timestamp
func (r *UserRepository) UpdateLastLogin(ctx context.Context, userID string) error {
	query := `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, userID)
	return err
}

// UpdateTwoFAStatus updates 2FA status
func (r *UserRepository) UpdateTwoFAStatus(ctx context.Context, userID string, enabled bool, secret string) error {
	query := `UPDATE users SET two_fa_enabled = $1, two_fa_secret = $2 WHERE id = $3`
	_, err := r.db.ExecContext(ctx, query, enabled, secret, userID)
	return err
}

// GetByVerificationToken retrieves user by verification token
func (r *UserRepository) GetByVerificationToken(ctx context.Context, token string) (*models.User, error) {
	query := `
		SELECT id, email, verification_token, verification_expires_at
		FROM users
		WHERE verification_token = $1 AND deleted_at IS NULL
	`

	var user models.User
	err := r.db.QueryRowContext(ctx, query, token).Scan(
		&user.ID, &user.Email, &user.VerificationToken, &user.VerificationExpiresAt,
	)

	if err != nil {
		return nil, err
	}

	return &user, nil
}

// List retrieves paginated users
func (r *UserRepository) List(ctx context.Context, offset, limit int, filters map[string]string) ([]*models.User, int, error) {
	query := `SELECT id, email, first_name, last_name, user_type, kyc_status, is_active, created_at FROM users WHERE deleted_at IS NULL`
	countQuery := `SELECT COUNT(*) FROM users WHERE deleted_at IS NULL`
	
	// Apply filters
	if status, ok := filters["status"]; ok {
		query += " AND kyc_status = '" + status + "'"
		countQuery += " AND kyc_status = '" + status + "'"
	}

	var total int
	err := r.db.QueryRowContext(ctx, countQuery).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query += ` ORDER BY created_at DESC LIMIT $1 OFFSET $2`

	rows, err := r.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var users []*models.User
	for rows.Next() {
		var user models.User
		err := rows.Scan(&user.ID, &user.Email, &user.FirstName, &user.LastName, &user.UserType, &user.KYCStatus, &user.IsActive, &user.CreatedAt)
		if err != nil {
			return nil, 0, err
		}
		users = append(users, &user)
	}

	return users, total, nil
}
