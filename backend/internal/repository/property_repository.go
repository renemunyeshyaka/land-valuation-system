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

type PropertyFilter struct {
	District     string
	PropertyType string
	Status       string
	MinPrice     float64
	MaxPrice     float64
	MinSize      float64
	MaxSize      float64
	IsVerified   *bool
	IsDiaspora   *bool
	Latitude     float64
	Longitude    float64
	Radius       float64 // in meters
	Page         int
	PageSize     int
	SortBy       string
	SortOrder    string
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

func (r *PropertyRepository) FindAll(filter PropertyFilter) ([]models.Property, int64, error) {
	var properties []models.Property
	var total int64

	query := r.db.Model(&models.Property{})

	// Apply filters
	if filter.District != "" {
		query = query.Where("district = ?", filter.District)
	}

	if filter.PropertyType != "" {
		query = query.Where("property_type = ?", filter.PropertyType)
	}

	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}

	if filter.MinPrice > 0 {
		query = query.Where("price >= ?", filter.MinPrice)
	}

	if filter.MaxPrice > 0 {
		query = query.Where("price <= ?", filter.MaxPrice)
	}

	if filter.MinSize > 0 {
		query = query.Where("land_size >= ?", filter.MinSize)
	}

	if filter.MaxSize > 0 {
		query = query.Where("land_size <= ?", filter.MaxSize)
	}

	if filter.IsVerified != nil {
		query = query.Where("is_verified = ?", *filter.IsVerified)
	}

	if filter.IsDiaspora != nil {
		query = query.Where("is_diaspora = ?", *filter.IsDiaspora)
	}

	// Nearby search using Haversine formula
	if filter.Latitude != 0 && filter.Longitude != 0 && filter.Radius > 0 {
		lat := filter.Latitude
		lng := filter.Longitude
		radius := filter.Radius

		query = query.Where(`
            (6371000 * acos(cos(radians(?)) * cos(radians(latitude)) * 
            cos(radians(longitude) - radians(?)) + sin(radians(?)) * 
            sin(radians(latitude)))) <= ?`, lat, lng, lat, radius)
	}

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Pagination
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.PageSize < 1 {
		filter.PageSize = 20
	}
	offset := (filter.Page - 1) * filter.PageSize

	// Sorting
	if filter.SortBy != "" {
		order := filter.SortBy
		if filter.SortOrder == "desc" {
			order += " desc"
		}
		query = query.Order(order)
	} else {
		query = query.Order("created_at desc")
	}

	err := query.Offset(offset).Limit(filter.PageSize).Find(&properties).Error
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

func (r *PropertyRepository) FindByOwner(ownerID uint, page, pageSize int) ([]models.Property, int64, error) {
	var properties []models.Property
	var total int64

	query := r.db.Model(&models.Property{}).Where("owner_id = ?", ownerID)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	err := query.Offset(offset).Limit(pageSize).Order("created_at desc").Find(&properties).Error

	return properties, total, err
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
