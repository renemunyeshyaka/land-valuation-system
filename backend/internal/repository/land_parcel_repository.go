package repository

import (
	"backend/internal/models"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// LandParcelRepository handles data access for land parcels
type LandParcelRepository struct {
	db *gorm.DB
}

// NewLandParcelRepository creates a new land parcel repository
func NewLandParcelRepository(db *gorm.DB) *LandParcelRepository {
	return &LandParcelRepository{db: db}
}

// FindByUPI retrieves a land parcel by UPI
func (r *LandParcelRepository) FindByUPI(upi string) (*models.LandParcel, error) {
	var parcel models.LandParcel
	result := r.db.Where("upi = ?", upi).First(&parcel)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("land parcel with UPI %s not found", upi)
		}
		return nil, result.Error
	}
	return &parcel, nil
}

// FindByID retrieves a land parcel by ID
func (r *LandParcelRepository) FindByID(id uuid.UUID) (*models.LandParcel, error) {
	var parcel models.LandParcel
	result := r.db.Where("id = ?", id).First(&parcel)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("land parcel with ID %s not found", id.String())
		}
		return nil, result.Error
	}
	return &parcel, nil
}

// FindAll retrieves land parcels with filtering and pagination
func (r *LandParcelRepository) FindAll(filter models.LandParcelFilter) ([]*models.LandParcel, int64, error) {
	query := r.db

	// Apply filters
	if filter.UPI != "" {
		query = query.Where("TRIM(upi) = TRIM(?)", filter.UPI)
	}
	if filter.District != "" {
		query = query.Where("district ILIKE ?", filter.District)
	}
	if filter.Sector != "" {
		query = query.Where("sector ILIKE ?", filter.Sector)
	}
	if filter.Cell != "" {
		query = query.Where("cell ILIKE ?", filter.Cell)
	}
	// If only plot number is provided, do a suffix search
	if filter.PlotNumber != "" && filter.UPI == "" {
		query = query.Where("upi LIKE ?", "%"+filter.PlotNumber)
	}
	if filter.PropertyType != "" {
		query = query.Where("property_type = ?", filter.PropertyType)
	}
	if filter.Source != "" {
		query = query.Where("source = ?", filter.Source)
	}
	if filter.MinSize > 0 {
		query = query.Where("land_size_sqm >= ?", filter.MinSize)
	}
	if filter.MaxSize > 0 {
		query = query.Where("land_size_sqm <= ?", filter.MaxSize)
	}

	// Count total
	var total int64
	query.Model(&models.LandParcel{}).Count(&total)

	// Apply sorting
	if filter.SortBy != "" {
		order := "ASC"
		if filter.SortOrder == "DESC" {
			order = "DESC"
		}
		query = query.Order(fmt.Sprintf("%s %s", filter.SortBy, order))
	} else {
		query = query.Order("synced_at DESC, created_at DESC")
	}

	// Apply pagination
	if filter.Limit == 0 {
		filter.Limit = 20
	}
	if filter.Page > 0 {
		offset := (filter.Page - 1) * filter.Limit
		query = query.Offset(offset)
	}
	query = query.Limit(filter.Limit)

	// Fetch results
	var parcels []*models.LandParcel
	result := query.Find(&parcels)
	if result.Error != nil {
		return nil, 0, result.Error
	}

	return parcels, total, nil
}

// Create inserts a new land parcel
func (r *LandParcelRepository) Create(parcel *models.LandParcel) error {
	if parcel.ID == uuid.Nil {
		parcel.ID = uuid.New()
	}
	return r.db.Create(parcel).Error
}

// CreateBatch inserts multiple land parcels (for CSV import)
func (r *LandParcelRepository) CreateBatch(parcels []*models.LandParcel) error {
	// Set IDs for new records
	for i := range parcels {
		if parcels[i].ID == uuid.Nil {
			parcels[i].ID = uuid.New()
		}
	}
	return r.db.CreateInBatches(parcels, 100).Error
}

// Update updates an existing land parcel
func (r *LandParcelRepository) Update(id uuid.UUID, updates map[string]interface{}) error {
	return r.db.Model(&models.LandParcel{}).Where("id = ?", id).Updates(updates).Error
}

// Upsert creates or updates a land parcel based on UPI (for CSV ingestion)
func (r *LandParcelRepository) Upsert(parcel *models.LandParcel) error {
	if parcel.ID == uuid.Nil {
		parcel.ID = uuid.New()
	}

	// Try to find existing by UPI
	existing := &models.LandParcel{}
	result := r.db.Where("upi = ?", parcel.UPI).First(existing)

	if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		// Create new
		return r.db.Create(parcel).Error
	} else if result.Error != nil {
		return result.Error
	}

	// Update existing (preserve ID)
	parcel.ID = existing.ID
	parcel.CreatedAt = existing.CreatedAt
	return r.db.Model(existing).Updates(parcel).Error
}

// Delete removes a land parcel
func (r *LandParcelRepository) Delete(id uuid.UUID) error {
	return r.db.Where("id = ?", id).Delete(&models.LandParcel{}).Error
}

// DeleteBySource removes land parcels from a specific source (for re-syncing)
func (r *LandParcelRepository) DeleteBySource(source string) error {
	return r.db.Where("source = ?", source).Delete(&models.LandParcel{}).Error
}

// GetStats returns statistics about land parcels
func (r *LandParcelRepository) GetStats() (map[string]interface{}, error) {
	var totalCount int64

	r.db.Model(&models.LandParcel{}).Count(&totalCount)

	// Source breakdown
	var sources []map[string]interface{}
	r.db.Model(&models.LandParcel{}).
		Select("source, COUNT(*) as count").
		Group("source").
		Scan(&sources)

	stats := map[string]interface{}{
		"total_parcels": totalCount,
		"by_source":     sources,
	}

	return stats, nil
}
