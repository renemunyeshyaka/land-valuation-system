package middleware

import (
	"log"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
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
			allowedOrigins = "http://localhost:3000,http://localhost:5000,http://127.0.0.1:3000,http://127.0.0.1:5000"
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

// RateLimiter middleware stub
func RateLimiter(cache interface{}) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
	}
}
