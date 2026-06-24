package handlers

import (
	"net/http"
	"strconv"

	"backend/internal/models"
	"backend/internal/repository"
	"backend/internal/services"
	"backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type CampaignHandler struct {
	campaignRepo *repository.CampaignRepository
	leadRepo     *repository.LeadRepository
	aiService    *services.AIService
}

func NewCampaignHandler(campaignRepo *repository.CampaignRepository, leadRepo *repository.LeadRepository, aiService *services.AIService) *CampaignHandler {
	return &CampaignHandler{
		campaignRepo: campaignRepo,
		leadRepo:     leadRepo,
		aiService:    aiService,
	}
}

// ============================================
// Campaigns
// ============================================

// ListCampaigns handles GET /api/v1/admin/campaigns
func (h *CampaignHandler) ListCampaigns(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	filters := map[string]interface{}{}
	if s := c.Query("status"); s != "" {
		filters["status"] = s
	}
	if s := c.Query("campaign_type"); s != "" {
		filters["campaign_type"] = s
	}

	campaigns, total, err := h.campaignRepo.List(c.Request.Context(), page, pageSize, filters)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to list campaigns", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Campaigns retrieved", utils.PaginatedDataPayload(campaigns, int(total), page, pageSize))
}

// GetCampaign handles GET /api/v1/admin/campaigns/:id
func (h *CampaignHandler) GetCampaign(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid campaign ID", err.Error())
		return
	}

	campaign, err := h.campaignRepo.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Campaign not found", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Campaign retrieved", campaign)
}

// CreateCampaign handles POST /api/v1/admin/campaigns
func (h *CampaignHandler) CreateCampaign(c *gin.Context) {
	var campaign models.Campaign
	if err := c.ShouldBindJSON(&campaign); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	// Set creator from auth context
	userID, exists := c.Get("userID")
	if exists {
		campaign.CreatedBy = userID.(uint)
	}

	created, err := h.campaignRepo.Create(c.Request.Context(), &campaign)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to create campaign", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Campaign created", created)
}

// UpdateCampaign handles PUT /api/v1/admin/campaigns/:id
func (h *CampaignHandler) UpdateCampaign(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid campaign ID", err.Error())
		return
	}

	var updates models.Campaign
	if err := c.ShouldBindJSON(&updates); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	updates.ID = uint(id)
	updated, err := h.campaignRepo.Update(c.Request.Context(), &updates)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to update campaign", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Campaign updated", updated)
}

// DeleteCampaign handles DELETE /api/v1/admin/campaigns/:id
func (h *CampaignHandler) DeleteCampaign(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid campaign ID", err.Error())
		return
	}

	if err := h.campaignRepo.Delete(c.Request.Context(), uint(id)); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to delete campaign", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Campaign deleted", nil)
}

// LaunchCampaign handles POST /api/v1/admin/campaigns/:id/launch
func (h *CampaignHandler) LaunchCampaign(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid campaign ID", err.Error())
		return
	}

	if err := h.campaignRepo.UpdateStatus(c.Request.Context(), uint(id), "running"); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to launch campaign", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Campaign launched", nil)
}

// PauseCampaign handles POST /api/v1/admin/campaigns/:id/pause
func (h *CampaignHandler) PauseCampaign(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid campaign ID", err.Error())
		return
	}

	if err := h.campaignRepo.UpdateStatus(c.Request.Context(), uint(id), "paused"); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to pause campaign", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Campaign paused", nil)
}

// AIGenerateContent handles POST /api/v1/admin/campaigns/ai-generate
func (h *CampaignHandler) AIGenerateContent(c *gin.Context) {
	var req struct {
		LeadID    uint   `json:"lead_id" binding:"required"`
		Channel   string `json:"channel" binding:"required"`   // email, whatsapp
		Language  string `json:"language" binding:"required"`  // en, fr, rw
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	if !h.aiService.IsConfigured() {
		utils.ErrorResponse(c, http.StatusServiceUnavailable, "AI service not configured", "DEEPSEEK_API_KEY is not set")
		return
	}

	lead, err := h.leadRepo.GetByID(c.Request.Context(), req.LeadID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Lead not found", err.Error())
		return
	}

	content, err := h.aiService.GenerateCampaignContent(c.Request.Context(), lead, req.Channel, req.Language)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "AI content generation failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Content generated", content)
}

// ============================================
// Campaign Activities
// ============================================

// ListCampaignActivities handles GET /api/v1/admin/campaigns/:id/activities
func (h *CampaignHandler) ListCampaignActivities(c *gin.Context) {
	campaignID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid campaign ID", err.Error())
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	activities, total, err := h.campaignRepo.ListActivitiesByCampaign(c.Request.Context(), uint(campaignID), page, pageSize)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to list activities", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Activities retrieved", utils.PaginatedDataPayload(activities, int(total), page, pageSize))
}

// GetCampaignAnalytics handles GET /api/v1/admin/campaigns/analytics/overview
func (h *CampaignHandler) GetCampaignAnalytics(c *gin.Context) {
	ctx := c.Request.Context()

	// Fetch all campaigns
	campaigns, total, err := h.campaignRepo.List(ctx, 1, 1000, map[string]interface{}{})
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch campaigns", err.Error())
		return
	}

	// Calculate aggregate stats
	var totalSent, totalOpened, totalClicked, totalConverted int
	var runningCount, draftCount, completedCount, pausedCount int
	var totalTarget int

	for _, camp := range campaigns {
		totalSent += camp.SentCount
		totalOpened += camp.OpenedCount
		totalClicked += camp.ClickedCount
		totalConverted += camp.ConvertedCount
		totalTarget += camp.TargetCount

		switch camp.Status {
		case "running":
			runningCount++
		case "draft":
			draftCount++
		case "completed":
			completedCount++
		case "paused":
			pausedCount++
		}
	}

	// Calculate rates
	openRate := 0.0
	if totalSent > 0 {
		openRate = float64(totalOpened) / float64(totalSent) * 100
	}
	clickRate := 0.0
	if totalOpened > 0 {
		clickRate = float64(totalClicked) / float64(totalOpened) * 100
	}
	conversionRate := 0.0
	if totalClicked > 0 {
		conversionRate = float64(totalConverted) / float64(totalClicked) * 100
	}

	// Generate AI insights if configured
	var aiInsights *services.PerformanceInsights
	if h.aiService.IsConfigured() && total > 0 {
		// Analyze the most recent campaign for insights
		latestCampaign := campaigns[0]
		insights, err := h.aiService.AnalyzeCampaignPerformance(ctx, &latestCampaign, openRate, clickRate, conversionRate)
		if err == nil {
			aiInsights = insights
		}
	}

	utils.SuccessResponse(c, http.StatusOK, "Campaign analytics retrieved", gin.H{
		"total_campaigns":  total,
		"total_target":     totalTarget,
		"total_sent":       totalSent,
		"total_opened":     totalOpened,
		"total_clicked":    totalClicked,
		"total_converted":  totalConverted,
		"open_rate":        openRate,
		"click_rate":       clickRate,
		"conversion_rate":  conversionRate,
		"status_breakdown": gin.H{
			"running":   runningCount,
			"draft":     draftCount,
			"completed": completedCount,
			"paused":    pausedCount,
		},
		"ai_insights": aiInsights,
	})
}
