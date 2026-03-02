package middleware

import (
	"log"

	"github.com/gin-gonic/gin"
)

// Logger middleware stub
func Logger(l *log.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
	}
}

// CORS middleware stub
func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
	}
}

// RateLimiter middleware stub
func RateLimiter(cache interface{}) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
	}
}
