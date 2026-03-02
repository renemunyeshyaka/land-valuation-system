package utils

import (
	"regexp"
	"strings"
)

// ValidateEmail validates email format
func ValidateEmail(email string) bool {
	pattern := `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
	match, _ := regexp.MatchString(pattern, email)
	return match
}

// ValidatePhoneNumber validates phone number format (Rwanda format)
func ValidatePhoneNumber(phone string) bool {
	// Accept Rwandan phone numbers: +250XXXXXXXXX or 0XXXXXXXXX
	pattern := `^(\+250|0)[1-9]\d{8}$`
	match, _ := regexp.MatchString(pattern, phone)
	return match
}

// ValidatePassword validates password strength
func ValidatePassword(password string, requireUppercase, requireNumbers, requireSpecial bool) bool {
	if len(password) < 8 {
		return false
	}

	if requireUppercase && !strings.ContainsAny(password, "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
		return false
	}

	if requireNumbers && !strings.ContainsAny(password, "0123456789") {
		return false
	}

	if requireSpecial && !strings.ContainsAny(password, "!@#$%^&*()-_=+[]{}|;:,.<>?") {
		return false
	}

	return true
}

// ValidateNationalID validates Rwanda national ID format
func ValidateNationalID(id string) bool {
	// Rwanda ID format: 1XXXXXXXXXXXXX (16 digits)
	pattern := `^\d{16}$`
	match, _ := regexp.MatchString(pattern, id)
	return match
}

// ValidateURL validates URL format
func ValidateURL(url string) bool {
	pattern := `^https?://[^\s$.?#].[^\s]*$`
	match, _ := regexp.MatchString(pattern, url)
	return match
}

// ValidatePropertyType validates property type
func ValidatePropertyType(ptype string) bool {
	validTypes := []string{"residential", "commercial", "agricultural", "mixed"}
	for _, t := range validTypes {
		if t == ptype {
			return true
		}
	}
	return false
}

// ValidateSubscriptionPlan validates subscription plan
func ValidateSubscriptionPlan(plan string) bool {
	validPlans := []string{"free", "basic", "professional", "ultimate"}
	for _, p := range validPlans {
		if p == plan {
			return true
		}
	}
	return false
}

// ValidatePaymentMethod validates payment method
func ValidatePaymentMethod(method string) bool {
	validMethods := []string{"card", "mobile_money", "bank_transfer"}
	for _, m := range validMethods {
		if m == method {
			return true
		}
	}
	return false
}

// SanitizeInput removes dangerous characters from input
func SanitizeInput(input string) string {
	// Remove SQL injection attempts and XSS vectors
	dangerous := []string{"'", "\"", ";", "--", "/*", "*/", "<", ">", "&", "|"}
	result := input
	for _, char := range dangerous {
		result = strings.ReplaceAll(result, char, "")
	}
	return result
}
