package routes

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"backend/internal/api/handlers"
	"backend/internal/api/middleware"
	"backend/internal/models"
	"backend/internal/repository"
	"backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func decodeBodyMap(t *testing.T, w *httptest.ResponseRecorder) map[string]interface{} {
	t.Helper()

	var body map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	return body
}

func setupAuthzIntegrationDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	err = db.AutoMigrate(&models.User{}, &models.Property{}, &models.Transaction{})
	require.NoError(t, err)

	users := []models.User{
		{ID: 1, Email: "owner@example.com", Password: "owner-pass", ReferralCode: "OWN-001"},
		{ID: 2, Email: "other@example.com", Password: "other-pass", ReferralCode: "OTH-002"},
		{ID: 3, Email: "admin@example.com", Password: "admin-pass", UserType: "admin", ReferralCode: "ADM-003"},
	}
	for _, u := range users {
		require.NoError(t, db.Create(&u).Error)
	}

	properties := []models.Property{
		{
			ID:           10,
			District:     "Gasabo",
			Sector:       "Kimironko",
			Title:        "Owner Property",
			PropertyType: "residential",
			Status:       "available",
			UPI:          "1/02/03/04/0010",
			LandSize:     500,
			Price:        1500000,
			Currency:     "RWF",
			OwnerID:      1,
		},
		{
			ID:           11,
			District:     "Kicukiro",
			Sector:       "Niboye",
			Title:        "Other Property",
			PropertyType: "residential",
			Status:       "available",
			UPI:          "1/02/03/04/0011",
			LandSize:     400,
			Price:        1200000,
			Currency:     "RWF",
			OwnerID:      2,
		},
	}
	for _, p := range properties {
		require.NoError(t, db.Create(&p).Error)
	}

	transactions := []models.Transaction{
		{
			ID:              100,
			UserID:          1,
			PropertyID:      10,
			SellerID:        2,
			BuyerID:         1,
			TransactionType: "sale",
			Amount:          500000,
			Currency:        "RWF",
			Status:          "completed",
			PaymentMethod:   "mobile_money",
		},
		{
			ID:              101,
			UserID:          1,
			PropertyID:      11,
			SellerID:        2,
			BuyerID:         1,
			TransactionType: "sale",
			Amount:          750000,
			Currency:        "RWF",
			Status:          "pending",
			PaymentMethod:   "bank_transfer",
		},
	}
	for _, txn := range transactions {
		require.NoError(t, db.Create(&txn).Error)
	}

	return db
}

func setupAuthzRouter(t *testing.T, db *gorm.DB) *gin.Engine {
	gin.SetMode(gin.TestMode)
	require.NoError(t, os.Setenv("JWT_SECRET", "test-secret"))
	t.Cleanup(func() {
		_ = os.Unsetenv("JWT_SECRET")
	})

	r := gin.New()
	propertyHandler := handlers.NewPropertyHandler(repository.NewPropertyRepository(db))
	marketplaceHandler := handlers.NewMarketplaceHandler(services.NewMarketplaceService(db))
	analyticsHandler := handlers.NewAnalyticsHandler(services.NewAnalyticsService(db))
	subscriptionHandler := handlers.NewSubscriptionHandler(services.NewSubscriptionService(db))
	userHandler := handlers.NewUserHandler(services.NewUserService(db))

	// Public routes used by functional integration tests.
	r.GET("/api/v1/properties", propertyHandler.ListProperties)
	r.GET("/api/v1/properties/:id", propertyHandler.GetProperty)
	r.POST("/api/v1/properties/search", propertyHandler.SearchNearby)
	r.GET("/api/v1/marketplace/properties-for-sale", marketplaceHandler.GetPropertyListingsOnSale)
	r.GET("/api/v1/subscriptions/plans", subscriptionHandler.GetPlans)

	protected := r.Group("/api/v1")
	protected.Use(middleware.AuthRequired())
	{
		protected.POST("/properties", propertyHandler.CreateProperty)
		protected.PUT("/properties/:id", propertyHandler.UpdateProperty)
		protected.DELETE("/properties/:id", propertyHandler.DeleteProperty)
		protected.POST("/properties/:id/sync-marketplace", marketplaceHandler.SyncMarketplaceAPIs)
		protected.GET("/subscriptions/billing-history", subscriptionHandler.GetBillingHistory)
		protected.GET("/analytics/searches", analyticsHandler.GetSearchAnalytics)
		protected.GET("/analytics/heatmap", analyticsHandler.GetHeatmap)
	}

	admin := r.Group("/api/v1/admin")
	admin.Use(middleware.AuthRequired(), middleware.AdminRequired())
	{
		admin.GET("/users/list", userHandler.ListUsers)
	}

	return r
}

func TestPropertyRoutes_FunctionalReadPaths(t *testing.T) {
	db := setupAuthzIntegrationDB(t)
	r := setupAuthzRouter(t, db)

	// List should return success payload with pagination envelope.
	req := httptest.NewRequest(http.MethodGet, "/api/v1/properties?district=Gasabo&page=1&limit=10", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	body := decodeBodyMap(t, w)
	require.Equal(t, true, body["success"])
	require.Equal(t, "Properties retrieved successfully", body["message"])
	data := body["data"].(map[string]interface{})
	require.Equal(t, float64(1), data["total"])

	// Get by id success.
	req = httptest.NewRequest(http.MethodGet, "/api/v1/properties/10", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	body = decodeBodyMap(t, w)
	require.Equal(t, true, body["success"])

	// Get by id not found.
	req = httptest.NewRequest(http.MethodGet, "/api/v1/properties/999", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusNotFound, w.Code)
	body = decodeBodyMap(t, w)
	require.Equal(t, false, body["success"])
	errorObj := body["error"].(map[string]interface{})
	require.Equal(t, "Property not found", errorObj["message"])
}

func TestPropertyRoutes_CreateValidationAndSuccess(t *testing.T) {
	db := setupAuthzIntegrationDB(t)
	r := setupAuthzRouter(t, db)

	// Validation error for missing required fields.
	invalidPayload := []byte(`{"title":"Missing required fields"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/properties", bytes.NewReader(invalidPayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+makeTestJWT(t, "1", "individual"))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusBadRequest, w.Code)
	body := decodeBodyMap(t, w)
	require.Equal(t, false, body["success"])

	// Successful create.
	validPayload := []byte(`{
		"title":"Created in test",
		"property_type":"residential",
		"upi":"1/02/03/04/0099",
		"district":"Gasabo",
		"sector":"Remera",
		"land_size":350,
		"price":900000,
		"currency":"RWF"
	}`)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/properties", bytes.NewReader(validPayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+makeTestJWT(t, "1", "individual"))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusCreated, w.Code)
	body = decodeBodyMap(t, w)
	require.Equal(t, true, body["success"])
	require.Equal(t, "Property created successfully", body["message"])
}

func TestMarketplaceRoute_PublicPayloadContract(t *testing.T) {
	db := setupAuthzIntegrationDB(t)
	r := setupAuthzRouter(t, db)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/marketplace/properties-for-sale?page=1&limit=10", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	body := decodeBodyMap(t, w)
	require.Equal(t, true, body["success"])
	require.Equal(t, "Properties on sale retrieved", body["message"])
	data := body["data"].(map[string]interface{})
	_, hasList := data["data"]
	_, hasTotal := data["total"]
	_, hasPage := data["page"]
	_, hasLimit := data["limit"]
	require.True(t, hasList)
	require.True(t, hasTotal)
	require.True(t, hasPage)
	require.True(t, hasLimit)
}

func TestSubscriptionPlansRoute_PublicPayloadContract(t *testing.T) {
	db := setupAuthzIntegrationDB(t)
	r := setupAuthzRouter(t, db)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/subscriptions/plans?page=1&limit=2", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	body := decodeBodyMap(t, w)
	require.Equal(t, true, body["success"])
	require.Equal(t, "Subscription plans retrieved", body["message"])
	data := body["data"].(map[string]interface{})
	require.Equal(t, float64(4), data["total"])
	require.Equal(t, float64(1), data["page"])
	require.Equal(t, float64(2), data["limit"])
	require.Len(t, data["data"].([]interface{}), 2)
}

func TestSubscriptionBillingHistoryRoute_PayloadContract(t *testing.T) {
	db := setupAuthzIntegrationDB(t)
	r := setupAuthzRouter(t, db)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/subscriptions/billing-history?page=1&limit=1", nil)
	req.Header.Set("Authorization", "Bearer "+makeTestJWT(t, "1", "individual"))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	body := decodeBodyMap(t, w)
	require.Equal(t, true, body["success"])
	require.Equal(t, "Billing history retrieved", body["message"])
	data := body["data"].(map[string]interface{})
	require.Equal(t, float64(2), data["total"])
	require.Equal(t, float64(1), data["page"])
	require.Equal(t, float64(1), data["limit"])
	require.Len(t, data["data"].([]interface{}), 1)
}

func TestAdminUsersListRoute_PublicPayloadContract(t *testing.T) {
	db := setupAuthzIntegrationDB(t)
	r := setupAuthzRouter(t, db)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/users/list?page=1&limit=2", nil)
	req.Header.Set("Authorization", "Bearer "+makeTestJWT(t, "3", "admin"))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)

	body := decodeBodyMap(t, w)
	require.Equal(t, true, body["success"])
	require.Equal(t, "Users listed", body["message"])

	data := body["data"].(map[string]interface{})
	require.Equal(t, float64(3), data["total"])
	require.Equal(t, float64(1), data["page"])
	require.Equal(t, float64(2), data["limit"])

	pageData := data["data"].([]interface{})
	usersAlias := data["users"].([]interface{})
	require.Len(t, pageData, 2)
	require.Len(t, usersAlias, 2)
}

func TestAdminUsersListRoute_Authz(t *testing.T) {
	db := setupAuthzIntegrationDB(t)
	r := setupAuthzRouter(t, db)

	// Non-admin should be forbidden by admin middleware.
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/users/list?page=1&limit=2", nil)
	req.Header.Set("Authorization", "Bearer "+makeTestJWT(t, "1", "individual"))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusForbidden, w.Code)

	// Missing token should be unauthorized.
	req = httptest.NewRequest(http.MethodGet, "/api/v1/admin/users/list?page=1&limit=2", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestPropertySearchRoute_PaginationEdgeCases(t *testing.T) {
	db := setupAuthzIntegrationDB(t)
	r := setupAuthzRouter(t, db)

	// page=0, limit=0 -> defaults to page=1, limit=20
	defaultPayload := []byte(`{"property_type":"residential","max_price":2000000,"page":0,"limit":0}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/properties/search", bytes.NewReader(defaultPayload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	body := decodeBodyMap(t, w)
	data := body["data"].(map[string]interface{})
	require.Equal(t, float64(1), data["page"])
	require.Equal(t, float64(20), data["limit"])

	// limit>100 -> fallback default 20
	capPayload := []byte(`{"property_type":"residential","max_price":2000000,"page":1,"limit":1000}`)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/properties/search", bytes.NewReader(capPayload))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	body = decodeBodyMap(t, w)
	data = body["data"].(map[string]interface{})
	require.Equal(t, float64(1), data["page"])
	require.Equal(t, float64(20), data["limit"])
}

func TestAnalyticsSearchRoute_PaginationEdgeCases(t *testing.T) {
	db := setupAuthzIntegrationDB(t)
	r := setupAuthzRouter(t, db)

	// page=0, limit=0 -> defaults
	req := httptest.NewRequest(http.MethodGet, "/api/v1/analytics/searches?page=0&limit=0", nil)
	req.Header.Set("Authorization", "Bearer "+makeTestJWT(t, "1", "individual"))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	body := decodeBodyMap(t, w)
	data := body["data"].(map[string]interface{})
	require.Equal(t, float64(1), data["page"])
	require.Equal(t, float64(20), data["limit"])

	// limit>100 -> fallback default 20
	req = httptest.NewRequest(http.MethodGet, "/api/v1/analytics/searches?page=1&limit=1000", nil)
	req.Header.Set("Authorization", "Bearer "+makeTestJWT(t, "1", "individual"))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	body = decodeBodyMap(t, w)
	data = body["data"].(map[string]interface{})
	require.Equal(t, float64(1), data["page"])
	require.Equal(t, float64(20), data["limit"])
}

func TestAnalyticsHeatmapRoute_PaginationEdgeCases(t *testing.T) {
	db := setupAuthzIntegrationDB(t)
	r := setupAuthzRouter(t, db)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/analytics/heatmap?page=0&limit=0", nil)
	req.Header.Set("Authorization", "Bearer "+makeTestJWT(t, "1", "individual"))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	body := decodeBodyMap(t, w)
	data := body["data"].(map[string]interface{})
	require.Equal(t, float64(1), data["page"])
	require.Equal(t, float64(20), data["limit"])

	req = httptest.NewRequest(http.MethodGet, "/api/v1/analytics/heatmap?page=1&limit=1000", nil)
	req.Header.Set("Authorization", "Bearer "+makeTestJWT(t, "1", "individual"))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	body = decodeBodyMap(t, w)
	data = body["data"].(map[string]interface{})
	require.Equal(t, float64(1), data["page"])
	require.Equal(t, float64(20), data["limit"])
}

func TestSubscriptionPlansRoute_PaginationEdgeCases(t *testing.T) {
	db := setupAuthzIntegrationDB(t)
	r := setupAuthzRouter(t, db)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/subscriptions/plans?page=0&limit=0", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	body := decodeBodyMap(t, w)
	data := body["data"].(map[string]interface{})
	require.Equal(t, float64(1), data["page"])
	require.Equal(t, float64(20), data["limit"])

	req = httptest.NewRequest(http.MethodGet, "/api/v1/subscriptions/plans?page=1&limit=1000", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	body = decodeBodyMap(t, w)
	data = body["data"].(map[string]interface{})
	require.Equal(t, float64(1), data["page"])
	require.Equal(t, float64(20), data["limit"])
}

func TestSubscriptionBillingHistoryRoute_PaginationEdgeCases(t *testing.T) {
	db := setupAuthzIntegrationDB(t)
	r := setupAuthzRouter(t, db)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/subscriptions/billing-history?page=0&limit=0", nil)
	req.Header.Set("Authorization", "Bearer "+makeTestJWT(t, "1", "individual"))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	body := decodeBodyMap(t, w)
	data := body["data"].(map[string]interface{})
	require.Equal(t, float64(1), data["page"])
	require.Equal(t, float64(10), data["limit"])

	req = httptest.NewRequest(http.MethodGet, "/api/v1/subscriptions/billing-history?page=1&limit=1000", nil)
	req.Header.Set("Authorization", "Bearer "+makeTestJWT(t, "1", "individual"))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	body = decodeBodyMap(t, w)
	data = body["data"].(map[string]interface{})
	require.Equal(t, float64(1), data["page"])
	require.Equal(t, float64(10), data["limit"])
}

func TestAdminUsersListRoute_PaginationEdgeCases(t *testing.T) {
	db := setupAuthzIntegrationDB(t)
	r := setupAuthzRouter(t, db)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/users/list?page=0&limit=0", nil)
	req.Header.Set("Authorization", "Bearer "+makeTestJWT(t, "3", "admin"))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	body := decodeBodyMap(t, w)
	data := body["data"].(map[string]interface{})
	require.Equal(t, float64(1), data["page"])
	require.Equal(t, float64(20), data["limit"])

	req = httptest.NewRequest(http.MethodGet, "/api/v1/admin/users/list?page=1&limit=1000", nil)
	req.Header.Set("Authorization", "Bearer "+makeTestJWT(t, "3", "admin"))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	body = decodeBodyMap(t, w)
	data = body["data"].(map[string]interface{})
	require.Equal(t, float64(1), data["page"])
	require.Equal(t, float64(20), data["limit"])
}

func TestPropertyRoutes_SearchNearby_UPIAndFilters(t *testing.T) {
	db := setupAuthzIntegrationDB(t)
	r := setupAuthzRouter(t, db)

	// Legacy UPI search path.
	upiPayload := []byte(`{"upi":"1/02/03/04/0010","page":1,"limit":10}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/properties/search", bytes.NewReader(upiPayload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	body := decodeBodyMap(t, w)
	require.Equal(t, true, body["success"])
	require.Equal(t, "Property found", body["message"])
	data := body["data"].(map[string]interface{})
	results := data["data"].([]interface{})
	require.Len(t, results, 1)
	require.Equal(t, float64(1), data["total"])
	require.Equal(t, float64(1), data["page"])
	require.Equal(t, float64(10), data["limit"])

	// UPI page 2 should be empty while keeping total.
	upiPage2Payload := []byte(`{"upi":"1/02/03/04/0010","page":2,"limit":1}`)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/properties/search", bytes.NewReader(upiPage2Payload))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	body = decodeBodyMap(t, w)
	require.Equal(t, true, body["success"])
	require.Equal(t, "Property found", body["message"])
	data = body["data"].(map[string]interface{})
	results = data["data"].([]interface{})
	require.Len(t, results, 0)
	require.Equal(t, float64(1), data["total"])
	require.Equal(t, float64(2), data["page"])
	require.Equal(t, float64(1), data["limit"])

	// Filter path via SearchProperties (type + max price).
	filterPayload := []byte(`{"property_type":"residential","max_price":2000000,"page":1,"limit":1}`)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/properties/search", bytes.NewReader(filterPayload))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	body = decodeBodyMap(t, w)
	require.Equal(t, true, body["success"])
	require.Equal(t, "Properties found", body["message"])
	data = body["data"].(map[string]interface{})
	results = data["data"].([]interface{})
	require.Len(t, results, 1)
	require.Equal(t, float64(2), data["total"])
	require.Equal(t, float64(1), data["page"])
	require.Equal(t, float64(1), data["limit"])

	// Page 2 should return the second residential property.
	page2Payload := []byte(`{"property_type":"residential","max_price":2000000,"page":2,"limit":1}`)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/properties/search", bytes.NewReader(page2Payload))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	body = decodeBodyMap(t, w)
	data = body["data"].(map[string]interface{})
	results = data["data"].([]interface{})
	require.Len(t, results, 1)
	require.Equal(t, float64(2), data["total"])
	require.Equal(t, float64(2), data["page"])
	require.Equal(t, float64(1), data["limit"])

	first := results[0].(map[string]interface{})
	require.Contains(t, []interface{}{"1/02/03/04/0010", "1/02/03/04/0011"}, first["upi"])
}

func TestPropertyRoutes_SearchNearby_RejectsEmptyCriteria(t *testing.T) {
	db := setupAuthzIntegrationDB(t)
	r := setupAuthzRouter(t, db)

	emptyPayload := []byte(`{"page":1,"limit":10}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/properties/search", bytes.NewReader(emptyPayload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusBadRequest, w.Code)
	body := decodeBodyMap(t, w)
	require.Equal(t, false, body["success"])
	errorObj := body["error"].(map[string]interface{})
	require.Equal(t, "Invalid request", errorObj["message"])
	require.Equal(t, "provide at least one search criterion: upi, property_type, max_price, or latitude+longitude+radius_km", errorObj["details"])
}

func TestAnalyticsSearchRoute_PaginationContract(t *testing.T) {
	db := setupAuthzIntegrationDB(t)
	r := setupAuthzRouter(t, db)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/analytics/searches?page=1&limit=2", nil)
	req.Header.Set("Authorization", "Bearer "+makeTestJWT(t, "1", "individual"))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	body := decodeBodyMap(t, w)
	require.Equal(t, true, body["success"])
	require.Equal(t, "Search analytics retrieved", body["message"])

	data := body["data"].(map[string]interface{})
	require.Equal(t, float64(3), data["total"])
	require.Equal(t, float64(1), data["page"])
	require.Equal(t, float64(2), data["limit"])

	paged := data["data"].([]interface{})
	require.Len(t, paged, 2)

	top := data["top_locations"].([]interface{})
	require.Len(t, top, 3)
}

func TestAnalyticsSearchRoute_EmptyPageContract(t *testing.T) {
	db := setupAuthzIntegrationDB(t)
	r := setupAuthzRouter(t, db)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/analytics/searches?page=999&limit=2", nil)
	req.Header.Set("Authorization", "Bearer "+makeTestJWT(t, "1", "individual"))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	body := decodeBodyMap(t, w)
	require.Equal(t, true, body["success"])
	require.Equal(t, "Search analytics retrieved", body["message"])

	data := body["data"].(map[string]interface{})
	require.Equal(t, float64(3), data["total"])
	require.Equal(t, float64(999), data["page"])
	require.Equal(t, float64(2), data["limit"])

	paged := data["data"].([]interface{})
	require.Len(t, paged, 0)

	top := data["top_locations"].([]interface{})
	require.Len(t, top, 3)
}

func TestAnalyticsHeatmapRoute_PaginationContract(t *testing.T) {
	db := setupAuthzIntegrationDB(t)
	r := setupAuthzRouter(t, db)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/analytics/heatmap?page=1&limit=1", nil)
	req.Header.Set("Authorization", "Bearer "+makeTestJWT(t, "1", "individual"))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	body := decodeBodyMap(t, w)
	require.Equal(t, true, body["success"])
	require.Equal(t, "Heatmap retrieved", body["message"])

	data := body["data"].(map[string]interface{})
	require.Equal(t, float64(1), data["total"])
	require.Equal(t, float64(1), data["page"])
	require.Equal(t, float64(1), data["limit"])
	paged := data["data"].([]interface{})
	require.Len(t, paged, 1)
}

func makeTestJWT(t *testing.T, userID, userType string) string {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":   userID,
		"user_type": userType,
	})
	signed, err := token.SignedString([]byte("test-secret"))
	require.NoError(t, err)
	return signed
}

func TestPropertyUpdateRoute_OwnerAndAdminAccess(t *testing.T) {
	db := setupAuthzIntegrationDB(t)
	r := setupAuthzRouter(t, db)

	// Non-owner should be forbidden.
	nonOwnerBody := map[string]interface{}{"title": "Illegal Update"}
	nonOwnerPayload, _ := json.Marshal(nonOwnerBody)
	req := httptest.NewRequest(http.MethodPut, "/api/v1/properties/10", bytes.NewReader(nonOwnerPayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+makeTestJWT(t, "2", "individual"))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusForbidden, w.Code)
	body := decodeBodyMap(t, w)
	require.Equal(t, false, body["success"])
	errorObj := body["error"].(map[string]interface{})
	require.Equal(t, "You don't have permission to update this property", errorObj["message"])

	// Owner should be able to update.
	ownerBody := map[string]interface{}{"title": "Owner Updated Title"}
	ownerPayload, _ := json.Marshal(ownerBody)
	req = httptest.NewRequest(http.MethodPut, "/api/v1/properties/10", bytes.NewReader(ownerPayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+makeTestJWT(t, "1", "individual"))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	body = decodeBodyMap(t, w)
	require.Equal(t, true, body["success"])
	require.Equal(t, "Property updated successfully", body["message"])

	// Admin should be able to update any property.
	adminBody := map[string]interface{}{"title": "Admin Updated Title"}
	adminPayload, _ := json.Marshal(adminBody)
	req = httptest.NewRequest(http.MethodPut, "/api/v1/properties/10", bytes.NewReader(adminPayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+makeTestJWT(t, "3", "admin"))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	body = decodeBodyMap(t, w)
	require.Equal(t, true, body["success"])
	require.Equal(t, "Property updated successfully", body["message"])
}

func TestPropertyDeleteRoute_OwnerAndAdminAccess(t *testing.T) {
	db := setupAuthzIntegrationDB(t)
	r := setupAuthzRouter(t, db)

	// Non-owner should be forbidden.
	req := httptest.NewRequest(http.MethodDelete, "/api/v1/properties/10", nil)
	req.Header.Set("Authorization", "Bearer "+makeTestJWT(t, "2", "individual"))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusForbidden, w.Code)
	body := decodeBodyMap(t, w)
	require.Equal(t, false, body["success"])
	errorObj := body["error"].(map[string]interface{})
	require.Equal(t, "You don't have permission to delete this property", errorObj["message"])

	// Owner can delete own property.
	req = httptest.NewRequest(http.MethodDelete, "/api/v1/properties/10", nil)
	req.Header.Set("Authorization", "Bearer "+makeTestJWT(t, "1", "individual"))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	body = decodeBodyMap(t, w)
	require.Equal(t, true, body["success"])
	require.Equal(t, "Property deleted successfully", body["message"])

	// Admin can delete someone else's property.
	req = httptest.NewRequest(http.MethodDelete, "/api/v1/properties/11", nil)
	req.Header.Set("Authorization", "Bearer "+makeTestJWT(t, "3", "admin"))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	body = decodeBodyMap(t, w)
	require.Equal(t, true, body["success"])
	require.Equal(t, "Property deleted successfully", body["message"])
}

func TestMarketplaceSyncRoute_OwnerAndAdminAccess(t *testing.T) {
	db := setupAuthzIntegrationDB(t)
	r := setupAuthzRouter(t, db)

	// Non-owner non-admin should be forbidden.
	req := httptest.NewRequest(http.MethodPost, "/api/v1/properties/10/sync-marketplace", nil)
	req.Header.Set("Authorization", "Bearer "+makeTestJWT(t, "2", "individual"))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusForbidden, w.Code)
	body := decodeBodyMap(t, w)
	require.Equal(t, false, body["success"])
	errorObj := body["error"].(map[string]interface{})
	require.Equal(t, "Marketplace sync failed", errorObj["message"])
	require.Equal(t, "you do not have permission to sync this property", errorObj["details"])

	// Owner should be allowed.
	req = httptest.NewRequest(http.MethodPost, "/api/v1/properties/10/sync-marketplace", nil)
	req.Header.Set("Authorization", "Bearer "+makeTestJWT(t, "1", "individual"))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	body = decodeBodyMap(t, w)
	require.Equal(t, true, body["success"])
	require.Equal(t, "Marketplace sync completed", body["message"])

	// Admin should be allowed.
	req = httptest.NewRequest(http.MethodPost, "/api/v1/properties/10/sync-marketplace", nil)
	req.Header.Set("Authorization", "Bearer "+makeTestJWT(t, "3", "admin"))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	body = decodeBodyMap(t, w)
	require.Equal(t, true, body["success"])
	require.Equal(t, "Marketplace sync completed", body["message"])

	// Missing property should return not found.
	req = httptest.NewRequest(http.MethodPost, "/api/v1/properties/999/sync-marketplace", nil)
	req.Header.Set("Authorization", "Bearer "+makeTestJWT(t, "3", "admin"))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusNotFound, w.Code)
	body = decodeBodyMap(t, w)
	require.Equal(t, false, body["success"])
	errorObj = body["error"].(map[string]interface{})
	require.Equal(t, "Marketplace sync failed", errorObj["message"])
	require.Equal(t, "property not found", errorObj["details"])
}

func TestProtectedRoutes_RequireAuthorizationHeader(t *testing.T) {
	db := setupAuthzIntegrationDB(t)
	r := setupAuthzRouter(t, db)

	tests := []struct {
		name   string
		method string
		path   string
		body   []byte
	}{
		{name: "update property", method: http.MethodPut, path: "/api/v1/properties/10", body: []byte(`{"title":"x"}`)},
		{name: "delete property", method: http.MethodDelete, path: "/api/v1/properties/10", body: nil},
		{name: "sync marketplace", method: http.MethodPost, path: "/api/v1/properties/10/sync-marketplace", body: nil},
		{name: "billing history", method: http.MethodGet, path: "/api/v1/subscriptions/billing-history?page=1&limit=1", body: nil},
		{name: "analytics searches", method: http.MethodGet, path: "/api/v1/analytics/searches?page=1&limit=2", body: nil},
		{name: "analytics heatmap", method: http.MethodGet, path: "/api/v1/analytics/heatmap?page=1&limit=1", body: nil},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, tc.path, bytes.NewReader(tc.body))
			if tc.body != nil {
				req.Header.Set("Content-Type", "application/json")
			}
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			require.Equal(t, http.StatusUnauthorized, w.Code)
			body := decodeBodyMap(t, w)
			require.Equal(t, "authorization header required", body["error"])
		})
	}
}

func TestProtectedRoutes_RequireValidBearerFormat(t *testing.T) {
	db := setupAuthzIntegrationDB(t)
	r := setupAuthzRouter(t, db)

	tests := []struct {
		name   string
		method string
		path   string
		body   []byte
	}{
		{name: "update property", method: http.MethodPut, path: "/api/v1/properties/10", body: []byte(`{"title":"x"}`)},
		{name: "delete property", method: http.MethodDelete, path: "/api/v1/properties/10", body: nil},
		{name: "sync marketplace", method: http.MethodPost, path: "/api/v1/properties/10/sync-marketplace", body: nil},
		{name: "billing history", method: http.MethodGet, path: "/api/v1/subscriptions/billing-history?page=1&limit=1", body: nil},
		{name: "analytics searches", method: http.MethodGet, path: "/api/v1/analytics/searches?page=1&limit=2", body: nil},
		{name: "analytics heatmap", method: http.MethodGet, path: "/api/v1/analytics/heatmap?page=1&limit=1", body: nil},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, tc.path, bytes.NewReader(tc.body))
			if tc.body != nil {
				req.Header.Set("Content-Type", "application/json")
			}
			req.Header.Set("Authorization", "invalid-token")
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			require.Equal(t, http.StatusUnauthorized, w.Code)
			body := decodeBodyMap(t, w)
			require.Equal(t, "invalid authorization format", body["error"])
		})
	}
}
