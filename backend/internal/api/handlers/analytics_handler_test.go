package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestAnalyticsHandler_GetSearchAnalytics_PaginationEnvelope(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	handler := NewAnalyticsHandler(services.NewAnalyticsService(nil))
	r.GET("/analytics/searches", func(c *gin.Context) {
		c.Set("user_id", "1")
		handler.GetSearchAnalytics(c)
	})

	req := httptest.NewRequest(http.MethodGet, "/analytics/searches?page=1&limit=2", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)

	var body map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	require.Equal(t, true, body["success"])
	require.Equal(t, "Search analytics retrieved", body["message"])

	data := body["data"].(map[string]interface{})
	require.Equal(t, float64(3), data["total"])
	require.Equal(t, float64(1), data["page"])
	require.Equal(t, float64(2), data["limit"])

	paged := data["data"].([]interface{})
	require.Len(t, paged, 2)

	all := data["top_locations"].([]interface{})
	require.Len(t, all, 3)
	require.Equal(t, float64(500), data["total_searches"])
	require.Equal(t, "residential", data["most_searched_type"])
}

func TestAnalyticsHandler_GetHeatmap_PaginationEnvelope(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	handler := NewAnalyticsHandler(services.NewAnalyticsService(nil))
	r.GET("/analytics/heatmap", handler.GetHeatmap)

	req := httptest.NewRequest(http.MethodGet, "/analytics/heatmap?page=1&limit=1", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)

	var body map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	require.Equal(t, true, body["success"])
	require.Equal(t, "Heatmap retrieved", body["message"])

	data := body["data"].(map[string]interface{})
	require.Equal(t, float64(1), data["total"])
	require.Equal(t, float64(1), data["page"])
	require.Equal(t, float64(1), data["limit"])

	paged := data["data"].([]interface{})
	require.Len(t, paged, 1)
}
