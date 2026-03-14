package services

import (
	"backend/internal/models"
	"backend/internal/repository"
	"context"
	"time"
)

type BoostService struct {
	repo *repository.BoostRepository
}

func NewBoostService(repo *repository.BoostRepository) *BoostService {
	return &BoostService{repo: repo}
}

// CreateBoost creates a new boost/featured listing for a property
func (s *BoostService) CreateBoost(ctx context.Context, propertyID, userID uint, durationHours int, boostType string, paymentID *uint) (*models.PropertyBoost, error) {
	start := time.Now()
	end := start.Add(time.Duration(durationHours) * time.Hour)
	boost := &models.PropertyBoost{
		PropertyID: propertyID,
		UserID:     userID,
		StartTime:  start,
		EndTime:    end,
		Status:     "active",
		Type:       boostType,
		PaymentID:  paymentID,
	}
	return s.repo.Create(ctx, boost)
}

// ExpireBoosts marks all expired boosts as expired
func (s *BoostService) ExpireBoosts(ctx context.Context) error {
	return s.repo.ExpireBoosts(ctx)
}

// GetActiveBoostForProperty returns the current active boost for a property
func (s *BoostService) GetActiveBoostForProperty(ctx context.Context, propertyID uint) (*models.PropertyBoost, error) {
	return s.repo.GetActiveBoostForProperty(ctx, propertyID)
}

// ListActiveBoosts returns all currently active boosts
func (s *BoostService) ListActiveBoosts(ctx context.Context) ([]*models.PropertyBoost, error) {
	return s.repo.ListActiveBoosts(ctx)
}
