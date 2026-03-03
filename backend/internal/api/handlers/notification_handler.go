package handlers

import (
	"net/http"
	"strconv"

	"backend/internal/services"
	"backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type NotificationHandler struct {
	notificationService *services.NotificationService
}

type SendNotificationRequest struct {
	UserID  string `json:"user_id" binding:"required"`
	Title   string `json:"title" binding:"required"`
	Message string `json:"message" binding:"required"`
	Type    string `json:"type"`
}

func NewNotificationHandler(notificationService *services.NotificationService) *NotificationHandler {
	return &NotificationHandler{
		notificationService: notificationService,
	}
}

// SendToUser sends notification from admin to a user
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

	utils.SuccessResponse(c, http.StatusCreated, "Notification sent", notification)
}

// ListUserNotifications lists notifications for current user
// @Router /users/notifications [get]
func (h *NotificationHandler) ListUserNotifications(c *gin.Context) {
	userID := c.MustGet("user_id").(string)
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	notifications, err := h.notificationService.ListForUser(c.Request.Context(), userID, limit)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve notifications", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Notifications retrieved", notifications)
}

// MarkNotificationRead marks one notification as read for current user
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
