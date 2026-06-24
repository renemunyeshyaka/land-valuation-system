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

type LeadHandler struct {
	leadRepo  *repository.LeadRepository
	aiService *services.AIService
}

func NewLeadHandler(leadRepo *repository.LeadRepository, aiService *services.AIService) *LeadHandler {
	return &LeadHandler{
		leadRepo:  leadRepo,
		aiService: aiService,
	}
}

// ListLeads handles GET /api/v1/admin/leads
func (h *LeadHandler) ListLeads(c *gin.Context) {
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
	if s := c.Query("ai_segment"); s != "" {
		filters["ai_segment"] = s
	}
	if s := c.Query("district"); s != "" {
		filters["district"] = s
	}
	if s := c.Query("min_score"); s != "" {
		if v, err := strconv.ParseFloat(s, 64); err == nil {
			filters["min_score"] = v
		}
	}
	if s := c.Query("search"); s != "" {
		filters["search"] = s
	}

	leads, total, err := h.leadRepo.List(c.Request.Context(), page, pageSize, filters)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to list leads", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Leads retrieved successfully", utils.PaginatedDataPayload(leads, int(total), page, pageSize))
}

// GetLead handles GET /api/v1/admin/leads/:id
func (h *LeadHandler) GetLead(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid lead ID", err.Error())
		return
	}

	lead, err := h.leadRepo.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Lead not found", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Lead retrieved successfully", lead)
}

// CreateLead handles POST /api/v1/admin/leads
func (h *LeadHandler) CreateLead(c *gin.Context) {
	var lead models.Lead
	if err := c.ShouldBindJSON(&lead); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	created, err := h.leadRepo.Create(c.Request.Context(), &lead)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to create lead", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Lead created successfully", created)
}

// UpdateLead handles PUT /api/v1/admin/leads/:id
func (h *LeadHandler) UpdateLead(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid lead ID", err.Error())
		return
	}

	var updates models.Lead
	if err := c.ShouldBindJSON(&updates); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	updates.ID = uint(id)
	updated, err := h.leadRepo.Update(c.Request.Context(), &updates)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to update lead", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Lead updated successfully", updated)
}

// DeleteLead handles DELETE /api/v1/admin/leads/:id
func (h *LeadHandler) DeleteLead(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid lead ID", err.Error())
		return
	}

	if err := h.leadRepo.Delete(c.Request.Context(), uint(id)); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to delete lead", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Lead deleted successfully", nil)
}

// EnrichLead handles POST /api/v1/admin/leads/:id/enrich
func (h *LeadHandler) EnrichLead(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid lead ID", err.Error())
		return
	}

	lead, err := h.leadRepo.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Lead not found", err.Error())
		return
	}

	if !h.aiService.IsConfigured() {
		utils.ErrorResponse(c, http.StatusServiceUnavailable, "AI service not configured", "DEEPSEEK_API_KEY is not set")
		return
	}

	rawData := map[string]interface{}{
		"first_name": lead.FirstName,
		"last_name":  lead.LastName,
		"location":   lead.Location,
		"district":   lead.District,
		"sector":     lead.Sector,
		"company":    lead.Company,
		"role":       lead.Role,
		"email":      lead.Email,
		"phone":      lead.Phone,
		"upi":        lead.UPI,
	}

	enriched, err := h.aiService.EnrichLead(c.Request.Context(), rawData)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "AI enrichment failed", err.Error())
		return
	}

	// Convert enriched data to JSONB for storage
	insights := models.JSONB{
		"estimated_property_value": enriched.EstimatedPropertyValue,
		"likely_role":              enriched.LikelyRole,
		"language_preference":      enriched.LanguagePreference,
		"interest_score":           enriched.InterestScore,
		"segment":                  enriched.Segment,
		"recommended_outreach":     enriched.RecommendedOutreach,
		"personalized_message_key": enriched.PersonalizedMessageKey,
		"similar_leads_cluster":    enriched.SimilarLeadsCluster,
	}

	if err := h.leadRepo.UpdateAIScore(c.Request.Context(), lead.ID, enriched.InterestScore, enriched.Segment, insights); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to save enrichment", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Lead enriched successfully", enriched)
}

// RescoreLead handles POST /api/v1/admin/leads/:id/re-score
func (h *LeadHandler) RescoreLead(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid lead ID", err.Error())
		return
	}

	lead, err := h.leadRepo.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Lead not found", err.Error())
		return
	}

	if !h.aiService.IsConfigured() {
		utils.ErrorResponse(c, http.StatusServiceUnavailable, "AI service not configured", "DEEPSEEK_API_KEY is not set")
		return
	}

	score, breakdown, err := h.aiService.ScoreLead(c.Request.Context(), lead)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "AI scoring failed", err.Error())
		return
	}

	// Update lead score
	if err := h.leadRepo.UpdateAIScore(c.Request.Context(), lead.ID, score, lead.AISegment, nil); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to save score", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Lead rescored successfully", gin.H{
		"score":           score,
		"score_breakdown": breakdown,
	})
}

// GetLeadStats handles GET /api/v1/admin/leads/stats
func (h *LeadHandler) GetLeadStats(c *gin.Context) {
	stats, err := h.leadRepo.GetStats(c.Request.Context())
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to get lead stats", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Lead stats retrieved", stats)
}
