package repository

import (
"backend/internal/models"

"gorm.io/gorm"
)

// ValuationRepository handles valuation database operations
type ValuationRepository struct {
db *gorm.DB
}

// NewValuationRepository creates a new valuation repository
func NewValuationRepository(db *gorm.DB) *ValuationRepository {
return &ValuationRepository{db: db}
}

// Create saves a valuation to the database
func (r *ValuationRepository) Create(val *models.Valuation) error {
return r.db.Create(val).Error
}

// FindByID retrieves a valuation by ID
func (r *ValuationRepository) FindByID(id uint) (*models.Valuation, error) {
var valuation models.Valuation
err := r.db.Preload("Property").First(&valuation, id).Error
return &valuation, err
}

// FindByProperty retrieves all valuations for a property
func (r *ValuationRepository) FindByProperty(propertyID uint) ([]models.Valuation, error) {
var valuations []models.Valuation
err := r.db.Where("property_id = ?", propertyID).Order("created_at DESC").Find(&valuations).Error
return valuations, err
}
