package repository

import (
	"errors"

	"backend/internal/models"

	"gorm.io/gorm"
)

type PropertyRepository struct {
	db *gorm.DB
}

func NewPropertyRepository(db *gorm.DB) *PropertyRepository {
	return &PropertyRepository{db: db}
}

func (r *PropertyRepository) DB() *gorm.DB {
	return r.db
}

func (r *PropertyRepository) Create(property *models.Property) error {
	return r.db.Create(property).Error
}

func (r *PropertyRepository) Update(property *models.Property) error {
	return r.db.Save(property).Error
}

func (r *PropertyRepository) Delete(id uint) error {
	return r.db.Delete(&models.Property{}, id).Error
}

func (r *PropertyRepository) FindByID(id uint, preloads ...string) (*models.Property, error) {
	var property models.Property
	query := r.db

	for _, preload := range preloads {
		query = query.Preload(preload)
	}

	err := query.First(&property, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	return &property, nil
}

// PropertyFilter is used for UPI-only search
type PropertyFilter struct {
	UPI string
}

// FindByUPIPaginated finds properties by UPI with database-level pagination.
func (r *PropertyRepository) FindByUPIPaginated(upi string, page, limit int) ([]models.Property, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	query := r.db.Model(&models.Property{}).Where("upi = ?", upi)

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	var properties []models.Property
	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&properties).Error; err != nil {
		return nil, 0, err
	}

	return properties, int(total), nil
}

func (r *PropertyRepository) FindAll(filter PropertyFilter) ([]models.Property, int64, error) {
	var properties []models.Property
	var total int64
	if filter.UPI == "" {
		return nil, 0, nil
	}
	err := r.db.Model(&models.Property{}).Where("upi = ?", filter.UPI).Count(&total).Find(&properties).Error
	return properties, total, err
}

func (r *PropertyRepository) IncrementViews(id uint) error {
	return r.db.Model(&models.Property{}).Where("id = ?", id).
		Update("views", gorm.Expr("views + 1")).Error
}

func (r *PropertyRepository) IncrementInterested(id uint) error {
	return r.db.Model(&models.Property{}).Where("id = ?", id).
		Update("interested", gorm.Expr("interested + 1")).Error
}

func (r *PropertyRepository) GetStatistics() (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// Total properties
	var totalProperties int64
	if err := r.db.Model(&models.Property{}).Count(&totalProperties).Error; err != nil {
		return nil, err
	}
	stats["total_properties"] = totalProperties

	// Available properties
	var available int64
	if err := r.db.Model(&models.Property{}).Where("status = ?", "available").Count(&available).Error; err != nil {
		return nil, err
	}
	stats["available"] = available

	// Average price
	var avgPrice float64
	if err := r.db.Model(&models.Property{}).Select("avg(price)").Scan(&avgPrice).Error; err != nil {
		return nil, err
	}
	stats["average_price"] = avgPrice

	// Properties by type
	type statsByType struct {
		PropertyType string
		Count        int64
		AvgPrice     float64
	}
	var byType []statsByType
	if err := r.db.Model(&models.Property{}).
		Select("property_type, count(*) as count, avg(price) as avg_price").
		Group("property_type").Scan(&byType).Error; err != nil {
		return nil, err
	}
	stats["by_type"] = byType

	// Properties by district
	var byDistrict []struct {
		District string
		Count    int64
		AvgPrice float64
	}
	if err := r.db.Model(&models.Property{}).
		Select("district, count(*) as count, avg(price) as avg_price").
		Group("district").Scan(&byDistrict).Error; err != nil {
		return nil, err
	}
	stats["by_district"] = byDistrict

	return stats, nil
}
