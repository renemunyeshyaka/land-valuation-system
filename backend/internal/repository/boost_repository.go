package repository

import (
	"backend/internal/models"
	"context"
	"time"

	"gorm.io/gorm"
)

type BoostRepository struct {
	db *gorm.DB
}

func NewBoostRepository(db *gorm.DB) *BoostRepository {
	return &BoostRepository{db: db}
}

func (r *BoostRepository) Create(ctx context.Context, boost *models.PropertyBoost) (*models.PropertyBoost, error) {
	if err := r.db.WithContext(ctx).Create(boost).Error; err != nil {
		return nil, err
	}
	return boost, nil
}

func (r *BoostRepository) GetActiveBoostForProperty(ctx context.Context, propertyID uint) (*models.PropertyBoost, error) {
	var boost models.PropertyBoost
	now := time.Now()
	err := r.db.WithContext(ctx).
		Where("property_id = ? AND status = ? AND end_time > ?", propertyID, "active", now).
		Order("end_time DESC").
		First(&boost).Error
	if err != nil {
		return nil, err
	}
	return &boost, nil
}

func (r *BoostRepository) ExpireBoosts(ctx context.Context) error {
	now := time.Now()
	return r.db.WithContext(ctx).Model(&models.PropertyBoost{}).Where("status = ? AND end_time <= ?", "active", now).Update("status", "expired").Error
}

func (r *BoostRepository) ListActiveBoosts(ctx context.Context) ([]*models.PropertyBoost, error) {
	var boosts []*models.PropertyBoost
	now := time.Now()
	err := r.db.WithContext(ctx).Where("status = ? AND end_time > ?", "active", now).Find(&boosts).Error
	if err != nil {
		return nil, err
	}
	return boosts, nil
}
