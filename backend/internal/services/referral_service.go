package services

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"math"

	"backend/internal/models"
	"backend/internal/repository"

	"gorm.io/gorm"
)

type ReferralService struct {
	db               *gorm.DB
	userRepository   *repository.UserRepository
	emailService     *EmailService
	subscriptionRepo *repository.SubscriptionRepository
}

// ReferralCodeRequest represents a referral code request
type ReferralCodeRequest struct {
	Code string `json:"code" binding:"required"`
}

// ReferralValidationResponse represents the response from referral validation
type ReferralValidationResponse struct {
	Valid        bool    `json:"valid"`
	ReferrerName string  `json:"referrer_name,omitempty"`
	DiscountRate float64 `json:"discount_rate,omitempty"`
	Message      string  `json:"message"`
}

// NewReferralService creates a new referral service
func NewReferralService(db *gorm.DB) *ReferralService {
	return &ReferralService{
		db:               db,
		userRepository:   repository.NewUserRepository(db),
		emailService:     NewEmailService(),
		subscriptionRepo: repository.NewSubscriptionRepository(db),
	}
}

// GenerateReferralCode generates a unique referral code for a user
func (s *ReferralService) GenerateReferralCode(ctx context.Context, userID uint) (string, error) {
	// Generate 12-character random base64 string
	randomBytes := make([]byte, 9) // 9 bytes = 12 base64 characters
	if _, err := rand.Read(randomBytes); err != nil {
		return "", errors.New("failed to generate referral code")
	}

	referralCode := base64.URLEncoding.EncodeToString(randomBytes)[:12]

	// Ensure uniqueness by checking if code exists
	var count int64
	if err := s.db.WithContext(ctx).Model(&models.User{}).
		Where("referral_code = ?", referralCode).
		Count(&count).Error; err != nil {
		return "", err
	}

	// If code exists, retry (very rare)
	if count > 0 {
		return s.GenerateReferralCode(ctx, userID)
	}

	// Update user with referral code
	if err := s.db.WithContext(ctx).Model(&models.User{}).
		Where("id = ?", userID).
		Update("referral_code", referralCode).Error; err != nil {
		return "", err
	}

	return referralCode, nil
}

// ValidateReferralCode validates a referral code and returns discount info
func (s *ReferralService) ValidateReferralCode(ctx context.Context, code string) (*ReferralValidationResponse, error) {
	var referrer models.User
	if err := s.db.WithContext(ctx).Where("referral_code = ?", code).First(&referrer).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return &ReferralValidationResponse{
				Valid:   false,
				Message: "Invalid referral code",
			}, nil
		}
		return nil, err
	}

	// Check if referrer is active
	if !referrer.IsActive {
		return &ReferralValidationResponse{
			Valid:   false,
			Message: "This referral code is no longer active",
		}, nil
	}

	// Calculate discount: 10% base discount + bonus for referring 5+ users (2% each, max 20%)
	bonusDiscount := math.Min(float64(referrer.ReferredUsers)*2.0, 20.0)
	totalDiscount := 10.0 + bonusDiscount

	return &ReferralValidationResponse{
		Valid:        true,
		ReferrerName: fmt.Sprintf("%s %s", referrer.FirstName, referrer.LastName),
		DiscountRate: totalDiscount,
		Message:      fmt.Sprintf("Valid! Get %.0f%% discount on your first purchase", totalDiscount),
	}, nil
}

// ApplyReferralDiscount applies a referral discount to a new user
func (s *ReferralService) ApplyReferralDiscount(ctx context.Context, newUserID uint, referralCode string) error {
	var referrer models.User
	if err := s.db.WithContext(ctx).Where("referral_code = ?", referralCode).First(&referrer).Error; err != nil {
		return err
	}

	// Calculate discount
	bonusDiscount := math.Min(float64(referrer.ReferredUsers)*2.0, 20.0)
	totalDiscount := 10.0 + bonusDiscount

	// Update new user with referrer ID and discount
	newUser := models.User{
		ReferrerUserID:   &referrer.ID,
		ReferralDiscount: totalDiscount,
	}

	if err := s.db.WithContext(ctx).Model(&models.User{}).
		Where("id = ?", newUserID).
		Updates(newUser).Error; err != nil {
		return err
	}

	// Increment referrer's referred_users count
	if err := s.db.WithContext(ctx).Model(&models.User{}).
		Where("id = ?", referrer.ID).
		Update("referred_users", gorm.Expr("referred_users + ?", 1)).Error; err != nil {
		return err
	}

	// Send notification email to referrer
	newUserName := fmt.Sprintf("%s %s", newUser.FirstName, newUser.LastName)

	emailBody := fmt.Sprintf(`
		<h2>You've referred a new user!</h2>
		<p>Great news! %s has signed up using your referral code.</p>
		<p>You've now referred <strong>%d user(s)</strong>.</p>
		<p>Keep referring friends to unlock bonus discounts!</p>
	`, newUserName, referrer.ReferredUsers+1)

	_ = s.emailService.sendEmail(referrer.Email, "Referral Success!", emailBody)

	return nil
}

// GetReferralInfo returns referral information for a user
func (s *ReferralService) GetReferralInfo(ctx context.Context, userID uint) (map[string]interface{}, error) {
	var user models.User
	if err := s.db.WithContext(ctx).Where("id = ?", userID).First(&user).Error; err != nil {
		return nil, err
	}

	// Calculate current discount for this user
	bonusDiscount := math.Min(float64(user.ReferredUsers)*2.0, 20.0)
	currentDiscount := 10.0 + bonusDiscount

	// Get referred users count
	var referredCount int64
	s.db.WithContext(ctx).Model(&models.User{}).
		Where("referrer_user_id = ?", userID).
		Count(&referredCount)

	return map[string]interface{}{
		"referral_code":        user.ReferralCode,
		"referred_users":       user.ReferredUsers,
		"current_discount":     currentDiscount,
		"next_bonus_threshold": (math.Ceil(float64(user.ReferredUsers)/5.0) * 5.0),
		"message":              fmt.Sprintf("Share your code and earn a %.0f%% discount!", currentDiscount),
	}, nil
}

// GetReferralStats returns statistics for referral program
func (s *ReferralService) GetReferralStats(ctx context.Context) (map[string]interface{}, error) {
	// Get top referrers
	type TopReferrer struct {
		ID            uint
		FirstName     string
		LastName      string
		ReferredUsers int
		Email         string
	}

	var topReferrers []TopReferrer
	s.db.WithContext(ctx).
		Model(&models.User{}).
		Where("referred_users > ?", 0).
		Order("referred_users DESC").
		Limit(10).
		Scan(&topReferrers)

	// Get total referrals
	var totalReferrals int64
	s.db.WithContext(ctx).
		Model(&models.User{}).
		Where("referrer_user_id IS NOT NULL").
		Count(&totalReferrals)

	// Get total users
	var totalUsers int64
	s.db.WithContext(ctx).
		Model(&models.User{}).
		Count(&totalUsers)

	return map[string]interface{}{
		"total_referrals": totalReferrals,
		"total_users":     totalUsers,
		"referral_rate":   fmt.Sprintf("%.2f%%", (float64(totalReferrals)/float64(totalUsers))*100),
		"top_referrers":   topReferrers,
	}, nil
}

// CalculateDiscountedPrice calculates the final price with referral discount applied
func (s *ReferralService) CalculateDiscountedPrice(originalPrice float64, discountPercentage float64) float64 {
	discountAmount := (originalPrice * discountPercentage) / 100.0
	return originalPrice - discountAmount
}
