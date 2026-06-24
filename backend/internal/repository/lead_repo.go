package repository

import (
	"context"
	"errors"

	"backend/internal/models"

	"gorm.io/gorm"
)

type LeadRepository struct {
	db *gorm.DB
}

func NewLeadRepository(db *gorm.DB) *LeadRepository {
	return &LeadRepository{db: db}
}

// Create inserts a new lead
func (r *LeadRepository) Create(ctx context.Context, lead *models.Lead) (*models.Lead, error) {
	result := r.db.WithContext(ctx).Create(lead)
	if result.Error != nil {
		return nil, result.Error
	}
	return lead, nil
}

// GetByID retrieves a lead by ID
func (r *LeadRepository) GetByID(ctx context.Context, id uint) (*models.Lead, error) {
	var lead models.Lead
	result := r.db.WithContext(ctx).First(&lead, id)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("lead not found")
		}
		return nil, result.Error
	}
	return &lead, nil
}

// GetByEmail retrieves a lead by email
func (r *LeadRepository) GetByEmail(ctx context.Context, email string) (*models.Lead, error) {
	var lead models.Lead
	result := r.db.WithContext(ctx).Where("email = ?", email).First(&lead)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("lead not found")
		}
		return nil, result.Error
	}
	return &lead, nil
}

// List retrieves leads with optional filters and pagination
func (r *LeadRepository) List(ctx context.Context, page, pageSize int, filters map[string]interface{}) ([]models.Lead, int64, error) {
	var leads []models.Lead
	var total int64

	query := r.db.WithContext(ctx).Model(&models.Lead{})

	// Apply filters
	if status, ok := filters["status"]; ok && status != "" {
		query = query.Where("status = ?", status)
	}
	if segment, ok := filters["ai_segment"]; ok && segment != "" {
		query = query.Where("ai_segment = ?", segment)
	}
	if district, ok := filters["district"]; ok && district != "" {
		query = query.Where("district = ?", district)
	}
	if minScore, ok := filters["min_score"]; ok {
		query = query.Where("ai_score >= ?", minScore)
	}
	if search, ok := filters["search"]; ok && search != "" {
		searchTerm := "%" + search.(string) + "%"
		query = query.Where(
			"first_name ILIKE ? OR last_name ILIKE ? OR email ILIKE ? OR company ILIKE ?",
			searchTerm, searchTerm, searchTerm, searchTerm,
		)
	}

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Paginate
	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("ai_score DESC, created_at DESC").Find(&leads).Error; err != nil {
		return nil, 0, err
	}

	return leads, total, nil
}

// Update updates a lead
func (r *LeadRepository) Update(ctx context.Context, lead *models.Lead) (*models.Lead, error) {
	result := r.db.WithContext(ctx).Save(lead)
	if result.Error != nil {
		return nil, result.Error
	}
	return lead, nil
}

// UpdateStatus updates the status of a lead
func (r *LeadRepository) UpdateStatus(ctx context.Context, id uint, status string) error {
	return r.db.WithContext(ctx).Model(&models.Lead{}).Where("id = ?", id).
		Update("status", status).Error
}

// UpdateAIScore updates the AI score and related fields
func (r *LeadRepository) UpdateAIScore(ctx context.Context, id uint, score float64, segment string, insights models.JSONB) error {
	return r.db.WithContext(ctx).Model(&models.Lead{}).Where("id = ?", id).
		Updates(map[string]interface{}{
			"ai_score":       score,
			"ai_segment":     segment,
			"ai_insights":    insights,
			"ai_last_scored": gorm.Expr("CURRENT_TIMESTAMP"),
		}).Error
}

// Unsubscribe marks a lead as unsubscribed by token
func (r *LeadRepository) Unsubscribe(ctx context.Context, token string) error {
	result := r.db.WithContext(ctx).Model(&models.Lead{}).
		Where("unsubscribe_token = ?", token).
		Where("unsubscribed_at IS NULL").
		Updates(map[string]interface{}{
			"status":          "unsubscribed",
			"unsubscribed_at": gorm.Expr("CURRENT_TIMESTAMP"),
		})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		// Token not found or already unsubscribed — not an error
		return nil
	}
	return nil
}

// SetUnsubscribeToken sets the unsubscribe token for a lead
func (r *LeadRepository) SetUnsubscribeToken(ctx context.Context, id uint, token string) error {
	return r.db.WithContext(ctx).Model(&models.Lead{}).Where("id = ?", id).
		Update("unsubscribe_token", token).Error
}

// Delete soft-deletes a lead
func (r *LeadRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&models.Lead{}, id).Error
}

// GetStats returns aggregate stats about leads
func (r *LeadRepository) GetStats(ctx context.Context) (map[string]interface{}, error) {
	var total int64
	var scored int64
	var contacted int64
	var converted int64

	r.db.WithContext(ctx).Model(&models.Lead{}).Count(&total)
	r.db.WithContext(ctx).Model(&models.Lead{}).Where("ai_score > 0").Count(&scored)
	r.db.WithContext(ctx).Model(&models.Lead{}).Where("status IN ?", []string{"contacted", "engaged", "converted"}).Count(&contacted)
	r.db.WithContext(ctx).Model(&models.Lead{}).Where("status = ?", "converted").Count(&converted)

	// Status distribution
	type StatusCount struct {
		Status string `json:"status"`
		Count  int64  `json:"count"`
	}
	var distribution []StatusCount
	r.db.WithContext(ctx).Model(&models.Lead{}).
		Select("status, COUNT(*) as count").
		Group("status").
		Order("count DESC").
		Find(&distribution)

	return map[string]interface{}{
		"total":        total,
		"scored":       scored,
		"contacted":    contacted,
		"converted":    converted,
		"distribution": distribution,
	}, nil
}
