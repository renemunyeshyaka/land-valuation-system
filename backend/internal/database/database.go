package database

import (
	"fmt"
	"log"
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
	gormLogger := logger.Default.LogMode(logger.Info)
	if cfg.Environment == "production" {
		gormLogger = logger.Default.LogMode(logger.Error)
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
		&models.Property{},
		&models.Valuation{},
		&models.Subscription{},
		&models.Transaction{},
	)
	if err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	log.Println("✅ Database migrations completed successfully")
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
