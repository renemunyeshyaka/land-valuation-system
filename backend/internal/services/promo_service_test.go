package services

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	"backend/internal/models"

	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func openTestDB(t *testing.T, models ...interface{}) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(models...))
	// Single connection keeps the in-memory DB consistent across goroutines.
	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)
	return db
}

func TestPromoService_GetEarlyAdopterStatus_Default(t *testing.T) {
	db := openTestDB(t, &models.PromoCounter{})

	svc := NewPromoService(db)
	status, err := svc.GetEarlyAdopterStatus(context.Background())
	require.NoError(t, err)
	require.Equal(t, 0, status["granted"])
	require.Equal(t, defaultEarlyAdopterLimit, status["limit"])
	require.Equal(t, defaultEarlyAdopterLimit, status["remaining"])
	require.Equal(t, true, status["enabled"])
	require.Equal(t, defaultFreeMembershipDays, status["membership_days"])
	require.Equal(t, defaultFreeMembershipDays+defaultFreeRetentionGraceDays, status["retention_days"])
}

func TestPromoService_ClaimEarlyAdopterSlot_RespectsLimit(t *testing.T) {
	db := openTestDB(t, &models.PromoCounter{}, &models.User{})
	svc := NewPromoService(db)
	ctx := context.Background()

	// Small cap to exercise the limit without inserting 20k rows.
	require.NoError(t, db.Create(&models.PromoCounter{
		ID: earlyAdopterCounterID, Name: earlyAdopterCounterName, GrantLimit: 3,
	}).Error)

	user := &models.User{Email: "early@example.com", PasswordHash: "x"}
	require.NoError(t, db.Create(user).Error)

	// First claim succeeds and grants the benefit.
	claimed, err := svc.ClaimEarlyAdopterSlot(ctx, user)
	require.NoError(t, err)
	require.True(t, claimed)

	var reloaded models.User
	require.NoError(t, db.First(&reloaded, user.ID).Error)
	require.True(t, reloaded.IsEarlyAdopter)
	require.Equal(t, "free", reloaded.SubscriptionTier)
	require.Equal(t, "active", reloaded.SubscriptionStatus)
	require.NotNil(t, reloaded.SubscriptionExpiry)
	require.WithinDuration(t, time.Now().Add(FreeMembershipDuration()), *reloaded.SubscriptionExpiry, time.Minute)
	require.Nil(t, reloaded.SubscriptionNextRenewal)

	// Fill the remaining 2 slots.
	for i := 0; i < 2; i++ {
		u := &models.User{Email: fmt.Sprintf("u%d@example.com", i), PasswordHash: "x"}
		require.NoError(t, db.Create(u).Error)
		claimed, err = svc.ClaimEarlyAdopterSlot(ctx, u)
		require.NoError(t, err)
		require.True(t, claimed)
	}

	// Next claim is denied once the cap is reached.
	late := &models.User{Email: "late@example.com", PasswordHash: "x"}
	require.NoError(t, db.Create(late).Error)
	claimed, err = svc.ClaimEarlyAdopterSlot(ctx, late)
	require.NoError(t, err)
	require.False(t, claimed)

	var lateReload models.User
	require.NoError(t, db.First(&lateReload, late.ID).Error)
	require.False(t, lateReload.IsEarlyAdopter)
	require.NotEqual(t, "active", lateReload.SubscriptionStatus)

	status, err := svc.GetEarlyAdopterStatus(ctx)
	require.NoError(t, err)
	require.Equal(t, 3, status["granted"])
	require.Equal(t, 0, status["remaining"])
}

func TestPromoService_ClaimEarlyAdopterSlot_Concurrent(t *testing.T) {
	db := openTestDB(t, &models.PromoCounter{}, &models.User{})
	svc := NewPromoService(db)
	ctx := context.Background()

	const totalUsers = 50
	const cap = 20
	require.NoError(t, db.Create(&models.PromoCounter{
		ID: earlyAdopterCounterID, Name: earlyAdopterCounterName, GrantLimit: cap,
	}).Error)

	var wg sync.WaitGroup
	results := make([]bool, totalUsers)
	for i := 0; i < totalUsers; i++ {
		u := &models.User{Email: fmt.Sprintf("c%d@example.com", i), PasswordHash: "x"}
		require.NoError(t, db.Create(u).Error)
		wg.Add(1)
		go func(idx int, uid uint) {
			defer wg.Done()
			claimed, err := svc.ClaimEarlyAdopterSlot(ctx, &models.User{ID: uid})
			require.NoError(t, err)
			results[idx] = claimed
		}(i, u.ID)
	}
	wg.Wait()

	grantedCount := 0
	for _, c := range results {
		if c {
			grantedCount++
		}
	}
	require.Equal(t, cap, grantedCount)

	var actualGranted int64
	require.NoError(t, db.Model(&models.PromoCounter{}).Where("id = ?", earlyAdopterCounterID).Pluck("granted", &actualGranted).Error)
	require.Equal(t, int64(cap), actualGranted)

	var flagged int64
	require.NoError(t, db.Model(&models.User{}).Where("is_early_adopter = ?", true).Count(&flagged).Error)
	require.Equal(t, int64(cap), flagged)
}
