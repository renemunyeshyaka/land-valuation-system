package handlers

import (
	"bytes"
	"encoding/base64"
	"encoding/csv"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/jung-kurt/gofpdf"

	"backend/internal/models"
	"backend/internal/services"
	"backend/internal/utils"
	"backend/pkg/filevalidation"

	"github.com/gin-gonic/gin"
)

// ListUsers lists all users (admin only)
// @Summary List all users
// @Description List all users with subscription status (admin only)
// @Tags admin
// @Produce json
// @Param page query int false "Page number"
// @Param limit query int false "Page size"
// @Param status query string false "Subscription status filter"
// @Success 200 {object} utils.APIResponse "List of users"
// @Failure 401 {object} utils.APIResponse "Unauthorized"
// @Router /admin/users [get]
func (h *UserHandler) ListUsers(c *gin.Context) {
	// TODO: Add admin authentication/authorization check
	page := 1
	limit := 20
	if p := c.Query("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil {
			page = parsed
		}
	}
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil {
			limit = parsed
		}
	}
	if page <= 0 {
		page = 1
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit
	filters := map[string]string{}
	if status := c.Query("status"); status != "" {
		filters["status"] = status
	}
	users, total, err := h.userService.ListUsers(c.Request.Context(), offset, limit, filters)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to list users", err.Error())
		return
	}
	data := utils.PaginatedDataPayload(users, total, page, limit)
	// Backward compatibility: keep `users` alias while clients migrate to `data`.
	data["users"] = users
	utils.SuccessResponse(c, http.StatusOK, "Users listed", data)
}

type UserHandler struct {
	userService *services.UserService
}

type AdminUpdateUserRequest struct {
	FirstName string `json:"first_name" binding:"required,min=1"`
	LastName  string `json:"last_name" binding:"required,min=1"`
	Email     string `json:"email" binding:"required,email"`
	Status    string `json:"status" binding:"omitempty,oneof=pending active"`
}

// ExportUsers allows admin to export user data as CSV or PDF
// @Summary Export users (admin)
// @Description Export all users as CSV or PDF
// @Tags admin
// @Produce application/octet-stream
// @Param format query string false "csv or pdf" default(csv)
// @Success 200 {file} file
// @Failure 401 {object} utils.APIResponse
// @Router /admin/users/export [get]
func (h *UserHandler) ExportUsers(c *gin.Context) {
	format := c.DefaultQuery("format", "csv")
	users, _, err := h.userService.ListUsers(c.Request.Context(), 0, 10000, map[string]string{})
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch users", err.Error())
		return
	}
	if format == "pdf" {
		pdf := gofpdf.New("P", "mm", "A4", "")
		pdf.AddPage()
		pdf.SetFont("Arial", "B", 12)
		pdf.Cell(40, 10, "User Export Report")
		pdf.Ln(12)
		pdf.SetFont("Arial", "", 10)
		for _, u := range users {
			pdf.Cell(0, 8, fmt.Sprintf("ID: %v, Name: %s %s, Email: %s", u.ID, u.FirstName, u.LastName, u.Email))
			pdf.Ln(8)
		}
		var buf bytes.Buffer
		err := pdf.Output(&buf)
		if err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to generate PDF", err.Error())
			return
		}
		c.Header("Content-Disposition", "attachment; filename=users.pdf")
		c.Data(http.StatusOK, "application/pdf", buf.Bytes())
		return
	}
	// Default: CSV
	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)
	if err := writer.Write([]string{"ID", "FirstName", "LastName", "Email", "Status"}); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to generate CSV", err.Error())
		return
	}
	for _, u := range users {
		if err := writer.Write([]string{
			fmt.Sprintf("%v", u.ID),
			u.FirstName,
			u.LastName,
			u.Email,
			u.KYCStatus,
		}); err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to generate CSV", err.Error())
			return
		}
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to generate CSV", err.Error())
		return
	}
	c.Header("Content-Disposition", "attachment; filename=users.csv")
	c.Data(http.StatusOK, "text/csv", buf.Bytes())
}

// SubmitKYCRequest represents KYC submission request
type SubmitKYCRequest struct {
	NationalID   string `json:"national_id" binding:"required,min=6,max=30" example:"1ABCDE1234567890"`
	DocumentURL  string `json:"document_url" binding:"required,url" example:"https://example.com/doc.pdf"`
	DocumentType string `json:"document_type" binding:"required,oneof=national_id birth_certificate passport driver_license" example:"national_id"`
	FirstName    string `json:"first_name" binding:"required,min=2" example:"John"`
	LastName     string `json:"last_name" binding:"required,min=2" example:"Doe"`
}

func NewUserHandler(userService *services.UserService) *UserHandler {
	return &UserHandler{
		userService: userService,
	}
}

// UpdateUserByAdmin allows admin to update basic user profile fields and status.
func (h *UserHandler) UpdateUserByAdmin(c *gin.Context) {
	userID := c.Param("id")
	if userID == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid user ID", "")
		return
	}

	var req AdminUpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	updatedUser, err := h.userService.UpdateUserByAdmin(
		c.Request.Context(),
		userID,
		req.FirstName,
		req.LastName,
		req.Email,
		req.Status,
	)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to update user", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "User updated", updatedUser)
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

// UpdateProfile updates user profile with optional file upload
// @Router /users/profile [put]
func (h *UserHandler) UpdateProfile(c *gin.Context) {
	userID := c.MustGet("user_id").(string)

	// Check if this is a multipart form request or JSON
	contentType := c.ContentType()
	var profilePictureURL string
	var firstNameVal, lastNameVal, phoneNumberVal, bioVal, languageVal, cityVal, countryVal string

	if strings.Contains(contentType, "multipart/form-data") {
		// Handle multipart form data with optional file upload
		if err := c.Request.ParseMultipartForm(filevalidation.MaxFileSize); err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid multipart form data", err.Error())
			return
		}

		firstNameVal = c.PostForm("first_name")
		lastNameVal = c.PostForm("last_name")
		phoneNumberVal = c.PostForm("phone_number")
		bioVal = c.PostForm("bio")
		languageVal = c.PostForm("language_preference")
		cityVal = c.PostForm("city")
		countryVal = c.PostForm("country")

		// Handle profile picture file if provided
		form, err := c.MultipartForm()
		if err == nil && form.File["profile_picture"] != nil && len(form.File["profile_picture"]) > 0 {
			fileHeader := form.File["profile_picture"][0]

			// Validate file size
			if err := filevalidation.ValidateFileSize(fileHeader.Size, fileHeader.Filename); err != nil {
				utils.ErrorResponse(c, http.StatusBadRequest, "Invalid profile picture", err.Error())
				return
			}

			// Open file
			file, err := fileHeader.Open()
			if err != nil {
				utils.ErrorResponse(c, http.StatusBadRequest, "Failed to read profile picture", err.Error())
				return
			}
			defer file.Close()

			// Read file data
			fileData, err := io.ReadAll(file)
			if err != nil {
				utils.ErrorResponse(c, http.StatusBadRequest, "Failed to read profile picture data", err.Error())
				return
			}

			// Validate image
			if err := filevalidation.ValidateImageFile(fileHeader.Filename, fileHeader.Header.Get("Content-Type"), fileHeader.Size); err != nil {
				utils.ErrorResponse(c, http.StatusBadRequest, "Invalid profile picture", err.Error())
				return
			}

			// Convert to base64 DataURL
			mimeType := filevalidation.DetectMIMEType(fileData)
			if mimeType == "" || !strings.Contains(mimeType, "image") {
				mimeType = "image/jpeg"
			}
			profilePictureURL = fmt.Sprintf("data:%s;base64,%s", mimeType, base64.StdEncoding.EncodeToString(fileData))
		} else if profilePictureDataURL := c.PostForm("profile_picture"); profilePictureDataURL != "" {
			// Handle profile picture as DataURL string (from frontend)
			profilePictureURL = profilePictureDataURL
		}
	} else {
		// Handle JSON request (legacy/DataURL support)
		type UpdateProfileRequest struct {
			FirstName      string `json:"first_name"`
			LastName       string `json:"last_name"`
			PhoneNumber    string `json:"phone_number"`
			ProfilePicture string `json:"profile_picture"`
			Bio            string `json:"bio"`
			Language       string `json:"language_preference"`
			City           string `json:"city"`
			Country        string `json:"country"`
		}

		var req UpdateProfileRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
			return
		}

		firstNameVal = req.FirstName
		lastNameVal = req.LastName
		phoneNumberVal = req.PhoneNumber
		profilePictureURL = req.ProfilePicture
		bioVal = req.Bio
		languageVal = req.Language
		cityVal = req.City
		countryVal = req.Country

		// Validate DataURL format if provided
		if profilePictureURL != "" && !strings.HasPrefix(profilePictureURL, "data:") {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid profile picture format", "Profile picture must be a DataURL")
			return
		}
	}

	updates := &models.User{
		FirstName:          firstNameVal,
		LastName:           lastNameVal,
		Phone:              phoneNumberVal,
		ProfilePictureURL:  profilePictureURL,
		Bio:                bioVal,
		LanguagePreference: languageVal,
		City:               cityVal,
		Country:            countryVal,
	}

	user, err := h.userService.UpdateUser(c.Request.Context(), userID, updates)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to update profile", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Profile updated successfully", user)
}

// SubmitKYC submits KYC documentation
// @Summary Submit KYC documentation
// @Description Submit Know Your Customer identity verification documents (national ID, birth certificate, etc.)
// @Tags kyc
// @Accept json
// @Produce json
// @Param request body SubmitKYCRequest true "KYC submission"
// @Success 201 {object} utils.APIResponse "KYC submitted successfully"
// @Failure 400 {object} utils.APIResponse "Invalid request or validation failed"
// @Failure 401 {object} utils.APIResponse "Unauthorized"
// @Failure 500 {object} utils.APIResponse "Server error"
// @Security BearerAuth
// @Router /users/kyc [post]
func (h *UserHandler) SubmitKYC(c *gin.Context) {
	userID := c.MustGet("user_id").(string)

	var req SubmitKYCRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid KYC submission format", err.Error())
		return
	}

	// Validate national ID format (Rwanda format: 1 letter + 16 digits)
	if len(req.NationalID) != 16 || (req.NationalID[0] < 'A' || req.NationalID[0] > 'Z') {
		for i := 1; i < len(req.NationalID); i++ {
			if req.NationalID[i] < '0' || req.NationalID[i] > '9' {
				utils.ErrorResponse(c, http.StatusBadRequest, "Invalid national ID format",
					"National ID must be 1 letter followed by 16 digits")
				return
			}
		}
	}

	// Validate document URL is not empty
	if len(req.DocumentURL) < 10 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid document URL",
			"Document URL must be a valid HTTP(S) URL")
		return
	}

	// Validate name fields
	if len(req.FirstName) < 2 || len(req.FirstName) > 50 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid first name",
			"First name must be between 2 and 50 characters")
		return
	}
	if len(req.LastName) < 2 || len(req.LastName) > 50 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid last name",
			"Last name must be between 2 and 50 characters")
		return
	}

	user, err := h.userService.SubmitKYC(c.Request.Context(), userID, req.NationalID, req.DocumentURL)
	if err != nil {
		// Distinguish between different error types
		switch err.Error() {
		case "kyc_already_submitted":
			utils.ErrorResponse(c, http.StatusBadRequest, "KYC submission failed",
				"KYC has already been submitted for this account")
		case "invalid_national_id":
			utils.ErrorResponse(c, http.StatusBadRequest, "KYC submission failed",
				"Invalid or duplicate national ID")
		case "user_not_found":
			utils.ErrorResponse(c, http.StatusNotFound, "KYC submission failed",
				"User account not found")
		default:
			utils.ErrorResponse(c, http.StatusBadRequest, "KYC submission failed", err.Error())
		}
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "KYC submitted successfully and is now under review", gin.H{
		"user_id":    user.ID,
		"kyc_status": "pending_review",
		"message":    "Your KYC documents are under review. This typically takes 1-3 business days.",
	})
}

// GetKYCStatus retrieves KYC status
// @Summary Get KYC verification status
// @Description Retrieve the current KYC verification status and submission details
// @Tags kyc
// @Accept json
// @Produce json
// @Success 200 {object} utils.APIResponse "KYC status retrieved"
// @Failure 401 {object} utils.APIResponse "Unauthorized"
// @Failure 404 {object} utils.APIResponse "KYC not found"
// @Failure 500 {object} utils.APIResponse "Server error"
// @Security BearerAuth
// @Router /users/kyc/status [get]
func (h *UserHandler) GetKYCStatus(c *gin.Context) {
	userID := c.MustGet("user_id").(string)

	status, err := h.userService.GetKYCStatus(c.Request.Context(), userID)
	if err != nil {
		if err.Error() == "kyc_not_found" {
			utils.ErrorResponse(c, http.StatusNotFound, "KYC status not found",
				"No KYC submission found for this user")
		} else {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve KYC status",
				err.Error())
		}
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "KYC status retrieved successfully", gin.H{
		"user_id": userID,
		"status":  status,
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
		EmailNotifications bool   `json:"email_notifications"`
		SMSNotifications   bool   `json:"sms_notifications"`
		PushNotifications  bool   `json:"push_notifications"`
		Newsletter         bool   `json:"newsletter"`
		DataCollection     bool   `json:"data_collection"`
		PrivacyLevel       string `json:"privacy_level"`
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
