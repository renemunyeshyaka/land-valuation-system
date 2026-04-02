package handlers

import (
	"net/http"
	"strconv"
	"time"

	"backend/internal/services"
	"backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type AnalyticsHandler struct {
	analyticsService *services.AnalyticsService
}

func NewAnalyticsHandler(analyticsService *services.AnalyticsService) *AnalyticsHandler {
	return &AnalyticsHandler{
		analyticsService: analyticsService,
	}
}

// GetDashboard godoc
// @Summary Get analytics dashboard
// @Description Retrieve comprehensive dashboard analytics for the authenticated user
// @Tags analytics
// @Produce json
// @Security BearerAuth
// @Param range query string false "Time range (7d, 30d, 90d, 1y)" default(30d)
// @Success 200 {object} utils.APIResponse
// @Failure 401 {object} utils.APIResponse
// @Failure 500 {object} utils.APIResponse
// @Router /analytics/dashboard [get]
func (h *AnalyticsHandler) GetDashboard(c *gin.Context) {
	userID := c.MustGet("user_id").(string)
	timeRange := c.DefaultQuery("range", "30d")

	dashboard, err := h.analyticsService.GetDashboard(c.Request.Context(), userID, timeRange)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve dashboard", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Dashboard retrieved", dashboard)
}

// GetPropertyAnalytics godoc
// @Summary Get property analytics
// @Description Retrieve analytics for a specific property including views, inquiries, and price history
// @Tags analytics
// @Produce json
// @Security BearerAuth
// @Param id path string true "Property ID"
// @Param range query string false "Time range" default(30d)
// @Success 200 {object} utils.APIResponse
// @Failure 404 {object} utils.APIResponse
// @Failure 500 {object} utils.APIResponse
// @Router /analytics/properties/{id} [get]
func (h *AnalyticsHandler) GetPropertyAnalytics(c *gin.Context) {
	propertyID := c.Param("id")
	timeRange := c.DefaultQuery("range", "30d")

	analytics, err := h.analyticsService.GetPropertyAnalytics(c.Request.Context(), propertyID, timeRange)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve property analytics", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Property analytics retrieved", analytics)
}

// GetMarketTrends godoc
// @Summary Get market trends
// @Description Retrieve real estate market trends including price movements and demand patterns
// @Tags analytics
// @Produce json
// @Param district query string false "Filter by district"
// @Param range query string false "Time range" default(90d)
// @Success 200 {object} utils.APIResponse
// @Failure 500 {object} utils.APIResponse
// @Router /analytics/market-trends [get]
func (h *AnalyticsHandler) GetMarketTrends(c *gin.Context) {
	district := c.Query("district")
	timeRange := c.DefaultQuery("range", "90d")

	trends, err := h.analyticsService.GetMarketTrends(c.Request.Context(), district, timeRange)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve market trends", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Market trends retrieved", trends)
}

// GetHeatmap godoc
// @Summary Get property price heatmap
// @Description Retrieve geographic heatmap data showing property prices across regions. Returns a paginated envelope with data, total, page, and limit.
// @Tags analytics
// @Produce json
// @Param type query string false "Property type"
// @Param district query string false "Filter by district"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Page size" default(20)
// @Success 200 {object} utils.APIResponse
// @Failure 500 {object} utils.APIResponse
// @Router /analytics/heatmap [get]
func (h *AnalyticsHandler) GetHeatmap(c *gin.Context) {
	propertyType := c.Query("type")
	district := c.Query("district")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	heatmap, err := h.analyticsService.GetHeatmap(c.Request.Context(), propertyType, district)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve heatmap", err.Error())
		return
	}

	total := len(heatmap)
	offset := (page - 1) * limit
	paged := []map[string]interface{}{}
	if offset < total {
		end := offset + limit
		if end > total {
			end = total
		}
		paged = heatmap[offset:end]
	}

	utils.SuccessPaginatedResponse(c, http.StatusOK, "Heatmap retrieved", paged, total, page, limit)
}

// GetUserActivityReport godoc
// @Summary Get user activity report
// @Description Retrieve detailed activity report for the authenticated user
// @Tags analytics
// @Produce json
// @Security BearerAuth
// @Param start_date query string false "Start date (YYYY-MM-DD)"
// @Param end_date query string false "End date (YYYY-MM-DD)"
// @Success 200 {object} utils.APIResponse
// @Failure 401 {object} utils.APIResponse
// @Failure 500 {object} utils.APIResponse
// @Router /analytics/activity-report [get]
func (h *AnalyticsHandler) GetUserActivityReport(c *gin.Context) {
	userID := c.MustGet("user_id").(string)
	startDate, _ := time.Parse("2006-01-02", c.DefaultQuery("start_date", time.Now().AddDate(0, -1, 0).Format("2006-01-02")))
	endDate, _ := time.Parse("2006-01-02", c.DefaultQuery("end_date", time.Now().Format("2006-01-02")))

	report, err := h.analyticsService.GetUserActivityReport(c.Request.Context(), userID, startDate, endDate)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve activity report", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Activity report retrieved", report)
}

// GetSearchAnalytics godoc
// @Summary Get search analytics
// @Description Retrieve analytics about property searches performed by the user. Returns a paginated envelope for top_locations with data, total, page, and limit, while preserving legacy summary fields.
// @Tags analytics
// @Produce json
// @Security BearerAuth
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Page size" default(20)
// @Success 200 {object} utils.APIResponse
// @Failure 401 {object} utils.APIResponse
// @Failure 500 {object} utils.APIResponse
// @Router /analytics/searches [get]
func (h *AnalyticsHandler) GetSearchAnalytics(c *gin.Context) {
	userID := c.MustGet("user_id").(string)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	analytics, err := h.analyticsService.GetSearchAnalytics(c.Request.Context(), userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve search analytics", err.Error())
		return
	}

	allTopLocations := []string{}
	if raw, ok := analytics["top_locations"]; ok {
		switch v := raw.(type) {
		case []string:
			allTopLocations = v
		case []interface{}:
			for _, item := range v {
				if s, ok := item.(string); ok {
					allTopLocations = append(allTopLocations, s)
				}
			}
		}
	}

	total := len(allTopLocations)
	offset := (page - 1) * limit
	pagedTopLocations := []string{}
	if offset < total {
		end := offset + limit
		if end > total {
			end = total
		}
		pagedTopLocations = allTopLocations[offset:end]
	}

	payload := utils.PaginatedDataPayload(pagedTopLocations, total, page, limit)
	// Preserve existing payload fields for backward compatibility.
	payload["total_searches"] = analytics["total_searches"]
	payload["unique_locations"] = analytics["unique_locations"]
	payload["top_locations"] = allTopLocations
	payload["most_searched_type"] = analytics["most_searched_type"]
	utils.SuccessResponse(c, http.StatusOK, "Search analytics retrieved", payload)
}

// GetValuationInsights godoc
// @Summary Get valuation insights
// @Description Retrieve insights and trends from property valuations
// @Tags analytics
// @Produce json
// @Security BearerAuth
// @Success 200 {object} utils.APIResponse
// @Failure 401 {object} utils.APIResponse
// @Failure 500 {object} utils.APIResponse
// @Router /analytics/valuation-insights [get]
func (h *AnalyticsHandler) GetValuationInsights(c *gin.Context) {
	userID := c.MustGet("user_id").(string)

	insights, err := h.analyticsService.GetValuationInsights(c.Request.Context(), userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve valuation insights", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Valuation insights retrieved", insights)
}

// ExportAnalyticsReport godoc
// @Summary Export analytics report
// @Description Export analytics report in CSV, PDF, or Excel format
// @Tags analytics
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body object{format=string,start_date=string,end_date=string} true "Export parameters"
// @Success 200 {file} file
// @Failure 400 {object} utils.APIResponse
// @Failure 401 {object} utils.APIResponse
// @Failure 500 {object} utils.APIResponse
// @Router /analytics/export [post]
func (h *AnalyticsHandler) ExportAnalyticsReport(c *gin.Context) {
	type ExportRequest struct {
		Format    string    `json:"format" binding:"required"`
		StartDate time.Time `json:"start_date" binding:"required"`
		EndDate   time.Time `json:"end_date" binding:"required"`
	}

	userID := c.MustGet("user_id").(string)

	var req ExportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	file, err := h.analyticsService.ExportReport(c.Request.Context(), userID, req.Format, req.StartDate, req.EndDate)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Report export failed", err.Error())
		return
	}

	c.FileAttachment(file, "analytics_report."+req.Format)
}

// GetRevenueAnalytics godoc
// @Summary Get revenue analytics (Admin)
// @Description Retrieve revenue analytics including payment totals and trends (admin only)
// @Tags admin,analytics
// @Produce json
// @Security BearerAuth
// @Param range query string false "Time range" default(30d)
// @Success 200 {object} utils.APIResponse
// @Failure 401 {object} utils.APIResponse
// @Failure 403 {object} utils.APIResponse
// @Failure 500 {object} utils.APIResponse
// @Router /analytics/revenue [get]
func (h *AnalyticsHandler) GetRevenueAnalytics(c *gin.Context) {
	timeRange := c.DefaultQuery("range", "30d")

	revenue, err := h.analyticsService.GetRevenueAnalytics(c.Request.Context(), timeRange)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve revenue analytics", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Revenue analytics retrieved", revenue)
}
