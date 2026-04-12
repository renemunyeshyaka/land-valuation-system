package handlers

import (
	"backend/internal/models"
	"backend/internal/repository"
	"errors"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
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

func TestLikePropertyHandler_PersistsLike(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Setup in-memory SQLite DB for testing
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	db.AutoMigrate(&models.Property{})

	// Insert a property
	property := models.Property{Interested: 0, LikesCount: 0}
	db.Create(&property)

	repo := repository.NewPropertyRepository(db)
	handler := NewPropertyHandler(repo)

	w := httptest.NewRecorder()
	r := gin.Default()
	// Register the handler for testing
	r.POST("/properties/:id/like", func(c *gin.Context) {
		// Inject db into handler context if needed
		handler.LikePropertyHandler(c)
	})

	// Call like endpoint
	likeURL := "/properties/" + strconv.Itoa(int(property.ID)) + "/like"
	req := httptest.NewRequest("POST", likeURL, nil)
	r.ServeHTTP(w, req)
	require.Equal(t, 200, w.Code)

	// Reload property from DB and check likes
	var updated models.Property
	db.First(&updated, property.ID)
	require.Equal(t, 1, updated.LikesCount)

	// Call like endpoint again
	w2 := httptest.NewRecorder()
	req2 := httptest.NewRequest("POST", likeURL, nil)
	r.ServeHTTP(w2, req2)
	require.Equal(t, 200, w2.Code)
	db.First(&updated, property.ID)
	require.Equal(t, 2, updated.LikesCount)
}

func TestInterestedPropertyHandler_PersistsInterested(t *testing.T) {
	gin.SetMode(gin.TestMode)

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	db.AutoMigrate(&models.Property{})

	property := models.Property{Interested: 0, LikesCount: 0}
	db.Create(&property)

	repo := repository.NewPropertyRepository(db)
	handler := NewPropertyHandler(repo)

	w := httptest.NewRecorder()
	r := gin.Default()
	r.POST("/properties/:id/interested", func(c *gin.Context) {
		handler.InterestedPropertyHandler(c)
	})

	interestedURL := "/properties/" + strconv.Itoa(int(property.ID)) + "/interested"
	req := httptest.NewRequest("POST", interestedURL, nil)
	r.ServeHTTP(w, req)
	require.Equal(t, 200, w.Code)

	var updated models.Property
	db.First(&updated, property.ID)
	require.Equal(t, 1, updated.Interested)

	// Call again to check increment
	w2 := httptest.NewRecorder()
	req2 := httptest.NewRequest("POST", interestedURL, nil)
	r.ServeHTTP(w2, req2)
	require.Equal(t, 200, w2.Code)
	db.First(&updated, property.ID)
	require.Equal(t, 2, updated.Interested)
}
