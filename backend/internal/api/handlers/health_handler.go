package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type HealthHandler struct {
	db *gorm.DB
}

func NewHealthHandler(db *gorm.DB) *HealthHandler {
	return &HealthHandler{db: db}
}

// HealthCheck godoc
// @Summary Check API health status
// @Description Returns health status of the API and its dependencies
// @Tags health
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "API is healthy"
// @Failure 503 {object} map[string]interface{} "Service unavailable"
// @Router /health [get]
func (h *HealthHandler) HealthCheck(c *gin.Context) {
	// Check database connection
	sqlDB, err := h.db.DB()
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status": "unhealthy",
			"error":  "failed to get database connection",
			"time":   time.Now(),
		})
		return
	}

	// Ping database
	if err := sqlDB.Ping(); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":   "unhealthy",
			"error":    "database ping failed",
			"time":     time.Now(),
			"database": "disconnected",
		})
		return
	}

	// Get database stats
	stats := sqlDB.Stats()

	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"time":    time.Now(),
		"version": "1.0.0",
		"database": gin.H{
			"status":           "connected",
			"open_connections": stats.OpenConnections,
			"in_use":           stats.InUse,
			"idle":             stats.Idle,
		},
	})
}

// ReadinessCheck godoc
// @Summary Check if API is ready to serve requests
// @Description Returns readiness status including database connectivity
// @Tags health
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "API is ready"
// @Failure 503 {object} map[string]interface{} "Service not ready"
// @Router /ready [get]
func (h *HealthHandler) ReadinessCheck(c *gin.Context) {
	sqlDB, err := h.db.DB()
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"ready": false,
			"error": "database connection unavailable",
		})
		return
	}

	// Ping with timeout
	ctx, cancel := c.Request.Context(), func() {}
	defer cancel()

	if err := sqlDB.PingContext(ctx); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"ready": false,
			"error": "database not responding",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"ready": true,
		"time":  time.Now(),
	})
}

// LivenessCheck godoc
// @Summary Check if API is alive
// @Description Simple liveness probe that always returns 200 if the app is running
// @Tags health
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "API is alive"
// @Router /live [get]
func (h *HealthHandler) LivenessCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"alive": true,
		"time":  time.Now(),
	})
}

// DatabaseStats godoc
// @Summary Get database connection statistics
// @Description Returns detailed database connection pool statistics
// @Tags health
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "Database statistics"
// @Failure 503 {object} map[string]interface{} "Database unavailable"
// @Router /health/db [get]
func (h *HealthHandler) DatabaseStats(c *gin.Context) {
	sqlDB, err := h.db.DB()
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "failed to get database connection",
		})
		return
	}

	stats := sqlDB.Stats()

	c.JSON(http.StatusOK, gin.H{
		"database": gin.H{
			"max_open_connections": stats.MaxOpenConnections,
			"open_connections":     stats.OpenConnections,
			"in_use":               stats.InUse,
			"idle":                 stats.Idle,
			"wait_count":           stats.WaitCount,
			"wait_duration":        stats.WaitDuration.String(),
			"max_idle_closed":      stats.MaxIdleClosed,
			"max_lifetime_closed":  stats.MaxLifetimeClosed,
		},
		"time": time.Now(),
	})
}
