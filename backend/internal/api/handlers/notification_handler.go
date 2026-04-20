package handlers

import (
	"backend/internal/models"
	"backend/internal/services"
	"backend/internal/utils"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type NotificationHandler struct {
	notificationService *services.NotificationService
}

type SendNotificationRequest struct {
	UserID  string `json:"user_id" binding:"required" example:"user_123"`
	Title   string `json:"title" binding:"required" example:"Payment Received"`
	Message string `json:"message" binding:"required" example:"Your payment of 50,000 RWF has been processed successfully"`
	Type    string `json:"type" binding:"oneof=info success warning error" example:"success"`
}

type BroadcastNotificationRequest struct {
	Title    string `json:"title" binding:"required" example:"System Maintenance"`
	Message  string `json:"message" binding:"required" example:"System maintenance scheduled for tonight at 2 AM"`
	Type     string `json:"type" binding:"oneof=info success warning error" example:"warning"`
	UserRole string `json:"user_role" example:"all"`
}

func NewNotificationHandler(notificationService *services.NotificationService) *NotificationHandler {
	return &NotificationHandler{
		notificationService: notificationService,
	}
}

// SendToUser godoc
// @Summary Send notification to a specific user (Admin)
// @Description Admin endpoint to send notification to a specific user
// @Tags admin,notifications
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body SendNotificationRequest true "Notification details"
// @Success 201 {object} utils.APIResponse
// @Failure 400 {object} utils.APIResponse
// @Failure 500 {object} utils.APIResponse
// @Router /admin/notifications [post]
func (h *NotificationHandler) SendToUser(c *gin.Context) {
	var req SendNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	if req.Type == "" {
		req.Type = "info"
	}

	adminUserID := c.MustGet("user_id").(string)

	notification, err := h.notificationService.SendToUser(c.Request.Context(), services.SendNotificationInput{
		UserID:   req.UserID,
		Title:    req.Title,
		Message:  req.Message,
		Type:     req.Type,
		SentByID: adminUserID,
	})
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to send notification", err.Error())
		return
	}

	// Broadcast to WebSocket clients (if hub is available)
	if WSNotificationHubInstance != nil && notification != nil {
		msg := utils.NotificationToJSON(notification)
		go WSNotificationHubInstance.Broadcast([]byte(msg))
	}

	utils.SuccessResponse(c, http.StatusCreated, "Notification sent", notification)
}

// ListUserNotifications godoc
// @Summary List notifications for current user
// @Description Get all notifications for the authenticated user
// @Tags notifications
// @Produce json
// @Security BearerAuth
// @Param limit query int false "Maximum number of notifications" default(20)
// @Success 200 {object} utils.APIResponse
// @Failure 401 {object} utils.APIResponse
// @Failure 500 {object} utils.APIResponse
// @Router /users/notifications [get]
func (h *NotificationHandler) ListUserNotifications(c *gin.Context) {
	userIDStr := c.MustGet("user_id").(string)
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	notifications, err := h.notificationService.ListForUser(c.Request.Context(), userIDStr, limit)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid user ID for notification lookup", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Notifications retrieved", notifications)
}

// MarkNotificationRead godoc
// @Summary Mark notification as read
// @Description Mark a specific notification as read for the current user
// @Tags notifications
// @Produce json
// @Security BearerAuth
// @Param id path string true "Notification ID"
// @Success 200 {object} utils.APIResponse
// @Failure 401 {object} utils.APIResponse
// @Failure 404 {object} utils.APIResponse
// @Failure 500 {object} utils.APIResponse
// @Router /users/notifications/{id}/read [post]
func (h *NotificationHandler) MarkNotificationRead(c *gin.Context) {
	userID := c.MustGet("user_id").(string)
	notificationID := c.Param("id")

	if err := h.notificationService.MarkAsRead(c.Request.Context(), notificationID, userID); err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Failed to mark notification as read", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Notification marked as read", nil)
}

// MarkAllAsRead godoc
// @Summary Mark all notifications as read
// @Description Mark all notifications as read for the current user
// @Tags notifications
// @Produce json
// @Security BearerAuth
// @Success 200 {object} utils.APIResponse
// @Failure 401 {object} utils.APIResponse
// @Failure 500 {object} utils.APIResponse
// @Router /users/notifications/read-all [post]
func (h *NotificationHandler) MarkAllAsRead(c *gin.Context) {
	userID := c.MustGet("user_id").(string)

	markedCount, err := h.notificationService.MarkAllAsRead(c.Request.Context(), userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to mark notifications as read", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "All notifications marked as read", gin.H{
		"marked_count": markedCount,
	})
}

// GetUnreadCount godoc
// @Summary Get unread notification count
// @Description Get the count of unread notifications for the current user
// @Tags notifications
// @Produce json
// @Security BearerAuth
// @Success 200 {object} utils.APIResponse
// @Failure 401 {object} utils.APIResponse
// @Failure 500 {object} utils.APIResponse
// @Router /users/notifications/unread-count [get]
func (h *NotificationHandler) GetUnreadCount(c *gin.Context) {
	userID := c.MustGet("user_id").(string)

	unreadCount, err := h.notificationService.GetUnreadCount(c.Request.Context(), userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve unread count", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Unread count retrieved", gin.H{
		"unread_count": unreadCount,
	})
}

// BroadcastNotification godoc
// @Summary Broadcast notification to all users (Admin)
// @Description Admin endpoint to send notification to all users or specific role
// @Tags admin,notifications
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body BroadcastNotificationRequest true "Broadcast details"
// @Success 201 {object} utils.APIResponse
// @Failure 400 {object} utils.APIResponse
// @Failure 500 {object} utils.APIResponse
// @Router /admin/notifications/broadcast [post]
func (h *NotificationHandler) BroadcastNotification(c *gin.Context) {
	var req BroadcastNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	if req.Type == "" {
		req.Type = "info"
	}
	if req.UserRole == "" {
		req.UserRole = "all"
	}

	adminUserID := c.MustGet("user_id").(string)

	recipientsCount, err := h.notificationService.BroadcastNotification(
		c.Request.Context(),
		req.Title,
		req.Message,
		req.Type,
		req.UserRole,
		adminUserID,
	)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to broadcast notification", err.Error())
		return
	}

	// Broadcast to WebSocket clients (if hub is available)
	if WSNotificationHubInstance != nil {
		// Send a generic broadcast message (clients should refresh notifications)
		msg := utils.BroadcastNotificationToJSON(req.Title, req.Message, req.Type, req.UserRole)
		go WSNotificationHubInstance.Broadcast([]byte(msg))
	}

	utils.SuccessResponse(c, http.StatusCreated, "Notification broadcasted successfully", gin.H{
		"recipients_count": recipientsCount,
		"user_role":        req.UserRole,
		"broadcast_id":     "bc_" + strconv.FormatInt(time.Now().UnixNano(), 10),
	})
}

// DeleteNotification godoc
// @Summary Delete notification
// @Description Delete a specific notification for the current user
// @Tags notifications
// @Produce json
// @Security BearerAuth
// @Param id path string true "Notification ID"
// @Success 200 {object} utils.APIResponse
// @Failure 401 {object} utils.APIResponse
// @Failure 404 {object} utils.APIResponse
// @Failure 500 {object} utils.APIResponse
// @Router /users/notifications/{id} [delete]
func (h *NotificationHandler) DeleteNotification(c *gin.Context) {
	userID := c.MustGet("user_id").(string)
	notificationID := c.Param("id")

	if err := h.notificationService.DeleteNotification(c.Request.Context(), notificationID, userID); err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Failed to delete notification", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Notification deleted successfully", nil)
}

// AdminDeleteNotification godoc
// @Summary Admin delete notification
// @Description Admin can delete any notification by ID
// @Tags admin,notifications
// @Produce json
// @Security BearerAuth
// @Param id path string true "Notification ID"
// @Success 200 {object} utils.APIResponse
// @Failure 401 {object} utils.APIResponse
// @Failure 404 {object} utils.APIResponse
// @Failure 500 {object} utils.APIResponse
// @Router /admin/notifications/{id} [delete]
func (h *NotificationHandler) AdminDeleteNotification(c *gin.Context) {
	notificationID := c.Param("id")
	if err := h.notificationService.AdminDeleteNotification(c.Request.Context(), notificationID); err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Failed to delete notification", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Notification deleted successfully", nil)
}

// AdminUpdateNotification godoc
// @Summary Admin update notification
// @Description Admin can update any notification by ID
// @Tags admin,notifications
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Notification ID"
// @Param request body models.Notification true "Notification update payload"
// @Success 200 {object} utils.APIResponse
// @Failure 400 {object} utils.APIResponse
// @Failure 401 {object} utils.APIResponse
// @Failure 404 {object} utils.APIResponse
// @Failure 500 {object} utils.APIResponse
// @Router /admin/notifications/{id} [put]
func (h *NotificationHandler) AdminUpdateNotification(c *gin.Context) {
	notificationID := c.Param("id")
	var payload models.Notification
	if err := c.ShouldBindJSON(&payload); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}
	updated, err := h.notificationService.AdminUpdateNotification(c.Request.Context(), notificationID, &payload)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Failed to update notification", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Notification updated successfully", updated)
}
