package services

import (
	"context"
	"strings"
	"time"

	"gorm.io/gorm"
)

type AnalyticsService struct {
	db *gorm.DB
}

func NewAnalyticsService(db *gorm.DB) *AnalyticsService {
	return &AnalyticsService{
		db: db,
	}
}

// GetDashboard retrieves dashboard analytics
func (s *AnalyticsService) GetDashboard(ctx context.Context, userID, timeRange string) (map[string]interface{}, error) {
	// TODO: Query analytics_events and other tables
	dashboard := map[string]interface{}{
		"total_properties":  25,
		"total_valuations":  150,
		"total_searches":    500,
		"average_valuation": 15000000,
		"total_revenue":     2500000,
		"active_listings":   12,
	}

	return dashboard, nil
}

// GetPropertyAnalytics retrieves property-specific analytics
func (s *AnalyticsService) GetPropertyAnalytics(ctx context.Context, propertyID, timeRange string) (map[string]interface{}, error) {
	// TODO: Query valuation history for property
	analytics := map[string]interface{}{
		"views":         250,
		"valuations":    5,
		"price_history": []float64{15000000, 15500000, 16000000},
		"average_value": 15500000,
		"market_trend":  "upward",
		"inquiries":     12,
	}

	return analytics, nil
}

// GetMarketTrends retrieves market trends
func (s *AnalyticsService) GetMarketTrends(ctx context.Context, district, timeRange string) (map[string]interface{}, error) {
	// TODO: Calculate trends from valuation data
	trends := map[string]interface{}{
		"average_price":         20000000,
		"price_change":          5.5,
		"volume":                150,
		"top_property_types":    []string{"residential", "commercial"},
		"best_performing_areas": []string{"Kigali", "Gisenyi"},
	}

	return trends, nil
}

// GetHeatmap retrieves property heatmap data
func (s *AnalyticsService) GetHeatmap(ctx context.Context, propertyType, district string) ([]map[string]interface{}, error) {
	// TODO: Query properties by geolocation
	heatmap := []map[string]interface{}{
		{
			"latitude":  -1.9505,
			"longitude": 30.0573,
			"intensity": 150,
			"count":     25,
		},
	}

	return heatmap, nil
}

// GetUserActivityReport retrieves user activity report
func (s *AnalyticsService) GetUserActivityReport(ctx context.Context, userID string, startDate, endDate interface{}) (map[string]interface{}, error) {
	// TODO: Query activity_logs table
	report := map[string]interface{}{
		"total_logins":     45,
		"total_searches":   120,
		"total_valuations": 15,
		"properties_added": 3,
		"properties_sold":  2,
	}

	return report, nil
}

// GetSearchAnalytics retrieves search analytics
func (s *AnalyticsService) GetSearchAnalytics(ctx context.Context, userID string) (map[string]interface{}, error) {
	// TODO: Query search_queries table
	analytics := map[string]interface{}{
		"total_searches":     500,
		"unique_locations":   50,
		"top_locations":      []string{"Kigali", "Gisenyi", "Huye"},
		"most_searched_type": "residential",
	}

	return analytics, nil
}

// GetValuationInsights retrieves valuation insights
func (s *AnalyticsService) GetValuationInsights(ctx context.Context, userID string) (map[string]interface{}, error) {
	// TODO: Analyze valuation patterns
	insights := map[string]interface{}{
		"total_valuations":   150,
		"average_confidence": 0.95,
		"portfolio_value":    3750000000,
		"price_appreciation": 12.5,
		"market_comparison":  105.5,
	}

	return insights, nil
}

// ExportReport exports analytics report
func (s *AnalyticsService) ExportReport(ctx context.Context, userID, format string, startDate, endDate interface{}) (string, error) {
	// TODO: Generate PDF/CSV report
	return "/tmp/analytics_report." + format, nil
}

// GetRevenueAnalytics retrieves revenue analytics (admin)
func (s *AnalyticsService) GetRevenueAnalytics(ctx context.Context, timeRange string) (map[string]interface{}, error) {
	if s.db == nil {
		return map[string]interface{}{
			"total_revenue":           0,
			"subscription_revenue":    0,
			"valuation_revenue":       0,
			"premium_feature_revenue": 0,
			"active_users":            0,
			"mrr":                     0,
			"range":                   normalizeAnalyticsRange(timeRange),
		}, nil
	}

	start, end := analyticsRangeBounds(timeRange, time.Now())
	monthStart := time.Date(end.Year(), end.Month(), 1, 0, 0, 0, 0, end.Location())

	type revenueAggregate struct {
		TotalRevenue          float64
		SubscriptionRevenue   float64
		ValuationRevenue      float64
		PremiumFeatureRevenue float64
	}

	var totals revenueAggregate
	err := s.db.WithContext(ctx).
		Table("transactions").
		Select(`
			COALESCE(SUM(CASE
				WHEN LOWER(transaction_type) IN ('subscription', 'valuation', 'premium_feature') THEN amount
				ELSE 0
			END), 0) AS total_revenue,
			COALESCE(SUM(CASE
				WHEN LOWER(transaction_type) = 'subscription' THEN amount
				ELSE 0
			END), 0) AS subscription_revenue,
			COALESCE(SUM(CASE
				WHEN LOWER(transaction_type) = 'valuation' THEN amount
				ELSE 0
			END), 0) AS valuation_revenue,
			COALESCE(SUM(CASE
				WHEN LOWER(transaction_type) = 'premium_feature' THEN amount
				ELSE 0
			END), 0) AS premium_feature_revenue`).
		Where("created_at >= ? AND created_at <= ?", start, end).
		Where("LOWER(status) = ? OR LOWER(payment_status) IN ?", "completed", []string{"success", "verified", "blockchain_confirmed"}).
		Scan(&totals).Error
	if err != nil {
		return nil, err
	}

	var activeUsers int64
	if err := s.db.WithContext(ctx).Table("users").Where("is_active = ? AND deleted_at IS NULL", true).Count(&activeUsers).Error; err != nil {
		return nil, err
	}

	var mrr float64
	err = s.db.WithContext(ctx).
		Table("transactions").
		Select("COALESCE(SUM(amount), 0)").
		Where("created_at >= ? AND created_at <= ?", monthStart, end).
		Where("LOWER(transaction_type) = ?", "subscription").
		Where("LOWER(status) = ? OR LOWER(payment_status) IN ?", "completed", []string{"success", "verified", "blockchain_confirmed"}).
		Scan(&mrr).Error
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"total_revenue":           totals.TotalRevenue,
		"subscription_revenue":    totals.SubscriptionRevenue,
		"valuation_revenue":       totals.ValuationRevenue,
		"premium_feature_revenue": totals.PremiumFeatureRevenue,
		"active_users":            activeUsers,
		"mrr":                     mrr,
		"range":                   normalizeAnalyticsRange(timeRange),
		"range_start":             start,
		"range_end":               end,
	}, nil
}

func normalizeAnalyticsRange(timeRange string) string {
	normalized := strings.ToLower(strings.TrimSpace(timeRange))
	switch normalized {
	case "7d", "30d", "90d", "180d", "1y", "12m":
		return normalized
	default:
		return "30d"
	}
}

func analyticsRangeBounds(timeRange string, now time.Time) (time.Time, time.Time) {
	end := now
	switch normalizeAnalyticsRange(timeRange) {
	case "7d":
		return end.AddDate(0, 0, -7), end
	case "90d":
		return end.AddDate(0, 0, -90), end
	case "180d":
		return end.AddDate(0, 0, -180), end
	case "1y", "12m":
		return end.AddDate(-1, 0, 0), end
	default:
		return end.AddDate(0, 0, -30), end
	}
}
