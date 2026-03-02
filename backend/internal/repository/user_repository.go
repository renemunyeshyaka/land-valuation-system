package repository

import (
"context"
"errors"

"backend/internal/models"

"gorm.io/gorm"
)

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
