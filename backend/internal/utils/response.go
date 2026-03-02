package utils

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// ErrorResponse sends an error response
func ErrorResponse(c *gin.Context, code int, message string, details string) {
	c.JSON(code, gin.H{
		"success": false,
		"error": gin.H{
			"message": message,
			"details": details,
		},
	})
}

// SuccessResponse sends a success response
func SuccessResponse(c *gin.Context, code int, message string, data interface{}) {
	c.JSON(code, gin.H{
		"success": true,
		"message": message,
		"data":    data,
	})
}

// PaginatedResponse sends a paginated response
func PaginatedResponse(c *gin.Context, message string, data interface{}, total int, page int, limit int) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": message,
		"data":    data,
		"pagination": gin.H{
			"total": total,
			"page":  page,
			"limit": limit,
		},
	})
}
