package utils

import (
	"regexp"
	"strings"
)

// ValidateUPI validates Rwanda UPI format: x/xx/xx/xx/xxxx... (province/district/sector/cell/plot)
func ValidateUPI(upi string) bool {
	// Accepts: 1/01/01/01/1234 or 1/01/01/01/uuid-like
	pattern := `^\d{1}/\d{2}/\d{2}/\d{2}/[A-Za-z0-9\-]{4,}$`
	match, _ := regexp.MatchString(pattern, upi)
	return match
}

// RegexMatch returns true if the input matches the regex pattern
func RegexMatch(pattern, input string) (bool, error) {
	return regexp.MatchString(pattern, input)
}

// ValidateEmail validates email format
func ValidateEmail(email string) bool {
	pattern := `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
	match, _ := regexp.MatchString(pattern, email)
	return match
}

// ValidatePhoneNumber validates phone number format (Rwanda format)
// ValidatePhoneNumber validates phone number format (E.164 international format)
func ValidatePhoneNumber(phone string) bool {
	// Accept E.164 international numbers: +[country code][number], 8-15 digits
	pattern := `^\+[1-9]\d{7,14}$`
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
