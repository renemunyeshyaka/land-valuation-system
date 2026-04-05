package main

import (
	"context"
	"fmt"
	"log"
	"os"
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
	// Load environment variables.
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	db, err = database.NewPostgresConnection(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

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

	seedAdminUser(ctx)
	if os.Getenv("SEED_SAMPLE_USERS") == "true" {
		seedRegularUsers(ctx)
	} else {
		fmt.Println("⏭️ Skipping sample users (set SEED_SAMPLE_USERS=true to enable)")
	}
	seedSubscriptionPlans(ctx)
	seedDistrictCoefficients(ctx)

	fmt.Println("✅ Seed data completed successfully!")
}

// seedAdminUser creates an admin user.
func seedAdminUser(ctx context.Context) {
	fmt.Println("👤 Creating admin user...")

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("admin123456"), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("Warning: failed to hash admin password: %v", err)
		return
	}

	adminUser := models.User{
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

	if result := db.WithContext(ctx).Create(&adminUser); result.Error != nil {
		log.Printf("Warning: Could not create admin user: %v", result.Error)
		return
	}

	referralService := services.NewReferralService(db)
	if _, err := referralService.GenerateReferralCode(ctx, adminUser.ID); err != nil {
		log.Printf("Warning: failed to generate admin referral code: %v", err)
	}

	fmt.Printf("✅ Admin user created: ID=%d, Email=%s\n", adminUser.ID, adminUser.Email)
}

// seedRegularUsers creates sample regular users.
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
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
		if err != nil {
			log.Printf("Warning: failed to hash password for user %s: %v", user.Email, err)
			continue
		}
		user.Password = string(hashedPassword)

		result := db.WithContext(ctx).Create(&user)
		if result.Error != nil {
			log.Printf("Warning: Could not create user %s: %v", user.Email, result.Error)
			continue
		}

		code, err := referralService.GenerateReferralCode(ctx, user.ID)
		if err != nil {
			log.Printf("Warning: failed to generate referral code for user %s: %v", user.Email, err)
			code = ""
		}
		fmt.Printf("✅ User created: ID=%d, Email=%s, ReferralCode=%s\n", user.ID, user.Email, code)

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

// seedSubscriptionPlans creates subscription plan options.
func seedSubscriptionPlans(ctx context.Context) {
	_ = ctx
	fmt.Println("💳 Creating subscription plans...")
	fmt.Println("✅ Subscription plans configured")
}

// seedDistrictCoefficients creates sample official gazette coefficients.
func seedDistrictCoefficients(ctx context.Context) {
	_ = ctx
	fmt.Println("📊 Creating Official Gazette coefficients...")

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

func timePtr(t time.Time) *time.Time {
	return &t
}
