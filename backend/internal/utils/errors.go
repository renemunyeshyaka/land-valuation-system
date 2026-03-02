package utils

import (
	"errors"
	"fmt"
)

// AppError represents application custom errors
type AppError struct {
	Code    string
	Message string
	Details error
}

func (e *AppError) Error() string {
	if e.Details != nil {
		return fmt.Sprintf("%s: %s - %v", e.Code, e.Message, e.Details)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

// Common error codes
var (
	ErrUnauthorized     = errors.New("unauthorized")
	ErrForbidden        = errors.New("forbidden")
	ErrNotFound         = errors.New("not found")
	ErrConflict         = errors.New("conflict")
	ErrInvalidInput     = errors.New("invalid input")
	ErrInternalServer   = errors.New("internal server error")
	ErrDatabaseError    = errors.New("database error")
	ErrExternalAPI      = errors.New("external API error")
	ErrPaymentFailed    = errors.New("payment processing failed")
	ErrAuthReloadFailed = errors.New("authentication reload failed")
)

// NewAppError creates a new AppError
func NewAppError(code string, message string, details error) *AppError {
	return &AppError{
		Code:    code,
		Message: message,
		Details: details,
	}
}

// IsUnauthorized checks if error is unauthorized
func IsUnauthorized(err error) bool {
	return errors.Is(err, ErrUnauthorized)
}

// IsNotFound checks if error is not found
func IsNotFound(err error) bool {
	return errors.Is(err, ErrNotFound)
}

// IsBadRequest checks if error is bad request
func IsBadRequest(err error) bool {
	return errors.Is(err, ErrInvalidInput)
}
