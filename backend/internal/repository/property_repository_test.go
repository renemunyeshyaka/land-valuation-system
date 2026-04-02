package repository

import (
	"testing"

	"backend/internal/models"

	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestPropertyRepository_FindByUPIPaginated(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&models.User{}, &models.Property{}))

	owner := &models.User{
		ID:           1,
		Email:        "repo-owner@example.com",
		Password:     "owner-pass",
		ReferralCode: "REPO-OWNER-001",
	}
	require.NoError(t, db.Create(owner).Error)

	first := &models.Property{
		ID:           100,
		District:     "Gasabo",
		Sector:       "Kimironko",
		Title:        "UPI Property 1",
		PropertyType: "residential",
		Status:       "available",
		UPI:          "1/02/03/04/0100",
		LandSize:     500,
		Price:        1000000,
		Currency:     "RWF",
		OwnerID:      1,
	}
	require.NoError(t, db.Create(first).Error)

	repo := NewPropertyRepository(db)

	page1, total, err := repo.FindByUPIPaginated("1/02/03/04/0100", 1, 1)
	require.NoError(t, err)
	require.Equal(t, 1, total)
	require.Len(t, page1, 1)

	page2, total, err := repo.FindByUPIPaginated("1/02/03/04/0100", 2, 1)
	require.NoError(t, err)
	require.Equal(t, 1, total)
	require.Len(t, page2, 0)

	empty, total, err := repo.FindByUPIPaginated("1/02/03/04/0100", 999, 1)
	require.NoError(t, err)
	require.Equal(t, 1, total)
	require.Len(t, empty, 0)
}
