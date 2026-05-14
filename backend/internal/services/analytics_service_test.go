package services

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestAnalyticsService_GetRevenueAnalytics_UsesRealTransactionData(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	require.NoError(t, db.Exec(`
		CREATE TABLE users (
			id INTEGER PRIMARY KEY,
			is_active BOOLEAN,
			deleted_at DATETIME
		)
	`).Error)

	require.NoError(t, db.Exec(`
		CREATE TABLE transactions (
			id INTEGER PRIMARY KEY,
			transaction_type TEXT,
			amount REAL,
			status TEXT,
			payment_status TEXT,
			created_at DATETIME
		)
	`).Error)

	now := time.Now()
	require.NoError(t, db.Exec(`INSERT INTO users (id, is_active, deleted_at) VALUES (1, ?, NULL), (2, ?, NULL), (3, ?, ?)`, true, true, false, now).Error)

	require.NoError(t, db.Exec(`
		INSERT INTO transactions (id, transaction_type, amount, status, payment_status, created_at) VALUES
		(1, 'subscription', 1000, 'completed', 'success', ?),
		(2, 'valuation', 500, 'completed', 'success', ?),
		(3, 'premium_feature', 250, 'completed', 'verified', ?),
		(4, 'subscription', 9999, 'pending', 'pending', ?),
		(5, 'sale', 8000000, 'completed', 'success', ?),
		(6, 'subscription', 700, 'completed', 'success', ?)
	`, now.AddDate(0, 0, -2), now.AddDate(0, 0, -3), now.AddDate(0, 0, -4), now.AddDate(0, 0, -1), now.AddDate(0, 0, -1), now.AddDate(0, -2, 0)).Error)

	service := NewAnalyticsService(db)
	result, err := service.GetRevenueAnalytics(context.Background(), "30d")
	require.NoError(t, err)

	require.Equal(t, float64(1750), result["total_revenue"])
	require.Equal(t, float64(1000), result["subscription_revenue"])
	require.Equal(t, float64(500), result["valuation_revenue"])
	require.Equal(t, float64(250), result["premium_feature_revenue"])
	require.EqualValues(t, 2, result["active_users"])
	require.Equal(t, float64(1000), result["mrr"])
	require.Equal(t, "30d", result["range"])
	_, ok := result["range_start"]
	require.True(t, ok)
	_, ok = result["range_end"]
	require.True(t, ok)
}

func TestAnalyticsService_GetRevenueAnalytics_DefaultsInvalidRange(t *testing.T) {
	start, end := analyticsRangeBounds("nonsense", time.Date(2026, 5, 14, 12, 0, 0, 0, time.UTC))
	require.Equal(t, "30d", normalizeAnalyticsRange("nonsense"))
	require.Equal(t, time.Date(2026, 4, 14, 12, 0, 0, 0, time.UTC), start)
	require.Equal(t, time.Date(2026, 5, 14, 12, 0, 0, 0, time.UTC), end)
}
