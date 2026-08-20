package workers

import (
	"context"
	"log"
	"time"

	"backend/internal/models"
	"backend/internal/services"

	"gorm.io/gorm"
)

// FreeAccountRetentionWorker enforces the free-tier lifecycle. There are no
// "lifetime free" accounts:
//   - A free membership lasts one month (default 30 days), then expires.
//   - Data is kept for 60 days total (30 days after the membership expires) so the
//     user can subscribe to a plan of their choice during that window.
//   - After the 60-day window the account is locked (is_active = false). No data
//     is deleted automatically.
type FreeAccountRetentionWorker struct {
	DB *gorm.DB
}

func NewFreeAccountRetentionWorker(db *gorm.DB) *FreeAccountRetentionWorker {
	return &FreeAccountRetentionWorker{DB: db}
}

func (w *FreeAccountRetentionWorker) Start(ctx context.Context, interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				w.Run(ctx)
			}
		}
	}()
}

// Run applies the free-account lifecycle rules for the current day.
func (w *FreeAccountRetentionWorker) Run(ctx context.Context) {
	w.expireFreeMemberships(ctx)
	w.enforceRetentionWindow(ctx)
}

// expireFreeMemberships marks free accounts whose one-month membership has passed
// as expired. Their data is retained during the grace window so they can still
// subscribe.
func (w *FreeAccountRetentionWorker) expireFreeMemberships(ctx context.Context) {
	res := w.DB.WithContext(ctx).Model(&models.User{}).
		Where("subscription_tier = ? AND subscription_status = ? AND subscription_expiry IS NOT NULL AND subscription_expiry <= ?",
			"free", "active", time.Now()).
		Updates(map[string]interface{}{"subscription_status": "expired"})
	if res.Error != nil {
		log.Printf("[FreeAccountRetentionWorker] expire free memberships: %v", res.Error)
		return
	}
	if res.RowsAffected > 0 {
		log.Printf("[FreeAccountRetentionWorker] expired %d free membership(s) after one month", res.RowsAffected)
	}
}

// enforceRetentionWindow locks free accounts past the 60-day retention window
// (30 days after the 30-day membership expires). Data is kept, not deleted.
func (w *FreeAccountRetentionWorker) enforceRetentionWindow(ctx context.Context) {
	cutoff := time.Now().Add(-services.FreeRetentionGraceDuration())
	res := w.DB.WithContext(ctx).Model(&models.User{}).
		Where("subscription_tier = ? AND subscription_status = ? AND subscription_expiry IS NOT NULL AND subscription_expiry <= ?",
			"free", "expired", cutoff).
		Updates(map[string]interface{}{"is_active": false, "subscription_status": "expired"})
	if res.Error != nil {
		log.Printf("[FreeAccountRetentionWorker] enforce retention window: %v", res.Error)
		return
	}
	if res.RowsAffected > 0 {
		log.Printf("[FreeAccountRetentionWorker] locked %d free account(s) past the 60-day retention window (data kept)", res.RowsAffected)
	}
}
