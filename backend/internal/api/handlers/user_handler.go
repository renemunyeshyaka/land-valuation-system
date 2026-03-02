package handlers

import (
	"net/http"

	"backend/internal/models"
	"backend/internal/services"
	"backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	userService *services.UserService
}

func NewUserHandler(userService *services.UserService) *UserHandler {
	return &UserHandler{
		userService: userService,
	}
}

// GetProfile retrieves user profile
// @Router /users/profile [get]
func (h *UserHandler) GetProfile(c *gin.Context) {
	userID := c.MustGet("user_id").(string)

	user, err := h.userService.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "User not found", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "User profile retrieved", user)
}

// UpdateProfile updates user profile
// @Router /users/profile [put]
func (h *UserHandler) UpdateProfile(c *gin.Context) {
	type UpdateProfileRequest struct {
		FirstName     string `json:"first_name"`
		LastName      string `json:"last_name"`
		PhoneNumber   string `json:"phone_number"`
		ProfilePicture string `json:"profile_picture"`
		Bio           string `json:"bio"`
		Language      string `json:"language_preference"`
		City          string `json:"city"`
		Country       string `json:"country"`
	}

	userID := c.MustGet("user_id").(string)

	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	updates := &models.User{
		FirstName:          req.FirstName,
		LastName:           req.LastName,
		Phone:              req.PhoneNumber,
		ProfilePictureURL:  req.ProfilePicture,
		Bio:                req.Bio,
		LanguagePreference: req.Language,
		City:               req.City,
		Country:            req.Country,
	}

	user, err := h.userService.UpdateUser(c.Request.Context(), userID, updates)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to update profile", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Profile updated successfully", user)
}

// SubmitKYC submits KYC documentation
// @Router /users/kyc [post]
func (h *UserHandler) SubmitKYC(c *gin.Context) {
	type SubmitKYCRequest struct {
		NationalID    string `json:"national_id" binding:"required"`
		DocumentURL   string `json:"document_url" binding:"required,url"`
		DocumentType  string `json:"document_type"`
	}

	userID := c.MustGet("user_id").(string)

	var req SubmitKYCRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	user, err := h.userService.SubmitKYC(c.Request.Context(), userID, req.NationalID, req.DocumentURL)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "KYC submission failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "KYC submitted successfully", user)
}

// GetKYCStatus retrieves KYC status
// @Router /users/kyc/status [get]
func (h *UserHandler) GetKYCStatus(c *gin.Context) {
	userID := c.MustGet("user_id").(string)

	status, err := h.userService.GetKYCStatus(c.Request.Context(), userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "KYC status not found", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "KYC status retrieved", gin.H{
		"status": status,
	})
}

// ChangePassword changes user password
// @Router /users/change-password [post]
func (h *UserHandler) ChangePassword(c *gin.Context) {
	type ChangePasswordRequest struct {
		CurrentPassword string `json:"current_password" binding:"required"`
		NewPassword     string `json:"new_password" binding:"required,min=8"`
		ConfirmPassword string `json:"confirm_password" binding:"required"`
	}

	userID := c.MustGet("user_id").(string)

	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	if req.NewPassword != req.ConfirmPassword {
		utils.ErrorResponse(c, http.StatusBadRequest, "Passwords do not match", "")
		return
	}

	if err := h.userService.ChangePassword(c.Request.Context(), userID, req.CurrentPassword, req.NewPassword); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Password change failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Password changed successfully", nil)
}

// GetAccountSettings retrieves account settings
// @Router /users/account-settings [get]
func (h *UserHandler) GetAccountSettings(c *gin.Context) {
	userID := c.MustGet("user_id").(string)

	settings, err := h.userService.GetAccountSettings(c.Request.Context(), userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Settings not found", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Account settings retrieved", settings)
}

// UpdateAccountSettings updates account settings
// @Router /users/account-settings [put]
func (h *UserHandler) UpdateAccountSettings(c *gin.Context) {
	type UpdateSettingsRequest struct {
		EmailNotifications    bool   `json:"email_notifications"`
		SMSNotifications      bool   `json:"sms_notifications"`
		PushNotifications     bool   `json:"push_notifications"`
		Newsletter            bool   `json:"newsletter"`
		DataCollection        bool   `json:"data_collection"`
		PrivacyLevel          string `json:"privacy_level"`
	}

	userID := c.MustGet("user_id").(string)

	var req UpdateSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	settings, err := h.userService.UpdateAccountSettings(c.Request.Context(), userID, &req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to update settings", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Account settings updated", settings)
}

// DeleteAccount deletes user account
// @Router /users/account [delete]
func (h *UserHandler) DeleteAccount(c *gin.Context) {
	type DeleteAccountRequest struct {
		Password string `json:"password" binding:"required"`
		Reason   string `json:"reason"`
	}

	userID := c.MustGet("user_id").(string)

	var req DeleteAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	if err := h.userService.DeleteAccount(c.Request.Context(), userID, req.Password); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Account deletion failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Account deleted successfully", nil)
}

// GetActivity gets user activity log
// @Router /users/activity [get]
func (h *UserHandler) GetActivity(c *gin.Context) {
	userID := c.MustGet("user_id").(string)

	activities, err := h.userService.GetActivityLog(c.Request.Context(), userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve activity", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Activity log retrieved", activities)
}
