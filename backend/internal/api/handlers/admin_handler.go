package handlers

import (
	"net/http"
	"strconv"

	"backend/internal/services"
	"backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type AdminHandler struct {
	adminService *services.AdminService
}

// VerifyKYCRequest represents KYC verification request
type VerifyKYCRequest struct {
	Status  string `json:"status" binding:"required,oneof=approved rejected pending" example:"approved"`
	Comment string `json:"comment" binding:"max=500" example:"All documents verified successfully"`
	Reason  string `json:"reason" example:"Invalid national ID format"`
}

func NewAdminHandler(adminService *services.AdminService) *AdminHandler {
	return &AdminHandler{
		adminService: adminService,
	}
}

// GetAllUsers retrieves all users (admin only)
// @Router /admin/users [get]
func (h *AdminHandler) GetAllUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	status := c.Query("status")
	userType := c.Query("type")
	search := c.Query("search")

	users, total, err := h.adminService.GetAllUsers(c.Request.Context(), page, limit, status, userType, search)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve users", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Users retrieved", gin.H{
		"data":  users,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// GetUser retrieves specific user details (admin only)
// @Router /admin/users/{id} [get]
func (h *AdminHandler) GetUser(c *gin.Context) {
	userID := c.Param("id")

	user, err := h.adminService.GetUser(c.Request.Context(), userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "User not found", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "User retrieved", user)
}

// VerifyUserKYC verifies user KYC (admin only)
// @Summary Verify user KYC (Admin)
// @Description Approve or reject the KYC verification submitted by a user (admin only)
// @Tags admin
// @Accept json
// @Produce json
// @Param id path string true "User ID"
// @Param request body VerifyKYCRequest true "KYC verification decision"
// @Success 200 {object} utils.APIResponse "KYC verified"
// @Failure 400 {object} utils.APIResponse "Invalid request or validation failed"
// @Failure 401 {object} utils.APIResponse "Unauthorized"
// @Failure 403 {object} utils.APIResponse "Forbidden - Admin access required"
// @Failure 404 {object} utils.APIResponse "User or KYC not found"
// @Failure 500 {object} utils.APIResponse "Server error"
// @Security BearerAuth
// @Router /admin/users/{id}/verify-kyc [post]
func (h *AdminHandler) VerifyUserKYC(c *gin.Context) {
	userID := c.Param("id")

	// Validate user ID
	if userID == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid user ID", "")
		return
	}

	var req VerifyKYCRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid KYC verification request format", err.Error())
		return
	}

	// Validate comment length
	if len(req.Comment) > 500 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid comment",
			"Comment must not exceed 500 characters")
		return
	}

	// If rejecting, require a reason
	if req.Status == "rejected" && req.Reason == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid verification request",
			"Rejection reason is required when status is 'rejected'")
		return
	}

	// Prepare comment with status and reason
	fullComment := req.Comment
	if req.Status == "rejected" && req.Reason != "" {
		fullComment = req.Reason + (func() string {
			if req.Comment != "" {
				return ". " + req.Comment
			}
			return ""
		}())
	}

	if err := h.adminService.VerifyUserKYC(c.Request.Context(), userID, req.Status, fullComment); err != nil {
		// Distinguish between different error types
		switch err.Error() {
		case "user_not_found":
			utils.ErrorResponse(c, http.StatusNotFound, "KYC verification failed",
				"User not found")
		case "kyc_not_found":
			utils.ErrorResponse(c, http.StatusNotFound, "KYC verification failed",
				"No KYC submission found for this user")
		case "kyc_already_verified":
			utils.ErrorResponse(c, http.StatusBadRequest, "KYC verification failed",
				"KYC has already been verified for this user")
		default:
			utils.ErrorResponse(c, http.StatusBadRequest, "KYC verification failed", err.Error())
		}
		return
	}

	// Return appropriate message based on status
	var message string
	switch req.Status {
	case "approved":
		message = "User KYC verified and approved successfully"
	case "rejected":
		message = "User KYC rejected with reason provided"
	case "pending":
		message = "User KYC status set to pending review"
	default:
		message = "User KYC verification updated"
	}

	utils.SuccessResponse(c, http.StatusOK, message, gin.H{
		"user_id": userID,
		"status":  req.Status,
	})
}

// SuspendUser suspends user account (admin only)
// @Router /admin/users/{id}/suspend [post]
func (h *AdminHandler) SuspendUser(c *gin.Context) {
	type SuspendRequest struct {
		Reason string `json:"reason" binding:"required"`
	}

	userID := c.Param("id")

	var req SuspendRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	if err := h.adminService.SuspendUser(c.Request.Context(), userID, req.Reason); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "User suspension failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "User suspended", nil)
}

// ReactivateUser reactivates suspended user (admin only)
// @Router /admin/users/{id}/reactivate [post]
func (h *AdminHandler) ReactivateUser(c *gin.Context) {
	userID := c.Param("id")

	if err := h.adminService.ReactivateUser(c.Request.Context(), userID); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "User reactivation failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "User reactivated", nil)
}

// ModerateContent moderates user content (admin only)
// @Router /admin/content/{id}/moderate [post]
func (h *AdminHandler) ModerateContent(c *gin.Context) {
	type ModerationRequest struct {
		Action  string `json:"action" binding:"required"`
		Reason  string `json:"reason"`
		Message string `json:"message"`
	}

	contentID := c.Param("id")

	var req ModerationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	if err := h.adminService.ModerateContent(c.Request.Context(), contentID, req.Action, req.Reason, req.Message); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Content moderation failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Content moderated", nil)
}

// GetSystemConfig retrieves system configuration (admin only)
// @Router /admin/config [get]
func (h *AdminHandler) GetSystemConfig(c *gin.Context) {
	config, err := h.adminService.GetSystemConfig(c.Request.Context())
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve config", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "System configuration retrieved", config)
}

// UpdateSystemConfig updates system configuration (admin only)
// @Router /admin/config [put]
func (h *AdminHandler) UpdateSystemConfig(c *gin.Context) {
	var config map[string]interface{}
	if err := c.ShouldBindJSON(&config); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	if err := h.adminService.UpdateSystemConfig(c.Request.Context(), config); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Config update failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "System configuration updated", nil)
}

// GetAuditLogs retrieves audit logs (admin only)
// @Router /admin/audit-logs [get]
func (h *AdminHandler) GetAuditLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	action := c.Query("action")
	userID := c.Query("user_id")

	logs, total, err := h.adminService.GetAuditLogs(c.Request.Context(), page, limit, action, userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve audit logs", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Audit logs retrieved", gin.H{
		"data":  logs,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// GetSystemHealth retrieves system health status (admin only)
// @Router /admin/health [get]
func (h *AdminHandler) GetSystemHealth(c *gin.Context) {
	health, err := h.adminService.GetSystemHealth(c.Request.Context())
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve health status", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "System health retrieved", health)
}

// ManageSubscriptions manages user subscriptions (admin only)
// @Router /admin/subscriptions [get]
func (h *AdminHandler) ManageSubscriptions(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	status := c.Query("status")

	subscriptions, total, err := h.adminService.GetSubscriptions(c.Request.Context(), page, limit, status)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve subscriptions", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Subscriptions retrieved", gin.H{
		"data":  subscriptions,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// ApproveProperty approves property listing (admin only)
// @Router /admin/properties/{id}/approve [post]
func (h *AdminHandler) ApproveProperty(c *gin.Context) {
	propertyID := c.Param("id")

	if err := h.adminService.ApproveProperty(c.Request.Context(), propertyID); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Property approval failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Property approved", nil)
}

// RejectProperty rejects property listing (admin only)
// @Router /admin/properties/{id}/reject [post]
func (h *AdminHandler) RejectProperty(c *gin.Context) {
	type RejectRequest struct {
		Reason string `json:"reason" binding:"required"`
	}

	propertyID := c.Param("id")

	var req RejectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	if err := h.adminService.RejectProperty(c.Request.Context(), propertyID, req.Reason); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Property rejection failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Property rejected", nil)
}
