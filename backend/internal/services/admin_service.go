package services

import (
	"context"
	"strings"

	"backend/internal/models"
	"backend/internal/repository"

	"gorm.io/gorm"
)

type AdminService struct {
	userRepo *repository.UserRepository
	db       *gorm.DB
}

func NewAdminService(db *gorm.DB) *AdminService {
	return &AdminService{
		userRepo: repository.NewUserRepository(db),
		db:       db,
	}
}

// GetAllUsers retrieves all users
func (s *AdminService) GetAllUsers(ctx context.Context, page, limit int, status, userType, search string) ([]*models.User, int, error) {
	offset := (page - 1) * limit
	filters := map[string]string{}

	if status != "" {
		filters["status"] = status
	}
	if userType != "" {
		filters["type"] = userType
	}
	if search != "" {
		filters["search"] = search
	}

	return s.userRepo.List(ctx, offset, limit, filters)
}

// GetUser retrieves user details
func (s *AdminService) GetUser(ctx context.Context, userID string) (*models.User, error) {
	return s.userRepo.GetByID(ctx, userID)
}

// VerifyUserKYC verifies user KYC
func (s *AdminService) VerifyUserKYC(ctx context.Context, userID, status, comment string) error {
	// TODO: Update KYC status and add comment
	_ = comment
	return s.userRepo.UpdateKYCStatus(ctx, userID, status, "")
}

// SuspendUser suspends user account
func (s *AdminService) SuspendUser(ctx context.Context, userID, reason string) error {
	// TODO: Mark user as suspended and log reason
	_ = reason
	return nil
}

// ReactivateUser reactivates suspended user
func (s *AdminService) ReactivateUser(ctx context.Context, userID string) error {
	// TODO: Reactivate user account
	return nil
}

// ModerateContent moderates user content
func (s *AdminService) ModerateContent(ctx context.Context, contentID, action, reason, message string) error {
	// TODO: Apply moderation action (approve, reject, flag)
	_ = contentID
	_ = action
	_ = reason
	_ = message
	return nil
}

// GetSystemConfig retrieves system configuration
func (s *AdminService) GetSystemConfig(ctx context.Context) (map[string]interface{}, error) {
	// TODO: Fetch from config table
	config := map[string]interface{}{
		"site_name":        "Land Valuation System",
		"support_email":    "support@landvaluation.rw",
		"payment_enabled":  true,
		"kyc_required":     true,
		"marketplace_sync": true,
	}

	return config, nil
}

// UpdateSystemConfig updates system configuration
func (s *AdminService) UpdateSystemConfig(ctx context.Context, config map[string]interface{}) error {
	// TODO: Store config in database
	return nil
}

// GetAuditLogs retrieves audit logs from the activity_logs table
func (s *AdminService) GetAuditLogs(ctx context.Context, page, limit int, action, userID string) ([]map[string]interface{}, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}
	offset := (page - 1) * limit

	type ActivityRow struct {
		ID           int64  `json:"id"`
		UserID       int64  `json:"user_id"`
		Action       string `json:"action"`
		ResourceType string `json:"resource_type"`
		ResourceID   *int64 `json:"resource_id"`
		IPAddress    string `json:"ip_address"`
		CreatedAt    string `json:"created_at"`
	}

	query := s.db.WithContext(ctx).Table("activity_logs")
	if action != "" {
		query = query.Where("action = ?", action)
	}
	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var rows []ActivityRow
	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Scan(&rows).Error; err != nil {
		return nil, 0, err
	}

	result := make([]map[string]interface{}, len(rows))
	for i, r := range rows {
		result[i] = map[string]interface{}{
			"id":            r.ID,
			"user_id":       r.UserID,
			"action":        r.Action,
			"resource_type": r.ResourceType,
			"resource_id":   r.ResourceID,
			"ip_address":    r.IPAddress,
			"timestamp":     r.CreatedAt,
		}
	}

	return result, int(total), nil
}

// GetSystemHealth retrieves system health status
func (s *AdminService) GetSystemHealth(ctx context.Context) (map[string]interface{}, error) {
	// TODO: Check database, cache, elasticsearch connectivity
	health := map[string]interface{}{
		"status":        "healthy",
		"database":      "connected",
		"cache":         "connected",
		"elasticsearch": "connected",
		"uptime":        "2h 30m",
	}

	return health, nil
}

// GetSubscriptions retrieves all subscriptions from the database
func (s *AdminService) GetSubscriptions(ctx context.Context, page, limit int, status string) ([]map[string]interface{}, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	type SubscriptionRow struct {
		ID            int64   `json:"id"`
		UserID        int64   `json:"user_id"`
		Tier          string  `json:"tier"`
		PlanType      string  `json:"plan_type"`
		Status        string  `json:"status"`
		StartDate     *string `json:"start_date"`
		EndDate       *string `json:"end_date"`
		Amount        float64 `json:"amount"`
		Currency      string  `json:"currency"`
		PaymentMethod string  `json:"payment_method"`
		AutoRenew     bool    `json:"auto_renew"`
	}

	query := s.db.WithContext(ctx).Table("subscriptions")
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var rows []SubscriptionRow
	if err := query.Order("id DESC").Offset(offset).Limit(limit).Scan(&rows).Error; err != nil {
		return nil, 0, err
	}

	result := make([]map[string]interface{}, len(rows))
	for i, r := range rows {
		result[i] = map[string]interface{}{
			"id":             r.ID,
			"user_id":        r.UserID,
			"tier":           r.Tier,
			"plan_type":      r.PlanType,
			"status":         r.Status,
			"start_date":     r.StartDate,
			"end_date":       r.EndDate,
			"amount":         r.Amount,
			"currency":       r.Currency,
			"payment_method": r.PaymentMethod,
			"auto_renew":     r.AutoRenew,
		}
	}

	return result, int(total), nil
}

// ApproveProperty approves property listing
func (s *AdminService) ApproveProperty(ctx context.Context, propertyID string) error {
	// TODO: Update property status to approved
	return nil
}

// RejectProperty rejects property listing
func (s *AdminService) RejectProperty(ctx context.Context, propertyID, reason string) error {
	// TODO: Update property status to rejected and store reason
	_ = reason
	return nil
}

// GetAllProperties retrieves all properties for admin management.
func (s *AdminService) GetAllProperties(ctx context.Context, page, limit int, status, propertyType, visibility, search string) ([]*models.Property, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit
	query := s.db.WithContext(ctx).Model(&models.Property{})

	if status != "" {
		query = query.Where("LOWER(status) = ?", strings.ToLower(status))
	}
	if propertyType != "" {
		query = query.Where("LOWER(property_type) = ?", strings.ToLower(propertyType))
	}
	if visibility != "" {
		query = query.Where("LOWER(visibility) = ?", strings.ToLower(visibility))
	}
	if search != "" {
		q := "%" + strings.ToLower(search) + "%"
		query = query.Where(
			"LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(district) LIKE ? OR LOWER(sector) LIKE ? OR LOWER(address) LIKE ? OR LOWER(upi) LIKE ?",
			q, q, q, q, q, q,
		)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var properties []*models.Property
	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&properties).Error; err != nil {
		return nil, 0, err
	}

	return properties, int(total), nil
}
