package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"backend/internal/api/middleware"
	"backend/internal/models"
	"backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func signPaymentTestJWT(t *testing.T, userID string, userType string, secret string) string {
	t.Helper()

	claims := jwt.MapClaims{
		"user_id":   userID,
		"user_type": userType,
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(secret))
	require.NoError(t, err)
	return tokenString
}

func newPaymentHistorySummaryTestHandler(t *testing.T) (*PaymentHistorySummaryHandler, *gorm.DB) {
	t.Helper()

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&models.Transaction{}))

	return NewPaymentHistorySummaryHandler(repository.NewTransactionRepository(db)), db
}

func TestPaymentHistorySummaryHandler_GetPaymentHistoryItem_AllowsOwner(t *testing.T) {
	gin.SetMode(gin.TestMode)
	require.NoError(t, os.Setenv("JWT_SECRET", "test-secret"))
	t.Cleanup(func() {
		_ = os.Unsetenv("JWT_SECRET")
	})

	handler, db := newPaymentHistorySummaryTestHandler(t)
	require.NoError(t, db.Create(&models.Transaction{
		ID:               101,
		UserID:           42,
		BuyerID:          42,
		SellerID:         7,
		PropertyID:       15,
		Amount:           250000,
		Currency:         "RWF",
		Status:           "completed",
		PaymentMethod:    "mobile_money",
		PaymentStatus:    "paid",
		PaymentReference: "PAY-101",
		Description:      "Land transfer fee",
		TransactionType:  "sale",
		ServiceFee:       2500,
		TaxAmount:        500,
		Notes:            "Settled successfully",
		CreatedBy:        42,
		CreatedAt:        time.Date(2025, time.January, 15, 10, 30, 0, 0, time.UTC),
	}).Error)

	r := gin.New()
	r.Use(middleware.AuthRequired())
	r.GET("/payments/:id", handler.GetPaymentHistoryItem)

	token := signPaymentTestJWT(t, "42", "user", "test-secret")
	req := httptest.NewRequest(http.MethodGet, "/payments/101", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)

	var body map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	require.Equal(t, true, body["success"])
	data := body["data"].(map[string]interface{})
	transaction := data["transaction"].(map[string]interface{})
	require.Equal(t, float64(101), transaction["id"])
	require.Equal(t, "Land transfer fee", transaction["description"])
	require.Equal(t, true, data["can_download_receipt"])
}

func TestPaymentHistorySummaryHandler_GetPaymentHistoryItem_BlocksNonOwner(t *testing.T) {
	gin.SetMode(gin.TestMode)
	require.NoError(t, os.Setenv("JWT_SECRET", "test-secret"))
	t.Cleanup(func() {
		_ = os.Unsetenv("JWT_SECRET")
	})

	handler, db := newPaymentHistorySummaryTestHandler(t)
	require.NoError(t, db.Create(&models.Transaction{
		ID:            202,
		UserID:        42,
		BuyerID:       42,
		SellerID:      7,
		PropertyID:    15,
		Amount:        250000,
		Currency:      "RWF",
		Status:        "completed",
		PaymentMethod: "mobile_money",
		PaymentStatus: "paid",
		CreatedBy:     42,
	}).Error)

	r := gin.New()
	r.Use(middleware.AuthRequired())
	r.GET("/payments/:id", handler.GetPaymentHistoryItem)

	token := signPaymentTestJWT(t, "99", "user", "test-secret")
	req := httptest.NewRequest(http.MethodGet, "/payments/202", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusForbidden, w.Code)
}
