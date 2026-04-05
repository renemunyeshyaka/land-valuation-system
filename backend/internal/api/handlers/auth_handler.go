package handlers

import (
	"net/http"
	"time"

	"backend/internal/models"
	"backend/internal/services"
	"backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authService *services.AuthService
}

func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

// RegisterRequest represents user registration request
type RegisterRequest struct {
	Email     string `json:"email" binding:"required,email"`
	Password  string `json:"password" binding:"required,min=8"`
	FirstName string `json:"first_name" binding:"required"`
	LastName  string `json:"last_name" binding:"required"`
	Phone     string `json:"phone" binding:"required"`
	UserType  string `json:"user_type" binding:"required"`
}

// LoginRequest represents user login request
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// AuthResponse represents authentication response
type AuthResponse struct {
	User         *models.User `json:"user"`
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	ExpiresAt    time.Time    `json:"expires_at"`
}

// Register handles user registration
// @Summary Register a new user
// @Description Create a new user account with email and password
// @Tags auth
// @Accept json
// @Produce json
// @Param request body RegisterRequest true "Registration request"
// @Success 201 {object} gin.H{user_id:string,email:string,message:string}
// @Failure 400 {object} gin.H{error:string,details:string}
// @Router /auth/register [post]
func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	user, err := h.authService.Register(c.Request.Context(), &models.User{
		Email:     req.Email,
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Phone:     req.Phone,
		UserType:  req.UserType,
	}, req.Password)

	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Registration failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Registration successful. Please check your email for verification code", gin.H{
		"user_id": user.ID,
		"email":   user.Email,
		"message": "A 6-digit verification code has been sent to your email",
	})
}

// Login handles user login
// @Summary User login
// @Description Authenticate user and send OTP verification code
// @Tags auth
// @Accept json
// @Produce json
// @Param request body LoginRequest true "Login credentials"
// @Success 200 {object} gin.H{user_id:string,email:string,message:string}
// @Failure 400 {object} gin.H{error:string,details:string}
// @Failure 401 {object} gin.H{error:string,details:string}
// @Router /auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	user, err := h.authService.Login(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Login failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "OTP sent to your email", gin.H{
		"user_id": user.ID,
		"email":   user.Email,
		"message": "A 6-digit OTP has been sent to your email. It will expire in 5 minutes",
	})
}

// RefreshToken handles token refresh
// @Summary Refresh access token
// @Description Get a new access token using refresh token
// @Tags auth
// @Accept json
// @Produce json
// @Param request body RefreshRequest true "Refresh token request"
// @Success 200 {object} gin.H{access_token:string,refresh_token:string,expires_at:string}
// @Failure 400 {object} gin.H{error:string,details:string}
// @Failure 401 {object} gin.H{error:string,details:string}
// @Router /auth/refresh [post]
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	type RefreshRequest struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}

	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	accessToken, refreshToken, err := h.authService.RefreshToken(c.Request.Context(), req.RefreshToken)
	if err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Token refresh failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Token refreshed", gin.H{
		"access_token":  accessToken,
		"refresh_token": refreshToken,
		"expires_at":    time.Now().Add(24 * time.Hour),
	})
}

// Logout handles user logout
// @Summary User logout
// @Description Invalidate user session and tokens
// @Tags auth
// @Security BearerAuth
// @Produce json
// @Success 200 {object} gin.H{message:string}
// @Failure 401 {object} gin.H{error:string,details:string}
// @Failure 500 {object} gin.H{error:string,details:string}
// @Router /auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	userID := c.MustGet("user_id").(string)

	if err := h.authService.Logout(c.Request.Context(), userID); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Logout failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Logged out successfully", nil)
}

// VerifyEmail handles email verification
// @Summary Verify email address
// @Description Verify user email with 6-digit code sent via email
// @Tags auth
// @Accept json
// @Produce json
// @Param request body VerifyEmailRequest true "Email verification request"
// @Success 200 {object} gin.H{message:string}
// @Failure 400 {object} gin.H{error:string,details:string}
// @Router /auth/verify-email [post]
func (h *AuthHandler) VerifyEmail(c *gin.Context) {
	type VerifyEmailRequest struct {
		Email string `json:"email" binding:"required,email"`
		Code  string `json:"code" binding:"required,len=6"`
	}

	var req VerifyEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	if err := h.authService.VerifyEmail(c.Request.Context(), req.Email, req.Code); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Email verification failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Email verified successfully. You can now log in", nil)
}

// ResendActivationCode handles resending email verification code
// @Summary Resend email verification code
// @Description Send a new verification code to user email
// @Tags auth
// @Accept json
// @Produce json
// @Param request body ResendRequest true "Resend code request"
// @Success 200 {object} gin.H{message:string}
// @Failure 400 {object} gin.H{error:string,details:string}
// @Router /auth/resend-activation [post]
func (h *AuthHandler) ResendActivationCode(c *gin.Context) {
	type ResendRequest struct {
		Email string `json:"email" binding:"required,email"`
	}

	var req ResendRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	if err := h.authService.ResendActivationCode(c.Request.Context(), req.Email); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to resend activation code", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Verification code sent to your email", nil)
}

// VerifyOTP handles OTP verification after login
// @Summary Verify OTP for login
// @Description Verify OTP sent to email after login
// @Tags auth
// @Accept json
// @Produce json
// @Param request body VerifyOTPRequest true "OTP verification request"
// @Success 200 {object} AuthResponse
// @Failure 400 {object} gin.H{error:string,details:string}
// @Failure 401 {object} gin.H{error:string,details:string}
// @Router /auth/verify-otp [post]
func (h *AuthHandler) VerifyOTP(c *gin.Context) {
	type VerifyOTPRequest struct {
		Email string `json:"email" binding:"required,email"`
		Code  string `json:"code" binding:"required,len=6"`
	}

	var req VerifyOTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	user, accessToken, refreshToken, err := h.authService.VerifyOTP(c.Request.Context(), req.Email, req.Code)
	if err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, "OTP verification failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Login successful", &AuthResponse{
		User:         user,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    time.Now().Add(24 * time.Hour),
	})
}

// ResendOTP handles resending OTP code
// @Summary Resend OTP code
// @Description Send a new OTP code to user email
// @Tags auth
// @Accept json
// @Produce json
// @Param request body ResendOTPRequest true "Resend OTP request"
// @Success 200 {object} gin.H{message:string}
// @Failure 400 {object} gin.H{error:string,details:string}
// @Router /auth/resend-otp [post]
func (h *AuthHandler) ResendOTP(c *gin.Context) {
	type ResendOTPRequest struct {
		Email string `json:"email" binding:"required,email"`
	}

	var req ResendOTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	if err := h.authService.ResendOTP(c.Request.Context(), req.Email); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to resend OTP", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "New OTP sent to your email", nil)
}

// RequestPasswordReset handles password reset request
// @Summary Request password reset
// @Description Send password reset email
// @Tags auth
// @Accept json
// @Produce json
// @Param request body ForgotPasswordRequest true "Forgot password request"
// @Success 200 {object} gin.H{message:string}
// @Failure 400 {object} gin.H{error:string,details:string}
// @Router /auth/forgot-password [post]
func (h *AuthHandler) RequestPasswordReset(c *gin.Context) {
	type ForgotPasswordRequest struct {
		Email string `json:"email" binding:"required,email"`
	}

	var req ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	if err := h.authService.RequestPasswordReset(c.Request.Context(), req.Email); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Password reset request failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Password reset email sent", nil)
}

// ResetPassword handles password reset
// @Summary Reset user password
// @Description Reset password using token from reset email
// @Tags auth
// @Accept json
// @Produce json
// @Param request body ResetPasswordRequest true "Reset password request"
// @Success 200 {object} gin.H{message:string}
// @Failure 400 {object} gin.H{error:string,details:string}
// @Router /auth/reset-password [post]
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	type ResetPasswordRequest struct {
		Token       string `json:"token" binding:"required"`
		NewPassword string `json:"new_password" binding:"required,min=8"`
	}

	var req ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	if err := h.authService.ResetPassword(c.Request.Context(), req.Token, req.NewPassword); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Password reset failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Password reset successfully", nil)
}

// Enable2FA handles 2FA enablement
// @Summary Enable two-factor authentication
// @Description Generate TOTP secret for 2FA
// @Tags auth
// @Security BearerAuth
// @Produce json
// @Success 200 {object} gin.H{secret:string}
// @Failure 401 {object} gin.H{error:string,details:string}
// @Failure 500 {object} gin.H{error:string,details:string}
// @Router /auth/2fa/enable [post]
func (h *AuthHandler) Enable2FA(c *gin.Context) {
	userID := c.MustGet("user_id").(string)

	secret, err := h.authService.GenerateTwoFASecret(c.Request.Context(), userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "2FA enablement failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "2FA secret generated", gin.H{
		"secret": secret,
	})
}

// Verify2FA handles 2FA verification
// @Summary Verify two-factor authentication code
// @Description Verify TOTP code to enable 2FA
// @Tags auth
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param request body Verify2FARequest true "2FA verification request"
// @Success 200 {object} gin.H{message:string}
// @Failure 400 {object} gin.H{error:string,details:string}
// @Failure 401 {object} gin.H{error:string,details:string}
// @Router /auth/2fa/verify [post]
func (h *AuthHandler) Verify2FA(c *gin.Context) {
	type Verify2FARequest struct {
		Code string `json:"code" binding:"required"`
	}

	userID := c.MustGet("user_id").(string)

	var req Verify2FARequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	if err := h.authService.Verify2FA(c.Request.Context(), userID, req.Code); err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, "2FA verification failed", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "2FA enabled successfully", nil)
}
