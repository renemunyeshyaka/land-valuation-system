package handlers

import (
	"net/http"
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

// GetDashboard retrieves dashboard analytics
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

// GetPropertyAnalytics retrieves property-specific analytics
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

// GetMarketTrends retrieves market trends
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

// GetHeatmap retrieves property heatmap
// @Router /analytics/heatmap [get]
func (h *AnalyticsHandler) GetHeatmap(c *gin.Context) {
	propertyType := c.Query("type")
	district := c.Query("district")

	heatmap, err := h.analyticsService.GetHeatmap(c.Request.Context(), propertyType, district)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve heatmap", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Heatmap retrieved", heatmap)
}

// GetUserActivityReport retrieves user activity report
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

// GetSearchAnalytics retrieves search analytics
// @Router /analytics/searches [get]
func (h *AnalyticsHandler) GetSearchAnalytics(c *gin.Context) {
	userID := c.MustGet("user_id").(string)

	analytics, err := h.analyticsService.GetSearchAnalytics(c.Request.Context(), userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve search analytics", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Search analytics retrieved", analytics)
}

// GetValuationInsights retrieves valuation insights
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

// ExportAnalyticsReport exports analytics report
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

// GetRevenueAnalytics retrieves revenue analytics (admin only)
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
