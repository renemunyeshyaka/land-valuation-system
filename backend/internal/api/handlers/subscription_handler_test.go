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

func TestSubscriptionHandler_GetPlans_PaginationEnvelope(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	handler := NewSubscriptionHandler(services.NewSubscriptionService(nil))
	r.GET("/subscriptions/plans", handler.GetPlans)

	req := httptest.NewRequest(http.MethodGet, "/subscriptions/plans?page=1&limit=2", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)

	var body map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	require.Equal(t, true, body["success"])
	require.Equal(t, "Subscription plans retrieved", body["message"])

	data := body["data"].(map[string]interface{})
	require.Equal(t, float64(4), data["total"])
	require.Equal(t, float64(1), data["page"])
	require.Equal(t, float64(2), data["limit"])
	require.Len(t, data["data"].([]interface{}), 2)
}
