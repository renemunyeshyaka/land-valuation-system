package main

import (
	"backend/internal/config"
	"backend/internal/database"
	"backend/internal/models"
	"crypto/rand"
	"encoding/base64"
	"flag"
	"fmt"
	"log"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func main() {
	clear := flag.Bool("clear", false, "Clear existing test data before seeding")
	flag.Parse()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	db, err := database.NewPostgresConnection(cfg)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	if *clear {
		log.Println("Clearing existing test data...")
		if err := clearTestData(db); err != nil {
			log.Fatalf("failed to clear test data: %v", err)
		}
	}

	log.Println("Starting database seeding...")

	// Seed users
	users, err := seedUsers(db)
	if err != nil {
		log.Fatalf("failed to seed users: %v", err)
	}
	log.Printf("✓ Seeded %d users\n", len(users))

	// Seed properties
	properties, err := seedProperties(db, users)
	if err != nil {
		log.Fatalf("failed to seed properties: %v", err)
	}
	log.Printf("✓ Seeded %d properties\n", len(properties))

	// LandParcel/UPI logic removed. Seeder now only seeds users and properties.

	// Verify gazette data
	var gazetteCount int64
	db.Unscoped().Model(&models.GazetteLandPrice{}).Count(&gazetteCount)
	log.Printf("✓ Gazette data: %d entries (from import)\n", gazetteCount)

	log.Println("\n✅ Database seeding completed successfully!")
	log.Println("\nTest Data Summary:")
	log.Printf("  Users: %d (across different subscription tiers)\n", len(users))
	log.Printf("  Properties: %d (across Kigali, Musanze, Huye)\n", len(properties))
	log.Printf("  Gazette Prices: %d entries\n", gazetteCount)
	if gazetteCount == 0 {
		log.Println("  Gazette note: import with `go run ./cmd/gazette_import/main.go -file <path-to-csv-or-json>`")
	}
}

// seedUsers creates test users with different subscription tiers
func seedUsers(db *gorm.DB) ([]models.User, error) {
	users := []models.User{
		{
			Email:              "landowner1@test.com",
			FullName:           "Alice Landowner",
			FirstName:          "Alice",
			LastName:           "Landowner",
			UserType:           "landowner",
			KYCStatus:          "verified",
			IsVerified:         true,
			IsActive:           true,
			LanguagePreference: "en",
			SubscriptionTier:   "professional",
		},
		{
			Email:            "investor1@test.com",
			FullName:         "Bob Investor",
			FirstName:        "Bob",
			LastName:         "Investor",
			UserType:         "individual",
			KYCStatus:        "verified",
			IsVerified:       true,
			IsActive:         true,
			SubscriptionTier: "professional",
		},
		{
			Email:            "diaspora@test.com",
			FullName:         "Carlos Diaspora",
			FirstName:        "Carlos",
			LastName:         "Diaspora",
			UserType:         "individual",
			IsDiaspora:       true,
			KYCStatus:        "submitted",
			IsVerified:       true,
			IsActive:         true,
			SubscriptionTier: "basic",
		},
		{
			Email:            "foreignbuyer@test.com",
			FullName:         "David Foreign",
			FirstName:        "David",
			LastName:         "Foreign",
			UserType:         "individual",
			KYCStatus:        "verified",
			IsVerified:       true,
			IsActive:         true,
			SubscriptionTier: "professional",
		},
		{
			Email:            "agent1@test.com",
			FullName:         "Emma Agent",
			FirstName:        "Emma",
			LastName:         "Agent",
			UserType:         "agent",
			KYCStatus:        "pending",
			IsVerified:       false,
			IsActive:         true,
			SubscriptionTier: "basic",
		},
		{
			Email:            "buyer1@test.com",
			FullName:         "Frank Buyer",
			FirstName:        "Frank",
			LastName:         "Buyer",
			UserType:         "individual",
			KYCStatus:        "pending",
			IsVerified:       false,
			IsActive:         true,
			SubscriptionTier: "free",
		},
		{
			Email:            "seller1@test.com",
			FullName:         "Grace Seller",
			FirstName:        "Grace",
			LastName:         "Seller",
			UserType:         "individual",
			KYCStatus:        "submitted",
			IsVerified:       true,
			IsActive:         true,
			SubscriptionTier: "basic",
		},
		{
			Email:            "buyer2@test.com",
			FullName:         "Henry Buyer2",
			FirstName:        "Henry",
			LastName:         "Buyer2",
			UserType:         "individual",
			KYCStatus:        "pending",
			IsVerified:       false,
			IsActive:         true,
			SubscriptionTier: "free",
		},
		{
			Email:            "investor2@test.com",
			FullName:         "Iris Investor2",
			FirstName:        "Iris",
			LastName:         "Investor2",
			UserType:         "individual",
			KYCStatus:        "verified",
			IsVerified:       true,
			IsActive:         true,
			SubscriptionTier: "professional",
		},
	}

	// Hash passwords and generate referral codes
	for i := range users {
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("TestPassword123!"), bcrypt.DefaultCost)
		users[i].PasswordHash = string(hashedPassword)
		users[i].Password = string(hashedPassword)
		users[i].CreatedAt = time.Now()
		users[i].UpdatedAt = time.Now()

		// Generate referral code
		users[i].ReferralCode = generateReferralCode()

		// Set subscription expiry
		if users[i].SubscriptionTier != "free" {
			users[i].SubscriptionExpiry = timePtr(time.Now().AddDate(1, 0, 0))
		}
	}

	// Bulk insert
	if result := db.CreateInBatches(users, 100); result.Error != nil {
		return nil, fmt.Errorf("failed to insert users: %w", result.Error)
	}

	// Get the admin user to use as owner
	var adminUser models.User
	if err := db.Where("user_type = ?", "admin").First(&adminUser).Error; err != nil {
		return nil, fmt.Errorf("failed to find admin user: %w", err)
	}

	// Add admin user to the beginning of the slice for property ownership
	users = append([]models.User{adminUser}, users...)

	return users, nil
}

// seedProperties creates 20 sample properties across 3 districts
func seedProperties(db *gorm.DB, users []models.User) ([]models.Property, error) {
	properties := []models.Property{}

	// District Sector Area sizes (sqm)
	locations := []struct {
		District     string
		Sector       string
		Cell         string
		Latitude     float64
		Longitude    float64
		LandSize     float64
		PropertyType string
		MinPrice     float64
		MaxPrice     float64
	}{
		// Kigali
		{"Kigali", "Gasabo", "Muhima", -1.9536, 30.0588, 500, "commercial", 100000000, 500000000},
		{"Kigali", "Gasabo", "Bumbogo", -1.9546, 30.0598, 1000, "residential", 50000000, 200000000},
		{"Kigali", "Nyarugenge", "Kanyinya", -1.9448, 30.0581, 300, "commercial", 80000000, 300000000},
		{"Kigali", "Nyarugenge", "Nyakabene", -1.9438, 30.0671, 1500, "residential", 45000000, 180000000},
		{"Kigali", "Kicukiro", "Kanombe", -1.9776, 30.0832, 2000, "agricultural", 25000000, 100000000},

		// Musanze (Ruhengeri)
		{"Musanze", "Musanze", "Kabare", -1.5092, 29.6307, 5000, "agricultural", 5000000, 20000000},
		{"Musanze", "Musanze", "Kabare", -1.5102, 29.6317, 3000, "residential", 3000000, 10000000},
		{"Musanze", "Muhoza", "Kigombe", -1.4992, 29.6507, 8000, "agricultural", 8000000, 30000000},
		{"Musanze", "Muhoza", "Kigombe", -1.5002, 29.6517, 2500, "residential", 2500000, 8000000},
		{"Musanze", "Gicumbi", "Sangano", -1.4392, 29.7007, 10000, "agricultural", 10000000, 35000000},

		// Huye
		{"Huye", "Huye", "Umubano", -2.5893, 29.7405, 4000, "agricultural", 4000000, 15000000},
		{"Huye", "Huye", "Umubano", -2.5903, 29.7415, 2000, "residential", 2000000, 7000000},
		{"Huye", "Nyabihu", "Ruhashyata", -2.6093, 29.7205, 6000, "agricultural", 6000000, 22000000},
		{"Huye", "Nyabihu", "Ruhashyata", -2.6103, 29.7215, 1500, "residential", 1500000, 5000000},
		{"Huye", "Gisagara", "Kabaziba", -2.6493, 29.5805, 7500, "agricultural", 7500000, 28000000},

		// Additional mixed locations
		{"Kigali", "Gasabo", "Bumbogo", -1.9556, 30.0608, 800, "residential", 60000000, 250000000},
		{"Musanze", "Musanze", "Kabare", -1.5112, 29.6327, 3500, "agricultural", 3500000, 12000000},
		{"Huye", "Huye", "Umubano", -2.5913, 29.7425, 2500, "residential", 2500000, 9000000},
		{"Kigali", "Kicukiro", "Kanombe", -1.9786, 30.0842, 2500, "mixed", 50000000, 200000000},
		{"Musanze", "Muhoza", "Kigombe", -1.5012, 29.6527, 5500, "agricultural", 5500000, 20000000},
	}

	// Create properties
	for i, loc := range locations {
		// Alternate owners from seed users (skip admin)
		ownerIdx := (i % (len(users) - 1)) + 1 // Start from index 1 (skip admin)

		price := loc.MinPrice + (loc.MaxPrice-loc.MinPrice)/2 // Mid-range price
		// Generate unique UPI for each property
		upi := fmt.Sprintf("%s-%s-%d", loc.District, loc.Sector, i)

		// Assign a unique Picsum Photos image URL (always available)
		imageURL := fmt.Sprintf("https://picsum.photos/seed/property%d/600/400", i)

		property := models.Property{
			OwnerID:      users[ownerIdx].ID,
			Title:        fmt.Sprintf("Property in %s, %s", loc.Sector, loc.District),
			Description:  fmt.Sprintf("Sample property in %s sector of %s", loc.Sector, loc.District),
			PropertyType: loc.PropertyType,
			Status:       "available",
			Address:      fmt.Sprintf("%s, %s, Rwanda", loc.Sector, loc.District),
			Latitude:     loc.Latitude,
			Longitude:    loc.Longitude,
			LandSize:     loc.LandSize,
			Price:        price,
			Currency:     "RWF",
			UPI:          upi,
			IsVerified:   i%3 == 0, // Verify some properties
			IsDiaspora:   i%5 == 0, // Mark some as diaspora properties
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
			Images:       []string{imageURL},
			District:     loc.District,
			Sector:       loc.Sector,
		}

		properties = append(properties, property)
	}

	// Bulk insert
	if result := db.CreateInBatches(properties, 100); result.Error != nil {
		return nil, fmt.Errorf("failed to insert properties: %w", result.Error)
	}

	return properties, nil
}

// clearTestData removes existing test data (optional)
func clearTestData(db *gorm.DB) error {
	// Delete test properties first (those matching test districts/sectors) - hard delete
	// Properties have foreign key references to users, so must delete properties first
	if err := db.Unscoped().Where("district IN ?", []string{"Kigali", "Musanze", "Huye"}).
		Delete(&models.Property{}).Error; err != nil {
		return fmt.Errorf("failed to delete test properties: %w", err)
	}

	// LandParcel deletion removed (model deleted)

	// Then delete test users (not admin in production) - hard delete to bypass unique constraint
	testEmails := []string{
		"landowner1@test.com", "investor1@test.com", "diaspora@test.com",
		"foreignbuyer@test.com", "agent1@test.com", "buyer1@test.com",
		"seller1@test.com", "buyer2@test.com", "investor2@test.com",
	}

	if err := db.Unscoped().Where("email IN ?", testEmails).Delete(&models.User{}).Error; err != nil {
		return fmt.Errorf("failed to delete test users: %w", err)
	}

	return nil
}

// Helper functions
func timePtr(t time.Time) *time.Time {
	return &t
}

func generateReferralCode() string {
	b := make([]byte, 16)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)[:16]
}
