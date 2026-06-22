package middleware

import (
	"context"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
)

// Logger middleware stub
func Logger(l *log.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
	}
}

// CORS middleware with support for development and production
func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// Get allowed origins from environment
		allowedOrigins := os.Getenv("CORS_ORIGIN")
		if allowedOrigins == "" {
			// Default to localhost for development
			allowedOrigins = "http://localhost:3001,http://localhost:5001,http://127.0.0.1:3001,http://127.0.0.1:5001"
		}

		// Check if origin is allowed
		isAllowed := false
		originsList := strings.Split(allowedOrigins, ",")
		for _, allowed := range originsList {
			allowed = strings.TrimSpace(allowed)
			if origin == allowed {
				isAllowed = true
				break
			}
		}

		// Always allow if origin is allowed
		if isAllowed || allowedOrigins == "*" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		}

		// Set common CORS headers
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE, PATCH")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept")
		c.Writer.Header().Set("Access-Control-Max-Age", "86400")
		c.Writer.Header().Set("Access-Control-Expose-Headers", "Content-Length, Content-Type")

		// Handle preflight requests
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

// SecurityHeaders adds security-related HTTP headers to every response.
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("X-Permitted-Cross-Domain-Policies", "none")
		// HSTS: tell browsers to only use HTTPS for 1 year (prod only)
		if os.Getenv("NODE_ENV") == "production" {
			c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
		}
		// Content Security Policy (basic — relax for dev)
		c.Header("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://unpkg.com; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com https://unpkg.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: blob: https:; connect-src 'self' http://localhost:* https:; frame-src 'self' https://www.sandbox.paypal.com https://www.paypal.com; media-src 'self'")
		c.Next()
	}
}

// RateLimiter implements sliding window rate limiting using Redis.
// It limits requests per IP address based on configured window and max requests.
// General API: 100 requests per 15 minute window
// Auth endpoints: 5 requests per 15 minute window (stricter)
func RateLimiter(redisClient interface{}) gin.HandlerFunc {
	rdb, ok := redisClient.(*redis.Client)
	if !ok || rdb == nil {
		// Redis not available — pass through (fail open)
		return func(c *gin.Context) { c.Next() }
	}

	// Get config from env with defaults
	generalLimit, _ := strconv.Atoi(os.Getenv("RATE_LIMIT"))
	if generalLimit <= 0 {
		generalLimit = 100
	}
	generalWindow := 15 * 60 // 15 minutes in seconds

	authLimit := 5
	authWindow := 15 * 60 // 15 minutes

	return func(c *gin.Context) {
		clientIP := c.ClientIP()
		path := c.Request.URL.Path

		// Determine which rate limit to apply
		isAuth := strings.Contains(path, "/auth/")
		limit := generalLimit
		window := generalWindow
		if isAuth {
			limit = authLimit
			window = authWindow
		}

		// Sliding window counter using Redis
		ctx := context.Background()
		key := "ratelimit:" + clientIP + ":" + path
		now := time.Now().Unix()

		// Remove entries older than the window
		rdb.ZRemRangeByScore(ctx, key, "0", strconv.FormatInt(now-int64(window), 10))

		// Count entries in current window
		count, err := rdb.ZCard(ctx, key).Result()
		if err != nil {
			// Redis error — pass through
			c.Next()
			return
		}

		if int(count) >= limit {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"error": gin.H{
					"message": "Rate limit exceeded. Please try again later.",
					"details": "Too many requests. Try again in " + strconv.Itoa(window) + " seconds.",
				},
			})
			c.Abort()
			return
		}

		// Add current request to the sorted set
		rdb.ZAdd(ctx, key, &redis.Z{Score: float64(now), Member: now})
		rdb.Expire(ctx, key, time.Duration(window)*time.Second)

		// Set rate limit headers
		c.Header("X-RateLimit-Limit", strconv.Itoa(limit))
		c.Header("X-RateLimit-Remaining", strconv.Itoa(limit-int(count)-1))
		c.Header("X-RateLimit-Reset", strconv.FormatInt(now+int64(window), 10))

		c.Next()
	}
}
