package main

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"time"

	"backend/internal/config"
	"backend/internal/database"
	"backend/internal/models"
	"backend/internal/services"

	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var db *gorm.DB

func init() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Load config
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Initialize database
	db, err = database.NewPostgresConnection(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Run migrations
	if err := database.AutoMigrate(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	if err := database.RunSQLMigrations(db); err != nil {
		log.Fatalf("Failed to run SQL migrations: %v", err)
	}
}

func main() {
	fmt.Println("🌱 Starting Land Valuation System Seed Data...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Clear existing data (optional - comment out if you want to preserve data)
	// clearData()

	// Seed data
	seedAdminUser(ctx)
	seedRegularUsers(ctx)
	seedSubscriptionPlans(ctx)
	seedDistrictCoefficients(ctx)

	fmt.Println("✅ Seed data completed successfully!")
}

// clearData clears all data from tables
func clearData() {
	fmt.Println("🗑️ Clearing existing data...")
	db.Exec("TRUNCATE TABLE public.user_saved_properties CASCADE")
	db.Exec("TRUNCATE TABLE public.valuations CASCADE")
	db.Exec("TRUNCATE TABLE public.notifications CASCADE")
	db.Exec("TRUNCATE TABLE public.transactions CASCADE")
	db.Exec("TRUNCATE TABLE public.subscriptions CASCADE")
	db.Exec("TRUNCATE TABLE public.properties CASCADE")
	db.Exec("TRUNCATE TABLE public.users CASCADE")
	fmt.Println("✅ Data cleared")
}

// seedAdminUser creates an admin user
func seedAdminUser(ctx context.Context) {
	fmt.Println("👤 Creating admin user...")

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("admin123456"), bcrypt.DefaultCost)

	adminUser := models.User{
		// Email:            "admin@landvaluation.rw", // removed as requested
		FirstName:        "Admin",
		LastName:         "User",
		UserType:         "admin",
		IsVerified:       true,
		EmailVerified:    true,
		IsActive:         true,
		Password:         string(hashedPassword),
		SubscriptionTier: "ultimate",
		TwoFAEnabled:     false,
	}

	result := db.WithContext(ctx).Create(&adminUser)
	if result.Error != nil {
		log.Printf("Warning: Could not create admin user: %v", result.Error)
		return
	}

	// Generate referral code for admin
	referralService := services.NewReferralService(db)
	referralService.GenerateReferralCode(ctx, adminUser.ID)

	fmt.Printf("✅ Admin user created: ID=%d, Email=%s\n", adminUser.ID, adminUser.Email)
}

// seedRegularUsers creates sample regular users
func seedRegularUsers(ctx context.Context) {
	fmt.Println("👥 Creating sample users...")

	users := []models.User{
		{
			Email:            "john.doe@gmail.com",
			FirstName:        "John",
			LastName:         "Doe",
			Phone:            "+250788123456",
			NationalID:       "1201234567890",
			UserType:         "individual",
			IsVerified:       true,
			IsDiaspora:       false,
			EmailVerified:    true,
			IsActive:         true,
			SubscriptionTier: "free",
			Password:         "password123456",
		},
		{
			Email:              "jane.smith@gmail.com",
			FirstName:          "Jane",
			LastName:           "Smith",
			Phone:              "+250789654321",
			NationalID:         "1209876543210",
			UserType:           "individual",
			IsVerified:         true,
			IsDiaspora:         true,
			EmailVerified:      true,
			IsActive:           true,
			SubscriptionTier:   "premium",
			Password:           "password123456",
			SubscriptionExpiry: timePtr(time.Now().AddDate(0, 1, 0)),
		},
		{
			Email:              "real.estate@agent.com",
			FirstName:          "Peter",
			LastName:           "Agent",
			Phone:              "+250787456789",
			NationalID:         "1203456789012",
			UserType:           "agent",
			IsVerified:         true,
			IsDiaspora:         false,
			EmailVerified:      true,
			IsActive:           true,
			CompanyName:        "Premier Real Estate",
			SubscriptionTier:   "professional",
			Password:           "password123456",
			SubscriptionExpiry: timePtr(time.Now().AddDate(0, 3, 0)),
		},
		{
			Email:              "corp@company.rw",
			FirstName:          "Corporate",
			LastName:           "Entity",
			Phone:              "+250790000000",
			NationalID:         "9999999999999",
			UserType:           "corporate",
			IsVerified:         true,
			IsDiaspora:         false,
			EmailVerified:      true,
			IsActive:           true,
			CompanyName:        "Real Estate Corp Ltd",
			SubscriptionTier:   "ultimate",
			Password:           "password123456",
			SubscriptionExpiry: timePtr(time.Now().AddDate(1, 0, 0)),
		},
		{
			Email:              "government@rda.gov.rw",
			FirstName:          "Government",
			LastName:           "Official",
			Phone:              "+250791111111",
			NationalID:         "1111111111111",
			UserType:           "government",
			IsVerified:         true,
			IsDiaspora:         false,
			EmailVerified:      true,
			IsActive:           true,
			SubscriptionTier:   "professional",
			Password:           "password123456",
			SubscriptionExpiry: timePtr(time.Now().AddDate(0, 6, 0)),
		},
	}

	referralService := services.NewReferralService(db)

	for _, user := range users {
		// Hash password before saving
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
		user.Password = string(hashedPassword)

		result := db.WithContext(ctx).Create(&user)
		if result.Error != nil {
			log.Printf("Warning: Could not create user %s: %v", user.Email, result.Error)
			continue
		}

		// Generate referral code
		code, _ := referralService.GenerateReferralCode(ctx, user.ID)
		fmt.Printf("✅ User created: ID=%d, Email=%s, ReferralCode=%s\n", user.ID, user.Email, code)

		// Create subscription if not free tier
		if user.SubscriptionTier != "free" && user.SubscriptionExpiry != nil {
			subscription := models.Subscription{
				UserID:    user.ID,
				PlanType:  user.SubscriptionTier,
				StartDate: time.Now(),
				EndDate:   *user.SubscriptionExpiry,
				Status:    "active",
				AutoRenew: true,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}
			db.WithContext(ctx).Create(&subscription)
		}
	}

	fmt.Printf("✅ Created %d sample users\n", len(users))
}

// seedSubscriptionPlans creates subscription plan options
func seedSubscriptionPlans(ctx context.Context) {
	fmt.Println("💳 Creating subscription plans...")

	plans := []models.Subscription{
		// These are examples - your actual subscription model might differ
		// Adjust based on your Subscription model structure
	}

	_ = plans // For now, subscription tier names are hardcoded in User model
	fmt.Println("✅ Subscription plans configured")
}

// seedDistrictCoefficients creates sample official gazette coefficients
func seedDistrictCoefficients(ctx context.Context) {
	fmt.Println("📊 Creating Official Gazette coefficients...")

	// Sample data - these should come from official gazette
	// Create a simple in-memory representation
	coefficients := map[string]map[string]float64{
		"Kigali": {
			"Kiyovu":     1.5,
			"Remera":     1.3,
			"Nyarugenge": 1.2,
			"Kimironko":  1.4,
			"Muhima":     1.35,
			"Gacuriro":   1.25,
		},
		"Bugesera": {
			"Default": 0.8,
		},
		"Gasabo": {
			"Default": 1.1,
		},
	}

	fmt.Println("✅ Gazette coefficients ready:")
	for district, sectors := range coefficients {
		for sector, coeff := range sectors {
			fmt.Printf("   %s - %s: %.2f\n", district, sector, coeff)
		}
	}
}

// Helper function to create time pointer
func timePtr(t time.Time) *time.Time {
	return &t
}

// Helper function to seed with rand int
func randInt(min, max int) int {
	return min + rand.Intn(max-min)
}
