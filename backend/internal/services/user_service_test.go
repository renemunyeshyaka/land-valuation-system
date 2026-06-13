package services

import (
	"context"
	"testing"

	"backend/internal/models"

	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestUserService_UpdateUserByAdmin_WritesRoleAndAccessAuditLogs(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&models.User{}))
	require.NoError(t, db.Exec(`
		CREATE TABLE activity_logs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER,
			action TEXT NOT NULL,
			resource_type TEXT,
			resource_id INTEGER,
			ip_address TEXT,
			user_agent TEXT,
			details TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`).Error)

	admin := &models.User{Email: "admin@example.com", Password: "secret123", FirstName: "Admin", LastName: "User", UserType: "admin"}
	target := &models.User{Email: "target@example.com", Password: "secret123", FirstName: "Target", LastName: "User", UserType: "individual", SubscriptionTier: "free", SubscriptionStatus: "inactive"}
	require.NoError(t, db.Create(admin).Error)
	require.NoError(t, db.Create(target).Error)

	service := NewUserService(db)
	ctx := context.Background()

	updatedUser, err := service.UpdateUserByAdmin(
		ctx,
		"2",
		&models.User{UserType: "partner"},
		"",
		nil,
		nil,
		nil,
		nil,
		nil,
		nil,
		nil,
		nil,
		nil,
		&AdminUserAuditMetadata{ActorUserID: "1", IPAddress: "127.0.0.1", UserAgent: "jest"},
	)
	require.NoError(t, err)
	require.Equal(t, "partner", updatedUser.UserType)

	updatedUser, err = service.UpdateUserByAdmin(
		ctx,
		"2",
		&models.User{SubscriptionTier: "professional", SubscriptionStatus: "active"},
		"",
		nil,
		boolPtr(true),
		boolPtr(true),
		nil,
		nil,
		nil,
		boolPtr(true),
		nil,
		boolPtr(true),
		&AdminUserAuditMetadata{ActorUserID: "1", IPAddress: "127.0.0.1", UserAgent: "jest"},
	)
	require.NoError(t, err)
	require.Equal(t, "professional", updatedUser.SubscriptionTier)
	require.True(t, updatedUser.IsVerified)

	type activityLogRow struct {
		Action       string
		ResourceType string
		ResourceID   int64
		UserID       int64
		Details      string
	}
	var rows []activityLogRow
	require.NoError(t, db.Table("activity_logs").Order("id ASC").Find(&rows).Error)
	require.Len(t, rows, 2)
	require.Equal(t, "admin_user_role_updated", rows[0].Action)
	require.Equal(t, "user", rows[0].ResourceType)
	require.EqualValues(t, 2, rows[0].ResourceID)
	require.EqualValues(t, 1, rows[0].UserID)
	require.Contains(t, rows[0].Details, "user_type")
	require.Contains(t, rows[0].Details, "partner")

	require.Equal(t, "admin_user_access_updated", rows[1].Action)
	require.Contains(t, rows[1].Details, "subscription_tier")
	require.Contains(t, rows[1].Details, "professional")
	require.Contains(t, rows[1].Details, "is_ultimate_no_expiry")
}

func boolPtr(v bool) *bool {
	return &v
}
