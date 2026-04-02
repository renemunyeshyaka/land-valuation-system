package utils

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type APIError struct {
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   *APIError   `json:"error,omitempty"`
}

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

// PaginatedDataPayload builds the standardized paginated envelope used in API responses.
func PaginatedDataPayload(data interface{}, total, page, limit int) gin.H {
	return gin.H{
		"data":  data,
		"total": total,
		"page":  page,
		"limit": limit,
	}
}

// SuccessPaginatedResponse sends a success response with the standardized paginated envelope.
func SuccessPaginatedResponse(c *gin.Context, code int, message string, data interface{}, total, page, limit int) {
	SuccessResponse(c, code, message, PaginatedDataPayload(data, total, page, limit))
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
