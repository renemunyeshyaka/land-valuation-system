package database

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"backend/internal/config"
	"backend/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DB is the global database instance
var DB *gorm.DB

// NewPostgresConnection creates and returns a new PostgreSQL database connection
func NewPostgresConnection(cfg *config.Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=Africa/Kigali",
		cfg.DBHost,
		cfg.DBUser,
		cfg.DBPassword,
		cfg.DBName,
		cfg.DBPort,
		cfg.DBSSLMode,
	)

	// Configure GORM logger
	var gormLogger logger.Interface
	if cfg.Environment == "production" {
		gormLogger = logger.Default.LogMode(logger.Error)
	} else {
		gormLogger = logger.Default.LogMode(logger.Silent)
	}

	// Open database connection
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: gormLogger,
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Get underlying SQL DB for connection pooling
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database instance: %w", err)
	}

	// Set connection pool settings
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	// Test connection
	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("✅ Database connection established successfully")

	// Set global DB instance
	DB = db

	return db, nil
}

// AutoMigrate runs automatic migrations for all models
func AutoMigrate(db *gorm.DB) error {
	log.Println("Running database migrations...")

	err := db.AutoMigrate(
		&models.User{},
		&models.GazetteLandPrice{},
		&models.Property{},
		&models.Valuation{},
		&models.Notification{},
		&models.Subscription{},
		&models.Transaction{},
	)
	if err != nil {
		// Backward-compatibility: some existing DBs have an index instead of the legacy
		// `uni_properties_upi` constraint name; allow startup and rely on SQL migrations.
		if strings.Contains(err.Error(), "uni_properties_upi") && strings.Contains(err.Error(), "does not exist") {
			log.Printf("⚠️ Ignoring legacy UPI constraint mismatch during AutoMigrate: %v", err)
			return nil
		}
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	log.Println("✅ Database migrations completed successfully")
	return nil
}

// RunSQLMigrations executes raw SQL migration files from the migrations directory
func RunSQLMigrations(db *gorm.DB) error {
	log.Println("Running SQL migrations...")

	// List of migration files to execute in order
	migrationFiles := []string{
		"001_init_schema.sql",
		"002_seed_data.sql",
		"003_add_mfa_fields.sql",
		"004_setup_admin_users.sql",
		"005_add_performance_indexes.sql",
		"006_add_referral_fields.sql",
		"007_add_upi_field.sql",
		"008_seed_properties_with_upi.sql",
		// "009_create_land_parcels_table.sql", // removed, table deprecated
		"010_add_land_parcel_fk_to_properties.sql",
		"011_create_gazette_land_prices_table.sql",
		"012_create_active_gazette_prices_view.sql",
	}

	// Find migrations directory
	var migrationsPath string

	// Try multiple potential paths
	possiblePaths := []string{
		"./migrations",
		"./backend/migrations",
		"migrations",
		"../migrations",
	}

	for _, path := range possiblePaths {
		if _, err := os.Stat(path); err == nil {
			migrationsPath = path
			break
		}
	}

	if migrationsPath == "" {
		log.Println("⚠️ Migrations directory not found, skipping SQL migrations")
		return nil
	}

	for _, file := range migrationFiles {
		filePath := filepath.Join(migrationsPath, file)

		// Check if file exists
		if _, err := os.Stat(filePath); os.IsNotExist(err) {
			log.Printf("⚠️ Migration file not found: %s, skipping", file)
			continue
		}

		// Read migration file
		data, err := os.ReadFile(filePath)
		if err != nil {
			log.Printf("⚠️ Failed to read migration file %s: %v, continuing", file, err)
			continue
		}

		log.Printf("Executing SQL migration: %s", file)

		// Execute migration
		result := db.Exec(string(data))
		if result.Error != nil {
			// Log warning but don't fail - migrations might have already been applied
			log.Printf("⚠️ Warning during migration %s: %v", file, result.Error)
		}
	}

	log.Println("✅ SQL migrations completed")
	return nil
}

// Close closes the database connection
func Close(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
