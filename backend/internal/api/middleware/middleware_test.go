package middleware

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/require"
)

func TestAuthRequiredSetsContextValues(t *testing.T) {
	gin.SetMode(gin.TestMode)
	require.NoError(t, os.Setenv("JWT_SECRET", "test-secret"))
	t.Cleanup(func() {
		_ = os.Unsetenv("JWT_SECRET")
	})

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":   123.0,
		"user_type": "admin",
	})
	tokenString, err := token.SignedString([]byte("test-secret"))
	require.NoError(t, err)

	router := gin.New()
	router.Use(AuthRequired())
	router.GET("/secured", func(c *gin.Context) {
		userID, userIDExists := c.Get("user_id")
		userType, userTypeExists := c.Get("user_type")
		require.True(t, userIDExists)
		require.True(t, userTypeExists)
		require.Equal(t, "123", userID)
		require.Equal(t, "admin", userType)
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/secured", nil)
	req.Header.Set("Authorization", "Bearer "+tokenString)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)
}
