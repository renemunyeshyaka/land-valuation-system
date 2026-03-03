package models

import (
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type User struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Personal Information
	Email      string `gorm:"uniqueIndex;not null;size:255" json:"email"`
	Phone      string `gorm:"size:20;index" json:"phone"`
	Password   string `gorm:"not null" json:"-"`
	FirstName  string `gorm:"size:100" json:"first_name"`
	LastName   string `gorm:"size:100" json:"last_name"`
	NationalID string `gorm:"size:16;index" json:"national_id"`

	// Account Type
	UserType   string `gorm:"size:50;default:individual" json:"user_type"` // individual, agent, corporate, government, admin
	IsVerified bool   `gorm:"default:false" json:"is_verified"`
	IsDiaspora bool   `gorm:"default:false" json:"is_diaspora"`

	// Subscription
	SubscriptionTier   string     `gorm:"size:50;default:free" json:"subscription_tier"` // free, basic, professional, ultimate
	SubscriptionExpiry *time.Time `json:"subscription_expiry,omitempty"`

	// Profile
	ProfileImage    string `gorm:"size:255" json:"profile_image"`
	CompanyName     string `gorm:"size:255" json:"company_name,omitempty"`
	BusinessLicense string `gorm:"size:255" json:"business_license,omitempty"`

	// Preferences
	PreferredLanguage string `gorm:"size:10;default:en" json:"preferred_language"`
	NotificationEmail bool   `gorm:"default:true" json:"notification_email"`
	NotificationSMS   bool   `gorm:"default:false" json:"notification_sms"`

	// Security
	LastLogin        *time.Time `json:"last_login,omitempty"`
	LoginAttempts    int        `gorm:"default:0" json:"-"`
	LockedUntil      *time.Time `json:"-"`
	TwoFactorEnabled bool       `gorm:"default:false" json:"two_factor_enabled"`
	TwoFactorSecret  string     `json:"-"`
	TwoFASecret      string     `gorm:"column:two_fa_secret" json:"two_fa_secret"`

	// Email Verification & MFA
	EmailVerified              bool       `gorm:"default:false" json:"email_verified"`
	EmailVerificationCode      string     `gorm:"size:6" json:"-"`
	EmailVerificationExpiresAt *time.Time `json:"-"`
	OTPCode                    string     `gorm:"size:6" json:"-"`
	OTPExpiresAt               *time.Time `json:"-"`
	OTPAttempts                int        `gorm:"default:0" json:"-"`
	OTPLockedUntil             *time.Time `json:"-"`
	LastOTPSentAt              *time.Time `json:"-"`

	// Relationships
	Properties      []Property `gorm:"foreignKey:OwnerID;references:ID" json:"properties,omitempty"`
	SavedProperties []Property `gorm:"many2many:user_saved_properties;" json:"saved_properties,omitempty"`

	// Fields required by repository
	PasswordHash          string     `gorm:"size:255" json:"password_hash"`
	KYCStatus             string     `gorm:"size:50" json:"kyc_status"`
	IsActive              bool       `gorm:"default:true" json:"is_active"`
	FullName              string     `gorm:"size:200" json:"full_name"`
	TwoFAEnabled          bool       `gorm:"default:false" json:"two_fa_enabled"`
	LanguagePreference    string     `gorm:"size:10;default:en" json:"language_preference"`
	ProfilePictureURL     string     `gorm:"size:255" json:"profile_picture_url"`
	Bio                   string     `gorm:"size:500" json:"bio"`
	City                  string     `gorm:"size:100" json:"city"`
	Country               string     `gorm:"size:100" json:"country"`
	VerificationToken     string     `gorm:"size:255" json:"verification_token"`
	VerificationExpiresAt *time.Time `json:"verification_expires_at,omitempty"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		u.Password = string(hashedPassword)
	}
	return nil
}

func (u *User) CheckPassword(password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password))
	return err == nil
}

func (u *User) CanPerformAction(action string) bool {
	// Define permissions based on subscription tier
	permissions := map[string][]string{
		"free": {
			"view_properties",
			"basic_valuation",
			"save_properties",
		},
		"basic": {
			"view_properties",
			"full_valuation",
			"save_properties",
			"price_alerts",
			"contact_owners",
		},
		"professional": {
			"view_properties",
			"full_valuation",
			"save_properties",
			"price_alerts",
			"contact_owners",
			"api_access",
			"priority_listing",
			"advanced_analytics",
			"bulk_valuation",
		},
		"ultimate": {
			"view_properties",
			"full_valuation",
			"save_properties",
			"price_alerts",
			"contact_owners",
			"api_access",
			"priority_listing",
			"advanced_analytics",
			"bulk_valuation",
			"white_label",
			"dedicated_manager",
			"market_insights",
		},
	}

	allowed, exists := permissions[u.SubscriptionTier]
	if !exists {
		return false
	}

	for _, a := range allowed {
		if a == action {
			return true
		}
	}
	return false
}
