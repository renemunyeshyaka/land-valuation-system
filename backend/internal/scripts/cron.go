package scripts

import (
	"context"
	"log"
	"os"
	"time"

	"backend/internal/repository"
	"backend/internal/services"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// StartCronJobs starts all scheduled jobs (call from main.go or as a standalone process)
func StartCronJobs() {
	dsn := os.Getenv("DATABASE_DSN")
	if dsn == "" {
		log.Fatal("DATABASE_DSN environment variable not set")
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Run every day at 2am: subscription renewal
	go func() {
		for {
			now := time.Now()
			next := now.Add(24 * time.Hour).Truncate(24 * time.Hour).Add(2 * time.Hour)
			dur := next.Sub(now)
			log.Printf("[Cron] Next subscription renewal job in %v", dur)
			time.Sleep(dur)
			RunSubscriptionRenewalJob(db)
		}
	}()

	// Run every day at 2:10am: expire property boosts
	go func() {
		boostRepo := services.NewBoostService(repository.NewBoostRepository(db))
		for {
			now := time.Now()
			next := now.Add(24 * time.Hour).Truncate(24 * time.Hour).Add(2*time.Hour + 10*time.Minute)
			dur := next.Sub(now)
			log.Printf("[Cron] Next boost expiry job in %v", dur)
			time.Sleep(dur)
			if err := boostRepo.ExpireBoosts(context.Background()); err != nil {
				log.Printf("[BoostExpiryJob] Failed to expire boosts: %v", err)
			} else {
				log.Printf("[BoostExpiryJob] Expired boosts successfully")
			}
		}
	}()
}

// RunSubscriptionRenewalJob checks for expiring subscriptions and auto-renews or expires them
func RunSubscriptionRenewalJob(db *gorm.DB) {
	ctx := context.Background()
	subService := services.NewSubscriptionService(db)

	// Get all active subscriptions
	subs, _, err := subService.GetAllActiveSubscriptions(ctx, 0, 10000)
	if err != nil {
		log.Printf("[RenewalJob] Failed to fetch active subscriptions: %v", err)
		return
	}
	now := time.Now()
	for _, sub := range subs {
		if sub.EndDate.Before(now) {
			// Attempt auto-renewal (pseudo-code, implement payment initiation as needed)
			if sub.AutoRenew {
				log.Printf("[RenewalJob] Auto-renewing subscription %d for user %d", sub.ID, sub.UserID)
				// TODO: Initiate payment for renewal (call payment service)
				// If payment succeeds, extend EndDate and update status
				// If payment fails, set status to "past_due" or "expired"
			} else {
				log.Printf("[RenewalJob] Expiring subscription %d for user %d", sub.ID, sub.UserID)
				sub.Status = "expired"
				_, err := subService.UpdateSubscription(ctx, sub)
				if err != nil {
					log.Printf("[RenewalJob] Failed to expire subscription %d: %v", sub.ID, err)
				}
			}
		}
	}
}
