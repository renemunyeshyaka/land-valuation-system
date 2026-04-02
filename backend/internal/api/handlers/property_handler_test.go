package handlers

import (
	"errors"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestGetUserIDFromContext_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("user_id", "42")

	userID, err := getUserIDFromContext(c)
	require.NoError(t, err)
	require.Equal(t, uint(42), userID)
}

func TestGetUserIDFromContext_Missing(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	_, err := getUserIDFromContext(c)
	require.Error(t, err)
	require.True(t, errors.Is(err, strconv.ErrSyntax))
}

func TestGetUserIDFromContext_InvalidType(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("user_id", 42)

	_, err := getUserIDFromContext(c)
	require.Error(t, err)
	require.True(t, errors.Is(err, strconv.ErrSyntax))
}

func TestGetUserIDFromContext_InvalidString(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("user_id", "not-a-number")

	_, err := getUserIDFromContext(c)
	require.Error(t, err)
	var numErr *strconv.NumError
	require.True(t, errors.As(err, &numErr))
}
