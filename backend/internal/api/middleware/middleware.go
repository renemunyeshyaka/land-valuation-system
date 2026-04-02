package middleware

import (
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// AuthRequired middleware validates JWT token
func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "authorization header required",
			})
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "invalid authorization format",
			})
			c.Abort()
			return
		}

		// Get JWT secret from environment
		jwtSecret := os.Getenv("JWT_SECRET")
		if jwtSecret == "" {
			jwtSecret = "your-secret-key" // fallback for development
		}

		// Parse JWT token
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return []byte(jwtSecret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "invalid or expired token",
			})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "invalid token claims",
			})
			c.Abort()
			return
		}

		rawUserID, ok := claims["user_id"]
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "user id not found in token",
			})
			c.Abort()
			return
		}

		var userID string
		switch v := rawUserID.(type) {
		case string:
			userID = v
		case float64:
			userID = strconv.FormatUint(uint64(v), 10)
		default:
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "invalid user id in token",
			})
			c.Abort()
			return
		}

		c.Set("user_id", userID)
		if userType, ok := claims["user_type"].(string); ok {
			c.Set("user_type", userType)
		}
		c.Set("claims", claims)
		c.Next()
	}
}

// AdminRequired middleware checks if user is admin
func AdminRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		claims, exists := c.Get("claims")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "claims not found",
			})
			c.Abort()
			return
		}

		mapClaims, ok := claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "invalid claims format",
			})
			c.Abort()
			return
		}

		userType, ok := mapClaims["user_type"].(string)
		if !ok || userType != "admin" {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "admin access required",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// ErrorHandler handles and logs errors
func ErrorHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		if len(c.Errors) > 0 {
			for _, err := range c.Errors {
				// TODO: Log error
				_ = err
			}
		}
	}
}

// RequestLogger logs incoming requests
func RequestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		// TODO: Implement proper logging
		c.Next()
	}
}

// CORS middleware
func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

// RateLimiter middleware (placeholder)
func RateLimiter() gin.HandlerFunc {
	return func(c *gin.Context) {
		// TODO: Implement rate limiting using Redis
		c.Next()
	}
}
