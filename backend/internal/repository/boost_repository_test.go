package repository

import (
	"context"
	"testing"
	"time"

	"backend/internal/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect database: %v", err)
	}
	if err := db.AutoMigrate(&models.PropertyBoost{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	return db
}

func TestBoostRepository_CreateAndGetActiveBoostForProperty(t *testing.T) {
	db := setupTestDB(t)
	repo := NewBoostRepository(db)
	ctx := context.Background()

	boost := &models.PropertyBoost{
		PropertyID: 1,
		Status:     "active",
		EndTime:    time.Now().Add(1 * time.Hour),
	}
	_, err := repo.Create(ctx, boost)
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	// Should retrieve the active boost
	got, err := repo.GetActiveBoostForProperty(ctx, 1)
	if err != nil {
		t.Fatalf("GetActiveBoostForProperty failed: %v", err)
	}
	if got.PropertyID != 1 || got.Status != "active" {
		t.Errorf("unexpected boost: %+v", got)
	}
}

func TestBoostRepository_ExpireBoosts(t *testing.T) {
	db := setupTestDB(t)
	repo := NewBoostRepository(db)
	ctx := context.Background()

	// Add an expired boost
	boost := &models.PropertyBoost{
		PropertyID: 2,
		Status:     "active",
		EndTime:    time.Now().Add(-1 * time.Hour),
	}
	_, err := repo.Create(ctx, boost)
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	err = repo.ExpireBoosts(ctx)
	if err != nil {
		t.Fatalf("ExpireBoosts failed: %v", err)
	}

	var updated models.PropertyBoost
	db.First(&updated, "property_id = ?", 2)
	if updated.Status != "expired" {
		t.Errorf("expected status 'expired', got '%s'", updated.Status)
	}
}

func TestBoostRepository_ListActiveBoosts(t *testing.T) {
	db := setupTestDB(t)
	repo := NewBoostRepository(db)
	ctx := context.Background()

	// Add two active boosts, one expired
	if _, err := repo.Create(ctx, &models.PropertyBoost{
		PropertyID: 3,
		Status:     "active",
		EndTime:    time.Now().Add(2 * time.Hour),
	}); err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if _, err := repo.Create(ctx, &models.PropertyBoost{
		PropertyID: 4,
		Status:     "active",
		EndTime:    time.Now().Add(2 * time.Hour),
	}); err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if _, err := repo.Create(ctx, &models.PropertyBoost{
		PropertyID: 5,
		Status:     "expired",
		EndTime:    time.Now().Add(-2 * time.Hour),
	}); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	boosts, err := repo.ListActiveBoosts(ctx)
	if err != nil {
		t.Fatalf("ListActiveBoosts failed: %v", err)
	}
	if len(boosts) != 2 {
		t.Errorf("expected 2 active boosts, got %d", len(boosts))
	}
}
