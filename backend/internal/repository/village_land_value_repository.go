package repository

import (
	"context"

	"gorm.io/gorm"
)

type VillageLandValue struct {
	Village                string  `gorm:"column:village"`
	Cell                   string  `gorm:"column:cell"`
	Sector                 string  `gorm:"column:sector"`
	Province               string  `gorm:"column:province"`
	District               string  `gorm:"column:district"`
	LandUse                string  `gorm:"column:land_use"`
	MinValuePerSqm         float64 `gorm:"column:min_value_per_sqm"`
	WeightedAvgValuePerSqm float64 `gorm:"column:weighted_avg_value_per_sqm"`
	MaxValuePerSqm         float64 `gorm:"column:max_value_per_sqm"`
}

type VillageLandValueRepository struct {
	db *gorm.DB
}

func NewVillageLandValueRepository(db *gorm.DB) *VillageLandValueRepository {
	return &VillageLandValueRepository{db: db}
}

func normalizeProvince(province string) string {
	if province == "Kigali City" || province == "Kigali city" {
		return "Kigali Town/Umujyi wa Kigali"
	}
	return province
}

func (r *VillageLandValueRepository) GetAllByAllFields(ctx context.Context, province, district, sector, cell, village string) ([]VillageLandValue, error) {
	normProvince := normalizeProvince(province)
	var values []VillageLandValue
	result := r.db.WithContext(ctx).Table("village_land_values").
		Where("LOWER(province) = LOWER(?) AND LOWER(district) = LOWER(?) AND LOWER(sector) = LOWER(?) AND LOWER(cell) = LOWER(?) AND LOWER(village) = LOWER(?)", normProvince, district, sector, cell, village).
		Find(&values)
	if result.Error != nil {
		return nil, result.Error
	}
	if len(values) == 0 {
		return nil, gorm.ErrRecordNotFound
	}
	return values, nil
}

func (r *VillageLandValueRepository) GetByAllFields(ctx context.Context, province, district, sector, cell, village string) (*VillageLandValue, error) {
	// Normalize province alternate names
	values, err := r.GetAllByAllFields(ctx, province, district, sector, cell, village)
	if err != nil {
		return nil, err
	}
	return &values[0], nil
}
