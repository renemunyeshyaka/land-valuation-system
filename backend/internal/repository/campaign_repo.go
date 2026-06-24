package repository

import (
	"context"
	"errors"

	"backend/internal/models"

	"gorm.io/gorm"
)

type CampaignRepository struct {
	db *gorm.DB
}

func NewCampaignRepository(db *gorm.DB) *CampaignRepository {
	return &CampaignRepository{db: db}
}

// ============================================
// Campaigns
// ============================================

// Create inserts a new campaign
func (r *CampaignRepository) Create(ctx context.Context, campaign *models.Campaign) (*models.Campaign, error) {
	result := r.db.WithContext(ctx).Create(campaign)
	if result.Error != nil {
		return nil, result.Error
	}
	return campaign, nil
}

// GetByID retrieves a campaign by ID
func (r *CampaignRepository) GetByID(ctx context.Context, id uint) (*models.Campaign, error) {
	var campaign models.Campaign
	result := r.db.WithContext(ctx).First(&campaign, id)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("campaign not found")
		}
		return nil, result.Error
	}
	return &campaign, nil
}

// List retrieves campaigns with optional filters and pagination
func (r *CampaignRepository) List(ctx context.Context, page, pageSize int, filters map[string]interface{}) ([]models.Campaign, int64, error) {
	var campaigns []models.Campaign
	var total int64

	query := r.db.WithContext(ctx).Model(&models.Campaign{})

	if status, ok := filters["status"]; ok && status != "" {
		query = query.Where("status = ?", status)
	}
	if campaignType, ok := filters["campaign_type"]; ok && campaignType != "" {
		query = query.Where("campaign_type = ?", campaignType)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&campaigns).Error; err != nil {
		return nil, 0, err
	}

	return campaigns, total, nil
}

// Update updates a campaign
func (r *CampaignRepository) Update(ctx context.Context, campaign *models.Campaign) (*models.Campaign, error) {
	result := r.db.WithContext(ctx).Save(campaign)
	if result.Error != nil {
		return nil, result.Error
	}
	return campaign, nil
}

// UpdateStatus updates the status of a campaign
func (r *CampaignRepository) UpdateStatus(ctx context.Context, id uint, status string) error {
	return r.db.WithContext(ctx).Model(&models.Campaign{}).Where("id = ?", id).
		Update("status", status).Error
}

// IncrementSent increments the sent counter for a campaign
func (r *CampaignRepository) IncrementSent(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Model(&models.Campaign{}).Where("id = ?", id).
		UpdateColumn("sent_count", gorm.Expr("sent_count + 1")).Error
}

// IncrementOpened increments the opened counter
func (r *CampaignRepository) IncrementOpened(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Model(&models.Campaign{}).Where("id = ?", id).
		UpdateColumn("opened_count", gorm.Expr("opened_count + 1")).Error
}

// IncrementClicked increments the clicked counter
func (r *CampaignRepository) IncrementClicked(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Model(&models.Campaign{}).Where("id = ?", id).
		UpdateColumn("clicked_count", gorm.Expr("clicked_count + 1")).Error
}

// IncrementConverted increments the converted counter
func (r *CampaignRepository) IncrementConverted(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Model(&models.Campaign{}).Where("id = ?", id).
		UpdateColumn("converted_count", gorm.Expr("converted_count + 1")).Error
}

// Delete deletes a campaign (drafts only)
func (r *CampaignRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&models.Campaign{}, id).Error
}

// ============================================
// Campaign Activities
// ============================================

// CreateActivity logs a campaign activity
func (r *CampaignRepository) CreateActivity(ctx context.Context, activity *models.CampaignActivity) (*models.CampaignActivity, error) {
	result := r.db.WithContext(ctx).Create(activity)
	if result.Error != nil {
		return nil, result.Error
	}
	return activity, nil
}

// GetActivityByTrackingID retrieves an activity by its tracking ID
func (r *CampaignRepository) GetActivityByTrackingID(ctx context.Context, trackingID string) (*models.CampaignActivity, error) {
	var activity models.CampaignActivity
	result := r.db.WithContext(ctx).Where("tracking_id = ?", trackingID).First(&activity)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("activity not found")
		}
		return nil, result.Error
	}
	return &activity, nil
}

// UpdateActivityStatus updates the status of a campaign activity
func (r *CampaignRepository) UpdateActivityStatus(ctx context.Context, id uint, status string, timestamp *gorm.DB) error {
	updates := map[string]interface{}{
		"status": status,
	}
	switch status {
	case "sent":
		updates["sent_at"] = gorm.Expr("CURRENT_TIMESTAMP")
	case "opened":
		updates["opened_at"] = gorm.Expr("CURRENT_TIMESTAMP")
	case "clicked":
		updates["clicked_at"] = gorm.Expr("CURRENT_TIMESTAMP")
	}
	return r.db.WithContext(ctx).Model(&models.CampaignActivity{}).Where("id = ?", id).
		Updates(updates).Error
}

// ListActivitiesByCampaign retrieves all activities for a campaign
func (r *CampaignRepository) ListActivitiesByCampaign(ctx context.Context, campaignID uint, page, pageSize int) ([]models.CampaignActivity, int64, error) {
	var activities []models.CampaignActivity
	var total int64

	query := r.db.WithContext(ctx).Model(&models.CampaignActivity{}).Where("campaign_id = ?", campaignID)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&activities).Error; err != nil {
		return nil, 0, err
	}

	return activities, total, nil
}

// ============================================
// Lead Scores
// ============================================

// CreateScore records a lead score snapshot
func (r *CampaignRepository) CreateScore(ctx context.Context, score *models.LeadScore) (*models.LeadScore, error) {
	result := r.db.WithContext(ctx).Create(score)
	if result.Error != nil {
		return nil, result.Error
	}
	return score, nil
}

// ListScoresByLead retrieves score history for a lead
func (r *CampaignRepository) ListScoresByLead(ctx context.Context, leadID uint, limit int) ([]models.LeadScore, error) {
	var scores []models.LeadScore
	err := r.db.WithContext(ctx).Where("lead_id = ?", leadID).
		Order("created_at DESC").
		Limit(limit).
		Find(&scores).Error
	return scores, err
}
