package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strconv"
	"strings"

	"backend/internal/models"
	"backend/internal/repository"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AdminUserAuditMetadata struct {
	ActorUserID string
	IPAddress   string
	UserAgent   string
}

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
	if updates.PreferredLanguage != "" {
		user.PreferredLanguage = updates.PreferredLanguage
	}
	if updates.City != "" {
		user.City = updates.City
	}
	if updates.Country != "" {
		user.Country = updates.Country
	}

	return s.userRepo.Update(ctx, user)
}

// UpdateUserByAdmin updates user profile and high-level status from the admin panel.
func (s *UserService) UpdateUserByAdmin(
	ctx context.Context,
	userID string,
	updates *models.User,
	status string,
	isActive, emailVerified, isVerified, isDiaspora, notificationEmail, notificationSMS, twoFactorEnabled, twoFAEnabled, isUltimateNoExpiry *bool,
	audit *AdminUserAuditMetadata,
) (*models.User, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	original := *user

	if updates == nil {
		updates = &models.User{}
	}

	if updates.FirstName != "" {
		user.FirstName = updates.FirstName
	}
	if updates.LastName != "" {
		user.LastName = updates.LastName
	}
	if updates.Email != "" {
		user.Email = updates.Email
	}
	if updates.Phone != "" {
		user.Phone = updates.Phone
	}
	if updates.NationalID != "" {
		user.NationalID = updates.NationalID
	}
	if updates.UserType != "" {
		user.UserType = updates.UserType
	}
	nameChanged := updates.FirstName != "" || updates.LastName != ""
	if updates.FullName != "" {
		user.FullName = updates.FullName
	} else if nameChanged && (user.FirstName != "" || user.LastName != "") {
		user.FullName = strings.TrimSpace(fmt.Sprintf("%s %s", user.FirstName, user.LastName))
	}
	if updates.CompanyName != "" {
		user.CompanyName = updates.CompanyName
	}
	if updates.BusinessLicense != "" {
		user.BusinessLicense = updates.BusinessLicense
	}
	if updates.PreferredLanguage != "" {
		user.PreferredLanguage = updates.PreferredLanguage
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
	if updates.Bio != "" {
		user.Bio = updates.Bio
	}
	if updates.ProfileImage != "" {
		user.ProfileImage = updates.ProfileImage
	}
	if updates.ProfilePictureURL != "" {
		user.ProfilePictureURL = updates.ProfilePictureURL
	}
	if updates.SubscriptionTier != "" {
		user.SubscriptionTier = updates.SubscriptionTier
	}
	if updates.SubscriptionStatus != "" {
		user.SubscriptionStatus = updates.SubscriptionStatus
	}
	if updates.KYCStatus != "" {
		user.KYCStatus = updates.KYCStatus
	}

	switch strings.ToLower(strings.TrimSpace(status)) {
	case "active":
		user.IsActive = true
		user.KYCStatus = "active"
	case "pending":
		user.IsActive = false
		user.KYCStatus = "pending"
	}

	if isActive != nil {
		user.IsActive = *isActive
	}
	if emailVerified != nil {
		user.EmailVerified = *emailVerified
	}
	if isVerified != nil {
		user.IsVerified = *isVerified
	}
	if isDiaspora != nil {
		user.IsDiaspora = *isDiaspora
	}
	if notificationEmail != nil {
		user.NotificationEmail = *notificationEmail
	}
	if notificationSMS != nil {
		user.NotificationSMS = *notificationSMS
	}
	if twoFactorEnabled != nil {
		user.TwoFactorEnabled = *twoFactorEnabled
	}
	if twoFAEnabled != nil {
		user.TwoFAEnabled = *twoFAEnabled
	}
	if isUltimateNoExpiry != nil {
		user.IsUltimateNoExpiry = *isUltimateNoExpiry
	}

	updatedUser, err := s.userRepo.Update(ctx, user)
	if err != nil {
		return nil, err
	}

	if audit != nil {
		if err := s.logAdminUserChanges(ctx, audit, &original, updatedUser); err != nil {
			return nil, err
		}
	}

	return updatedUser, nil
}

func (s *UserService) logAdminUserChanges(ctx context.Context, audit *AdminUserAuditMetadata, before, after *models.User) error {
	if s.db == nil || audit == nil || before == nil || after == nil {
		return nil
	}

	actions := []struct {
		action  string
		changes map[string]map[string]interface{}
	}{
		{
			action: "admin_user_role_updated",
			changes: collectUserAuditChanges(before, after, []string{
				"user_type",
			}),
		},
		{
			action: "admin_user_access_updated",
			changes: collectUserAuditChanges(before, after, []string{
				"subscription_tier",
				"subscription_status",
				"email_verified",
				"is_verified",
				"two_factor_enabled",
				"two_fa_enabled",
				"is_ultimate_no_expiry",
				"is_early_adopter",
			}),
		},
		{
			action: "admin_user_profile_updated",
			changes: collectUserAuditChanges(before, after, []string{
				"first_name",
				"last_name",
				"email",
				"phone",
				"national_id",
				"full_name",
				"company_name",
				"business_license",
				"preferred_language",
				"language_preference",
				"city",
				"country",
				"bio",
				"profile_image",
				"profile_picture_url",
				"kyc_status",
				"is_active",
				"is_diaspora",
				"notification_email",
				"notification_sms",
			}),
		},
	}

	for _, entry := range actions {
		if len(entry.changes) == 0 {
			continue
		}

		detailsJSON, err := json.Marshal(map[string]interface{}{
			"target_user_id":    after.ID,
			"changed_fields":    entry.changes,
			"actor_user_id":     audit.ActorUserID,
			"target_user_email": after.Email,
		})
		if err != nil {
			return err
		}

		logEntry := map[string]interface{}{
			"action":        entry.action,
			"resource_type": "user",
			"resource_id":   after.ID,
			"ip_address":    audit.IPAddress,
			"user_agent":    audit.UserAgent,
			"details":       string(detailsJSON),
		}
		if actorID, err := strconv.ParseUint(strings.TrimSpace(audit.ActorUserID), 10, 64); err == nil {
			logEntry["user_id"] = actorID
		}

		if err := s.db.WithContext(ctx).Table("activity_logs").Create(logEntry).Error; err != nil {
			return err
		}
	}

	return nil
}

func collectUserAuditChanges(before, after *models.User, fields []string) map[string]map[string]interface{} {
	changes := make(map[string]map[string]interface{})
	for _, field := range fields {
		beforeValue, afterValue := userAuditFieldValue(before, field), userAuditFieldValue(after, field)
		if beforeValue == afterValue {
			continue
		}
		changes[field] = map[string]interface{}{
			"before": beforeValue,
			"after":  afterValue,
		}
	}
	return changes
}

func userAuditFieldValue(user *models.User, field string) interface{} {
	if user == nil {
		return nil
	}

	switch field {
	case "first_name":
		return user.FirstName
	case "last_name":
		return user.LastName
	case "email":
		return user.Email
	case "phone":
		return user.Phone
	case "national_id":
		return user.NationalID
	case "user_type":
		return user.UserType
	case "full_name":
		return user.FullName
	case "company_name":
		return user.CompanyName
	case "business_license":
		return user.BusinessLicense
	case "preferred_language":
		return user.PreferredLanguage
	case "language_preference":
		return user.LanguagePreference
	case "city":
		return user.City
	case "country":
		return user.Country
	case "bio":
		return user.Bio
	case "profile_image":
		return user.ProfileImage
	case "profile_picture_url":
		return user.ProfilePictureURL
	case "subscription_tier":
		return user.SubscriptionTier
	case "subscription_status":
		return user.SubscriptionStatus
	case "email_verified":
		return user.EmailVerified
	case "is_verified":
		return user.IsVerified
	case "kyc_status":
		return user.KYCStatus
	case "is_active":
		return user.IsActive
	case "is_diaspora":
		return user.IsDiaspora
	case "notification_email":
		return user.NotificationEmail
	case "notification_sms":
		return user.NotificationSMS
	case "two_factor_enabled":
		return user.TwoFactorEnabled
	case "two_fa_enabled":
		return user.TwoFAEnabled
	case "is_ultimate_no_expiry":
		return user.IsUltimateNoExpiry
	case "is_early_adopter":
		return user.IsEarlyAdopter
	default:
		return nil
	}
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

// DeleteAccount implements the user's right to delete their own account at any
// time. The caller must confirm with their current password; the account is then
// erased — credentials and personal data are removed, copies in the lead table
// and notifications are deleted — and soft-deleted so it can never be used again.
func (s *UserService) DeleteAccount(ctx context.Context, userID, password, reason string) error {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return errors.New("user not found")
	}

	if strings.TrimSpace(password) == "" {
		return errors.New("your password is required to delete your account")
	}

	// Verify the password with the same hash/normalisation rules as Login.
	hash := user.PasswordHash
	if hash == "" {
		hash = user.Password
	}
	if strings.HasPrefix(hash, "$2b$") {
		hash = "$2a$" + hash[4:]
	}
	if hash == "" || bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) != nil {
		return errors.New("incorrect password")
	}

	// Never allow the last remaining administrator to delete themselves.
	if strings.EqualFold(user.UserType, "admin") {
		count, countErr := s.userRepo.CountByUserType(ctx, "admin")
		if countErr != nil {
			return errors.New("unable to verify account state, please try again")
		}
		if count <= 1 {
			return errors.New("the last administrator account cannot be deleted")
		}
	}

	if err := s.userRepo.EraseAccount(ctx, userID, user.Email); err != nil {
		return err
	}

	// Best-effort audit trail — never blocks the deletion itself.
	s.logSelfAccountDeletion(ctx, user, reason)

	return nil
}

// logSelfAccountDeletion records a self-service account deletion in activity_logs.
//
// The entry deliberately stores a hash of the email rather than the address
// itself: the audit trail must not re-introduce personal data that the deletion
// just erased. The hash still lets support match a "I deleted my account"
// request without holding the address.
func (s *UserService) logSelfAccountDeletion(ctx context.Context, user *models.User, reason string) {
	if s.db == nil || user == nil {
		return
	}

	emailHash := ""
	if trimmed := strings.ToLower(strings.TrimSpace(user.Email)); trimmed != "" {
		sum := sha256.Sum256([]byte(trimmed))
		emailHash = hex.EncodeToString(sum[:])
	}

	detailsJSON, err := json.Marshal(map[string]interface{}{
		"self_deleted": true,
		"reason":       strings.TrimSpace(reason),
		"email_sha256": emailHash,
		"user_type":    user.UserType,
	})
	if err != nil {
		return
	}

	entry := map[string]interface{}{
		"user_id":       user.ID,
		"action":        "account_self_deleted",
		"resource_type": "user",
		"resource_id":   user.ID,
		"details":       string(detailsJSON),
	}
	if err := s.db.WithContext(ctx).Table("activity_logs").Create(entry).Error; err != nil {
		log.Printf("[DeleteAccount] failed to write activity log for user %d: %v", user.ID, err)
	}
}

// GetActivityLog retrieves user activity log
func (s *UserService) GetActivityLog(ctx context.Context, userID string) ([]map[string]interface{}, error) {
	// TODO: Query activity_logs table
	return []map[string]interface{}{}, nil
}
