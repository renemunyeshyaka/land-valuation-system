package services

import (
	"context"
	"errors"
	"os"
	"strconv"
	"strings"
	"time"

	"backend/internal/models"

	"gorm.io/gorm"
)

// Early-adopter promotion (first 20,000 sign-ups get a one-month free membership).
// New sign-ups only — existing users are not counted. Tune via env:
//   EARLY_ADOPTER_ENABLED=true|false   (default true)
//   EARLY_ADOPTER_LIMIT=<n>            (default 20000)
//   FREE_MEMBERSHIP_DAYS=<n>           (default 30 — one-month free membership)
//   FREE_RETENTION_GRACE_DAYS=<n>      (default 30 — data kept 30 days after expiry)
//
// Free-tier lifecycle (no "lifetime free" accounts):
//   - A free membership lasts 30 days (one month), then the account expires.
//   - Data is retained for 60 days total (30 days after expiry) so the user can
//     subscribe to a plan of their choice during that window.
//   - After the 60-day window the account is locked. Nothing is kept forever.
const (
	earlyAdopterCounterID         = 1
	earlyAdopterCounterName       = "early_adopter_free"
	defaultEarlyAdopterLimit      = 20000
	defaultFreeMembershipDays     = 30
	defaultFreeRetentionGraceDays = 30
)

// earlyAdopterLimit returns the configured promo cap.
func earlyAdopterLimit() int {
	if v := strings.TrimSpace(os.Getenv("EARLY_ADOPTER_LIMIT")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
	}
	return defaultEarlyAdopterLimit
}

// isEarlyAdopterEnabled reports whether the promo is enabled.
func isEarlyAdopterEnabled() bool {
	return strings.ToLower(strings.TrimSpace(os.Getenv("EARLY_ADOPTER_ENABLED"))) != "false"
}

// FreeMembershipDuration returns how long a free membership lasts
// (default 30 days = one month). Used at signup and by the retention worker.
func FreeMembershipDuration() time.Duration {
	if v := strings.TrimSpace(os.Getenv("FREE_MEMBERSHIP_DAYS")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return time.Duration(n) * 24 * time.Hour
		}
	}
	return time.Duration(defaultFreeMembershipDays) * 24 * time.Hour
}

// FreeRetentionGraceDuration returns how long free-account data is kept after the
// membership expires (default 30 days, i.e. 60 days total retention).
func FreeRetentionGraceDuration() time.Duration {
	if v := strings.TrimSpace(os.Getenv("FREE_RETENTION_GRACE_DAYS")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return time.Duration(n) * 24 * time.Hour
		}
	}
	return time.Duration(defaultFreeRetentionGraceDays) * 24 * time.Hour
}

// PromoService manages promotional counters (e.g. the first-20k one-month free memberships).
type PromoService struct {
	db *gorm.DB
}

func NewPromoService(db *gorm.DB) *PromoService {
	return &PromoService{db: db}
}

// GetEarlyAdopterStatus returns granted / limit / remaining for the early-adopter promo.
func (s *PromoService) GetEarlyAdopterStatus(ctx context.Context) (map[string]interface{}, error) {
	counter, err := s.getOrCreateCounter(ctx)
	if err != nil {
		return nil, err
	}
	remaining := counter.GrantLimit - counter.Granted
	if remaining < 0 {
		remaining = 0
	}
	return map[string]interface{}{
		"name":            counter.Name,
		"granted":         counter.Granted,
		"limit":           counter.GrantLimit,
		"remaining":       remaining,
		"enabled":         isEarlyAdopterEnabled(),
		"benefit":         "one-month free membership",
		"membership_days": defaultFreeMembershipDays,
		"retention_days":  defaultFreeMembershipDays + defaultFreeRetentionGraceDays,
	}, nil
}

// ClaimEarlyAdopterSlot atomically claims a slot for a new user, if any remain.
// Returns true when the user was granted the early-adopter benefit (free tier,
// active, one-month free membership). Concurrent registrations serialize on the
// counter row lock so the 20k cap can never be exceeded.
func (s *PromoService) ClaimEarlyAdopterSlot(ctx context.Context, user *models.User) (bool, error) {
	if !isEarlyAdopterEnabled() {
		return false, nil
	}
	granted := false
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Ensure the counter row exists (fresh DB before seed).
		if err := s.ensureCounterRow(ctx, tx); err != nil {
			return err
		}

		// Atomically claim a slot: only increments while granted < grant_limit.
		res := tx.Model(&models.PromoCounter{}).
			Where("id = ? AND granted < grant_limit", earlyAdopterCounterID).
			Update("granted", gorm.Expr("granted + 1"))
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return nil // cap reached — user keeps a normal free account
		}

		// Grant the benefit: free tier, active, one-month (30-day) free membership.
		expiry := time.Now().Add(FreeMembershipDuration())
		user.IsEarlyAdopter = true
		user.SubscriptionTier = "free"
		user.SubscriptionStatus = "active"
		user.SubscriptionExpiry = &expiry
		user.SubscriptionNextRenewal = nil
		if err := tx.Model(&models.User{}).Where("id = ?", user.ID).Updates(map[string]interface{}{
			"is_early_adopter":          true,
			"subscription_tier":         "free",
			"subscription_status":       "active",
			"subscription_expiry":       expiry,
			"subscription_next_renewal": nil,
		}).Error; err != nil {
			return err
		}
		granted = true
		return nil
	})
	return granted, err
}

func (s *PromoService) ensureCounterRow(ctx context.Context, tx *gorm.DB) error {
	var count int64
	if err := tx.Model(&models.PromoCounter{}).Where("id = ?", earlyAdopterCounterID).Count(&count).Error; err != nil {
		return err
	}
	if count == 0 {
		return tx.Create(&models.PromoCounter{
			ID:         earlyAdopterCounterID,
			Name:       earlyAdopterCounterName,
			GrantLimit: earlyAdopterLimit(),
		}).Error
	}
	return nil
}

func (s *PromoService) getOrCreateCounter(ctx context.Context) (*models.PromoCounter, error) {
	var counter models.PromoCounter
	if err := s.db.WithContext(ctx).First(&counter, earlyAdopterCounterID).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		counter = models.PromoCounter{ID: earlyAdopterCounterID, Name: earlyAdopterCounterName, GrantLimit: earlyAdopterLimit()}
		if err := s.db.WithContext(ctx).Create(&counter).Error; err != nil {
			return nil, err
		}
	}
	return &counter, nil
}
