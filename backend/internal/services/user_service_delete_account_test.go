package services

import (
	"context"
	"fmt"
	"strings"
	"testing"

	"backend/internal/models"

	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// newDeleteAccountTestDB builds an in-memory database with the tables the
// self-service account deletion path touches. A legacy `kyc_document_url`
// column is added to mirror production, where it exists outside the Go model.
func newDeleteAccountTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&models.User{}))
	require.NoError(t, db.Exec(`ALTER TABLE users ADD COLUMN kyc_document_url TEXT`).Error)

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

	require.NoError(t, db.Exec(`
		CREATE TABLE leads (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			created_at DATETIME,
			updated_at DATETIME,
			first_name TEXT,
			last_name TEXT,
			email TEXT,
			phone TEXT,
			company TEXT,
			unsubscribe_token TEXT,
			status TEXT DEFAULT 'discovered',
			unsubscribed_at DATETIME,
			converted_user_id INTEGER
		)
	`).Error)

	require.NoError(t, db.Exec(`
		CREATE TABLE notifications (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			title TEXT NOT NULL,
			message TEXT NOT NULL,
			is_read BOOLEAN DEFAULT FALSE
		)
	`).Error)

	return db
}

func TestUserService_DeleteAccount_VerifiesPasswordAndErasesPersonalData(t *testing.T) {
	db := newDeleteAccountTestDB(t)
	ctx := context.Background()

	user := &models.User{
		Email:             "self@example.com",
		Phone:             "+250788123123",
		Password:          "secret123",
		FirstName:         "Jean",
		LastName:          "Rene",
		FullName:          "Jean Rene",
		NationalID:        "1199880011223344",
		UserType:          "individual",
		Bio:               "Land owner in Kigali",
		City:              "Kigali",
		Country:           "Rwanda",
		CompanyName:       "Rene Holdings",
		BusinessLicense:   "BL-12345",
		ProfilePictureURL: "/uploads/jean.png",
	}
	require.NoError(t, db.Create(user).Error)
	require.NotEmpty(t, user.PasswordHash, "PasswordHash must be populated so login can verify it")
	require.NoError(t, db.Exec(`UPDATE users SET kyc_document_url = ? WHERE id = ?`, "/uploads/id.pdf", user.ID).Error)

	// A lead/CRM record and a notification also hold this person's data.
	require.NoError(t, db.Exec(
		`INSERT INTO leads (first_name, last_name, email, phone, company, status, converted_user_id)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		"Jean", "Rene", "self@example.com", "+250788123123", "Rene Holdings", "converted", user.ID,
	).Error)
	require.NoError(t, db.Exec(
		`INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)`,
		user.ID, "Welcome", "Hello Jean",
	).Error)

	service := NewUserService(db)
	userID := fmt.Sprintf("%d", user.ID)

	// A wrong password must never delete the account.
	err := service.DeleteAccount(ctx, userID, "wrong-password", "")
	require.Error(t, err)
	require.Equal(t, "incorrect password", err.Error())

	var stillThere models.User
	require.NoError(t, db.First(&stillThere, user.ID).Error)
	require.NotEmpty(t, stillThere.PasswordHash)

	// A missing password is also rejected.
	require.Error(t, service.DeleteAccount(ctx, userID, "", ""))

	// The correct password erases the account.
	require.NoError(t, service.DeleteAccount(ctx, userID, "secret123", "no_longer_needed"))

	// Soft delete hides the user from normal lookups (login, profile, middleware).
	var visibleCount int64
	require.NoError(t, db.Model(&models.User{}).Where("id = ?", user.ID).Count(&visibleCount).Error)
	require.Zero(t, visibleCount)

	var raw models.User
	require.NoError(t, db.Unscoped().First(&raw, user.ID).Error)
	require.True(t, raw.DeletedAt.Valid, "account must be soft-deleted")

	// Credentials are gone.
	require.Empty(t, raw.PasswordHash, "stored password hash must be scrubbed")
	require.Empty(t, raw.Password, "stored password must be scrubbed")
	require.False(t, raw.IsActive, "account must be deactivated")

	// Personal data is gone, replaced by a unique tombstone email.
	require.Equal(t, fmt.Sprintf("deleted+%d@deleted.landval.local", user.ID), raw.Email)
	require.Empty(t, raw.Phone)
	require.Empty(t, raw.NationalID)
	require.Equal(t, "Deleted", raw.FirstName)
	require.Equal(t, "User", raw.LastName)
	require.Equal(t, "Deleted User", raw.FullName)
	require.Empty(t, raw.ProfilePictureURL)
	require.Empty(t, raw.CompanyName)
	require.Empty(t, raw.BusinessLicense)
	require.Empty(t, raw.Bio)
	require.Empty(t, raw.City)
	require.Empty(t, raw.Country)
	require.False(t, raw.EmailVerified)

	// Legacy columns outside the Go model are cleared too.
	var kycDoc *string
	require.NoError(t, db.Raw(`SELECT kyc_document_url FROM users WHERE id = ?`, user.ID).Scan(&kycDoc).Error)
	require.Nil(t, kycDoc, "KYC document reference must be cleared")

	// The lead/CRM copy is anonymised and opted out.
	var lead struct {
		FirstName      *string
		LastName       *string
		Email          *string
		Phone          *string
		Company        *string
		UnsubscribeTok *string
		Status         string
	}
	require.NoError(t, db.Raw(`SELECT first_name, last_name, email, phone, company, unsubscribe_token, status FROM leads LIMIT 1`).Scan(&lead).Error)
	require.Nil(t, lead.FirstName)
	require.Nil(t, lead.LastName)
	require.Nil(t, lead.Email)
	require.Nil(t, lead.Phone)
	require.Nil(t, lead.Company)
	require.Nil(t, lead.UnsubscribeTok)
	require.Equal(t, "unsubscribed", lead.Status)

	// Notifications addressed to the user are removed.
	var notificationCount int64
	require.NoError(t, db.Table("notifications").Where("user_id = ?", user.ID).Count(&notificationCount).Error)
	require.Zero(t, notificationCount)

	// Deletion is recorded for audit purposes, without re-storing the address.
	var auditDetails string
	require.NoError(t, db.Raw(`SELECT details FROM activity_logs WHERE action = ?`, "account_self_deleted").Scan(&auditDetails).Error)
	require.NotEmpty(t, auditDetails)
	require.False(t, strings.Contains(auditDetails, "self@example.com"), "audit log must not retain the erased email")
	require.True(t, strings.Contains(auditDetails, "email_sha256"))
}

func TestUserService_DeleteAccount_LastAdminCannotDeleteSelf(t *testing.T) {
	db := newDeleteAccountTestDB(t)
	ctx := context.Background()

	admin := &models.User{Email: "admin@example.com", Password: "secret123", UserType: "admin"}
	require.NoError(t, db.Create(admin).Error)

	service := NewUserService(db)
	adminID := fmt.Sprintf("%d", admin.ID)

	err := service.DeleteAccount(ctx, adminID, "secret123", "")
	require.Error(t, err)
	require.Equal(t, "the last administrator account cannot be deleted", err.Error())

	var stillThere models.User
	require.NoError(t, db.First(&stillThere, admin.ID).Error)

	// With a second admin present, self-deletion is allowed.
	other := &models.User{Email: "admin2@example.com", Password: "secret123", UserType: "admin"}
	require.NoError(t, db.Create(other).Error)

	require.NoError(t, service.DeleteAccount(ctx, adminID, "secret123", ""))

	var visibleCount int64
	require.NoError(t, db.Model(&models.User{}).Where("id = ?", admin.ID).Count(&visibleCount).Error)
	require.Zero(t, visibleCount)
}

func TestUserService_DeleteAccount_UnknownUser(t *testing.T) {
	db := newDeleteAccountTestDB(t)
	service := NewUserService(db)

	err := service.DeleteAccount(context.Background(), "424242", "secret123", "")
	require.Error(t, err)
	require.Equal(t, "user not found", err.Error())
}

func TestUserService_DeleteAccount_FreedEmailCanBeReused(t *testing.T) {
	db := newDeleteAccountTestDB(t)
	ctx := context.Background()

	user := &models.User{Email: "reuse@example.com", Password: "secret123", UserType: "individual"}
	require.NoError(t, db.Create(user).Error)

	service := NewUserService(db)
	require.NoError(t, service.DeleteAccount(ctx, fmt.Sprintf("%d", user.ID), "secret123", ""))

	// The tombstone email is unique per deleted account, so the original address
	// can be registered again without colliding with the erased account.
	fresh := &models.User{Email: "reuse@example.com", Password: "secret456", UserType: "individual"}
	require.NoError(t, db.Create(fresh).Error)

	var tombstones []string
	require.NoError(t, db.Unscoped().Model(&models.User{}).
		Where("email LIKE ?", "deleted+%@deleted.landval.local").
		Pluck("email", &tombstones).Error)
	require.Len(t, tombstones, 1)
	require.Equal(t, fmt.Sprintf("deleted+%d@deleted.landval.local", user.ID), tombstones[0])
}
