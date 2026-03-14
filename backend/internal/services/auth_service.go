package services

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"os"
	"time"

	"backend/internal/models"
	"backend/internal/repository"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthService struct {
	userRepo     *repository.UserRepository
	emailService *EmailService
	db           *gorm.DB
	jwtSecret    string
}

func NewAuthService(db *gorm.DB) *AuthService {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "your-secret-key" // Match middleware default
	}

	return &AuthService{
		userRepo:     repository.NewUserRepository(db),
		emailService: NewEmailService(),
		db:           db,
		jwtSecret:    secret,
	}
}

// Register creates a new user account and sends email verification
func (s *AuthService) Register(ctx context.Context, user *models.User, password string) (*models.User, error) {
	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user.PasswordHash = string(hashedPassword)
	user.Password = string(hashedPassword)
	user.IsActive = true
	user.IsVerified = false
	user.EmailVerified = false
	user.KYCStatus = "pending"

	// Generate unique referral code for user
	referralCode := s.generateReferralCode(fmt.Sprintf("%d", time.Now().Unix()))
	user.ReferralCode = referralCode

	// Create user
	createdUser, err := s.userRepo.Create(ctx, user)
	if err != nil {
		return nil, err
	}

	// Generate email verification code
	verificationCode, err := GenerateOTP()
	if err != nil {
		return nil, err
	}

	// Set verification expiration (30 minutes)
	expiresAt := time.Now().Add(30 * time.Minute)
	err = s.userRepo.UpdateEmailVerification(ctx, fmt.Sprintf("%d", createdUser.ID), verificationCode, expiresAt)
	if err != nil {
		return nil, err
	}

	// Send verification email
	firstName := createdUser.FirstName
	if firstName == "" {
		firstName = "User"
	}
	err = s.emailService.SendActivationEmail(createdUser.Email, firstName, verificationCode)
	if err != nil {
		// Log error but don't fail registration
		fmt.Printf("Failed to send activation email: %v\n", err)
	}

	return createdUser, nil
}

// Login authenticates user and sends OTP for verification
func (s *AuthService) Login(ctx context.Context, email, password string) (*models.User, error) {
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	// Check if email is verified
	if !user.EmailVerified {
		return nil, errors.New("email not verified. Please check your email for verification code")
	}

	// Verify password
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	// Check if OTP is locked
	if user.OTPLockedUntil != nil && user.OTPLockedUntil.After(time.Now()) {
		remainingTime := time.Until(*user.OTPLockedUntil).Minutes()
		return nil, fmt.Errorf("too many failed attempts. Please try again in %.0f minutes", remainingTime)
	}

	// Check rate limiting (max 1 OTP per minute)
	if user.LastOTPSentAt != nil && time.Since(*user.LastOTPSentAt) < time.Minute {
		return nil, errors.New("please wait before requesting another OTP")
	}

	// Generate OTP
	otpCode, err := GenerateOTP()
	if err != nil {
		return nil, err
	}

	// Set OTP expiration (5 minutes)
	expiresAt := time.Now().Add(5 * time.Minute)
	err = s.userRepo.UpdateOTP(ctx, fmt.Sprintf("%d", user.ID), otpCode, expiresAt)
	if err != nil {
		return nil, err
	}

	// Send OTP email
	firstName := user.FirstName
	if firstName == "" {
		firstName = "User"
	}
	err = s.emailService.SendOTPEmail(user.Email, firstName, otpCode)
	if err != nil {
		// Log error but don't fail login
		fmt.Printf("Failed to send OTP email: %v\n", err)
	}

	return user, nil
}

// VerifyEmail verifies user email with activation code
func (s *AuthService) VerifyEmail(ctx context.Context, email, code string) error {
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return errors.New("user not found")
	}

	// Check if already verified
	if user.EmailVerified {
		return errors.New("email already verified")
	}

	// Check if code matches
	if user.EmailVerificationCode != code {
		return errors.New("invalid verification code")
	}

	// Check if code expired
	if user.EmailVerificationExpiresAt == nil || user.EmailVerificationExpiresAt.Before(time.Now()) {
		return errors.New("verification code expired. Please request a new one")
	}

	// Mark email as verified
	err = s.userRepo.VerifyEmail(ctx, fmt.Sprintf("%d", user.ID))
	if err != nil {
		return err
	}

	return nil
}

// ResendActivationCode resends email verification code
func (s *AuthService) ResendActivationCode(ctx context.Context, email string) error {
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return errors.New("user not found")
	}

	// Check if already verified
	if user.EmailVerified {
		return errors.New("email already verified")
	}

	// Generate new verification code
	verificationCode, err := GenerateOTP()
	if err != nil {
		return err
	}

	// Set verification expiration (30 minutes)
	expiresAt := time.Now().Add(30 * time.Minute)
	err = s.userRepo.UpdateEmailVerification(ctx, fmt.Sprintf("%d", user.ID), verificationCode, expiresAt)
	if err != nil {
		return err
	}

	// Send verification email
	firstName := user.FirstName
	if firstName == "" {
		firstName = "User"
	}
	err = s.emailService.SendActivationEmail(user.Email, firstName, verificationCode)
	if err != nil {
		return fmt.Errorf("failed to send email: %v", err)
	}

	return nil
}

// VerifyOTP verifies OTP code and returns tokens
func (s *AuthService) VerifyOTP(ctx context.Context, email, otpCode string) (*models.User, string, string, error) {
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return nil, "", "", errors.New("user not found")
	}

	// Check if OTP is locked
	if user.OTPLockedUntil != nil && user.OTPLockedUntil.After(time.Now()) {
		remainingTime := time.Until(*user.OTPLockedUntil).Minutes()
		return nil, "", "", fmt.Errorf("account locked. Try again in %.0f minutes", remainingTime)
	}

	// Check if OTP matches
	if user.OTPCode != otpCode {
		// Increment failed attempts
		s.userRepo.IncrementOTPAttempts(ctx, fmt.Sprintf("%d", user.ID))

		// Lock account after 5 failed attempts
		if user.OTPAttempts >= 4 { // Will become 5 after increment
			lockedUntil := time.Now().Add(15 * time.Minute)
			s.userRepo.LockOTPVerification(ctx, fmt.Sprintf("%d", user.ID), lockedUntil)
			return nil, "", "", errors.New("too many failed attempts. Account locked for 15 minutes")
		}

		return nil, "", "", errors.New("invalid OTP code")
	}

	// Check if OTP expired
	if user.OTPExpiresAt == nil || user.OTPExpiresAt.Before(time.Now()) {
		return nil, "", "", errors.New("OTP expired. Please request a new one")
	}

	// OTP verified successfully - reset attempts and clear OTP
	err = s.userRepo.ResetOTPAttempts(ctx, fmt.Sprintf("%d", user.ID))
	if err != nil {
		return nil, "", "", err
	}

	// Update last login
	s.userRepo.UpdateLastLogin(ctx, fmt.Sprintf("%d", user.ID))

	// Generate tokens
	accessToken, err := s.generateAccessToken(user)
	if err != nil {
		return nil, "", "", err
	}

	refreshToken, err := s.generateRefreshToken(user)
	if err != nil {
		return nil, "", "", err
	}

	return user, accessToken, refreshToken, nil
}

// ResendOTP resends OTP code
func (s *AuthService) ResendOTP(ctx context.Context, email string) error {
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return errors.New("user not found")
	}

	// Check if email is verified
	if !user.EmailVerified {
		return errors.New("email not verified")
	}

	// Check if OTP is locked
	if user.OTPLockedUntil != nil && user.OTPLockedUntil.After(time.Now()) {
		remainingTime := time.Until(*user.OTPLockedUntil).Minutes()
		return fmt.Errorf("account locked. Try again in %.0f minutes", remainingTime)
	}

	// Check rate limiting (max 1 OTP per minute)
	if user.LastOTPSentAt != nil && time.Since(*user.LastOTPSentAt) < time.Minute {
		return errors.New("please wait before requesting another OTP")
	}

	// Generate new OTP
	otpCode, err := GenerateOTP()
	if err != nil {
		return err
	}

	// Set OTP expiration (5 minutes)
	expiresAt := time.Now().Add(5 * time.Minute)
	err = s.userRepo.UpdateOTP(ctx, fmt.Sprintf("%d", user.ID), otpCode, expiresAt)
	if err != nil {
		return err
	}

	// Send OTP email
	firstName := user.FirstName
	if firstName == "" {
		firstName = "User"
	}
	err = s.emailService.SendOTPEmail(user.Email, firstName, otpCode)
	if err != nil {
		return fmt.Errorf("failed to send email: %v", err)
	}

	return nil
}

// RefreshToken generates new access token using refresh token
func (s *AuthService) RefreshToken(ctx context.Context, refreshToken string) (string, string, error) {
	// Parse refresh token
	token, err := jwt.Parse(refreshToken, func(token *jwt.Token) (interface{}, error) {
		return []byte(s.jwtSecret), nil
	})

	if err != nil || !token.Valid {
		return "", "", errors.New("invalid refresh token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", "", errors.New("invalid token claims")
	}

	userID, ok := claims["user_id"].(string)
	if !ok {
		return "", "", errors.New("user id not found")
	}

	// Get user
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return "", "", err
	}

	// Generate new tokens
	accessToken, err := s.generateAccessToken(user)
	if err != nil {
		return "", "", err
	}

	newRefreshToken, err := s.generateRefreshToken(user)
	if err != nil {
		return "", "", err
	}

	return accessToken, newRefreshToken, nil
}

// Logout invalidates user session
func (s *AuthService) Logout(ctx context.Context, userID string) error {
	// TODO: Implement session invalidation using Redis
	return nil
}

// RequestPasswordReset sends password reset email
func (s *AuthService) RequestPasswordReset(ctx context.Context, email string) error {
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		// Don't reveal if email exists
		return nil
	}

	// Generate secure reset token
	token, err := generateSecureToken(32)
	if err != nil {
		return nil // Don't reveal error
	}
	expiresAt := time.Now().Add(1 * time.Hour)

	// Store token and expiry
	err = s.userRepo.UpdatePasswordResetToken(ctx, fmt.Sprintf("%d", user.ID), token, expiresAt)
	if err != nil {
		return nil // Don't reveal error
	}

	// Send password reset email
	firstName := user.FirstName
	if firstName == "" {
		firstName = "User"
	}
	_ = s.emailService.SendPasswordResetEmail(user.Email, firstName, token)
	// Always return nil to avoid leaking info
	return nil
}

// generateSecureToken creates a secure random string of the given length
func generateSecureToken(length int) (string, error) {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		if err != nil {
			return "", err
		}
		b[i] = charset[n.Int64()]
	}
	return string(b), nil
}

// ResetPassword resets user password
func (s *AuthService) ResetPassword(ctx context.Context, token, newPassword string) error {
	// Find user by reset token
	user, err := s.userRepo.GetByPasswordResetToken(ctx, token)
	if err != nil || user == nil {
		return errors.New("invalid or expired token")
	}
	// Check expiry
	if user.PasswordResetExpiresAt == nil || user.PasswordResetExpiresAt.Before(time.Now()) {
		return errors.New("token expired")
	}
	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return errors.New("failed to hash password")
	}
	// Update password and clear reset token
	err = s.userRepo.UpdatePassword(ctx, fmt.Sprintf("%d", user.ID), string(hashedPassword))
	if err != nil {
		return errors.New("failed to update password")
	}
	// Clear reset token fields
	_ = s.userRepo.UpdatePasswordResetToken(ctx, fmt.Sprintf("%d", user.ID), "", nil)
	return nil
}

// GenerateTwoFASecret generates 2FA secret
func (s *AuthService) GenerateTwoFASecret(ctx context.Context, userID string) (string, error) {
	// TODO: Generate TOTP secret using go.uber.org/multierr or otp package
	return "", nil
}

// Verify2FA verifies 2FA code
func (s *AuthService) Verify2FA(ctx context.Context, userID, code string) error {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return err
	}

	// TODO: Verify TOTP code against secret
	_ = user
	_ = code

	// Enable 2FA if correct
	return s.userRepo.UpdateTwoFAStatus(ctx, userID, true, user.TwoFASecret)
}

// Helper functions
func (s *AuthService) generateAccessToken(user *models.User) (string, error) {
	claims := jwt.MapClaims{
		"user_id":   fmt.Sprintf("%d", user.ID),
		"email":     user.Email,
		"user_type": user.UserType,
		"exp":       time.Now().Add(24 * time.Hour).Unix(),
		"iat":       time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}

func (s *AuthService) generateRefreshToken(user *models.User) (string, error) {
	claims := jwt.MapClaims{
		"user_id": fmt.Sprintf("%d", user.ID),
		"exp":     time.Now().Add(30 * 24 * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}

// generateReferralCode creates a unique referral code for a user
func (s *AuthService) generateReferralCode(seed string) string {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	code := make([]byte, 8)

	for i := 0; i < len(code); i++ {
		max := big.NewInt(int64(len(charset)))
		n, err := rand.Int(rand.Reader, max)
		if err != nil {
			// Fallback if random fails
			code[i] = charset[(int(time.Now().UnixNano())+i)%len(charset)]
		} else {
			code[i] = charset[n.Int64()]
		}
	}

	return string(code)
}
