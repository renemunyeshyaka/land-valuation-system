package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"backend/internal/models"
	"backend/internal/repository"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	userRepo *repository.UserRepository
	db       *sqlx.DB
}

func NewAuthService(db *sqlx.DB) *AuthService {
	return &AuthService{
		userRepo: repository.NewUserRepository(db),
		db:       db,
	}
}

// Register creates a new user account
func (s *AuthService) Register(ctx context.Context, user *models.User, password string) (*models.User, string, string, error) {
	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, "", "", err
	}

	user.PasswordHash = string(hashedPassword)
	user.IsActive = true
	user.IsVerified = false
	user.KYCStatus = "pending"

	// Create user
	createdUser, err := s.userRepo.Create(ctx, user)
	if err != nil {
		return nil, "", "", err
	}

	// Generate tokens
	accessToken, err := s.generateAccessToken(createdUser)
	if err != nil {
		return nil, "", "", err
	}

	refreshToken, err := s.generateRefreshToken(createdUser)
	if err != nil {
		return nil, "", "", err
	}

	return createdUser, accessToken, refreshToken, nil
}

// Login authenticates user and returns tokens
func (s *AuthService) Login(ctx context.Context, email, password string) (*models.User, string, string, error) {
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return nil, "", "", errors.New("invalid credentials")
	}

	// Verify password
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		return nil, "", "", errors.New("invalid credentials")
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

// RefreshToken generates new access token using refresh token
func (s *AuthService) RefreshToken(ctx context.Context, refreshToken string) (string, string, error) {
	// Parse refresh token
	token, err := jwt.Parse(refreshToken, func(token *jwt.Token) (interface{}, error) {
		// TODO: Get secret from config
		return []byte("your-refresh-secret"), nil
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

// VerifyEmail verifies user email with token
func (s *AuthService) VerifyEmail(ctx context.Context, token string) error {
	user, err := s.userRepo.GetByVerificationToken(ctx, token)
	if err != nil {
		return errors.New("invalid verification token")
	}

	if user.VerificationExpiresAt.Before(time.Now()) {
		return errors.New("verification token expired")
	}

	// TODO: Update user verified status

	return nil
}

// RequestPasswordReset sends password reset email
func (s *AuthService) RequestPasswordReset(ctx context.Context, email string) error {
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		// Don't reveal if email exists
		return nil
	}

	// TODO: Generate reset token and send email
	_ = user
	return nil
}

// ResetPassword resets user password
func (s *AuthService) ResetPassword(ctx context.Context, token, newPassword string) error {
	// TODO: Verify token and reset password
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
		"user_id":   user.ID,
		"email":     user.Email,
		"user_type": user.UserType,
		"exp":       time.Now().Add(24 * time.Hour).Unix(),
		"iat":       time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	// TODO: Get secret from config
	return token.SignedString([]byte("your-secret-key"))
}

func (s *AuthService) generateRefreshToken(user *models.User) (string, error) {
	claims := jwt.MapClaims{
		"user_id": user.ID,
		"exp":     time.Now().Add(30 * 24 * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	// TODO: Get secret from config
	return token.SignedString([]byte("your-refresh-secret"))
}
