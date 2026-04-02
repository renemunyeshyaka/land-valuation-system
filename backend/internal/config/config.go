package config

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	// Server
	Port        string
	Environment string
	APIBaseURL  string

	// Database
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string

	// Redis
	RedisHost     string
	RedisPort     string
	RedisPassword string
	RedisDB       int

	// JWT
	JWTSecret     string
	JWTExpiration time.Duration

	// External APIs
	RwandaLandAPIKey     string
	RwandaLandAPIBaseURL string
	MapboxToken          string
	MobileMoneyAPIKey    string

	// Payment
	PaymentGatewayKey    string
	PaymentWebhookSecret string

	// Email
	SMTPHost     string
	SMTPPort     int
	SMTPUser     string
	SMTPPassword string
	EmailFrom    string

	// File Upload
	MaxFileSize int64
	UploadPath  string

	// Rate Limiting
	RateLimit      int
	RateLimitBurst int

	// Cache
	CacheTTL time.Duration

	// Monitoring
	SentryDSN string
}

func Load() (*Config, error) {
	_ = godotenv.Load() // It's okay if .env doesn't exist.

	config := &Config{
		Port:        getEnv("PORT", "8080"),
		Environment: getEnv("ENVIRONMENT", "development"),
		APIBaseURL:  getEnv("API_BASE_URL", "http://localhost:8080"),

		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5433"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", ""),
		DBName:     getEnv("DB_NAME", "land_valuation"),
		DBSSLMode:  getEnv("DB_SSL_MODE", "disable"),

		RedisHost:     getEnv("REDIS_HOST", "localhost"),
		RedisPort:     getEnv("REDIS_PORT", "6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		RedisDB:       getEnvAsInt("REDIS_DB", 0),

		JWTSecret:     getEnv("JWT_SECRET", "your-secret-key"),
		JWTExpiration: time.Duration(getEnvAsInt("JWT_EXPIRATION", 24)) * time.Hour,

		RwandaLandAPIKey:     getEnv("RWANDA_LAND_API_KEY", ""),
		RwandaLandAPIBaseURL: getEnv("RWANDA_LAND_API_BASE_URL", "https://api.land.rw/v1"),
		MapboxToken:          getEnv("MAPBOX_TOKEN", ""),
		MobileMoneyAPIKey:    getEnv("MOBILE_MONEY_API_KEY", ""),

		PaymentGatewayKey:    getEnv("PAYMENT_GATEWAY_KEY", ""),
		PaymentWebhookSecret: getEnv("PAYMENT_WEBHOOK_SECRET", ""),

		SMTPHost:     getEnv("SMTP_HOST", "smtp.gmail.com"),
		SMTPPort:     getEnvAsInt("SMTP_PORT", 587),
		SMTPUser:     getEnv("SMTP_USER", getEnv("EMAIL_USER", "")),
		SMTPPassword: getEnv("SMTP_PASSWORD", getEnv("EMAIL_PASS", "")),
		EmailFrom:    getEnv("EMAIL_FROM", getEnv("SMTP_FROM", "noreply@landvaluationsystem.rw")),

		MaxFileSize: getEnvAsInt64("MAX_FILE_SIZE", 10*1024*1024), // 10MB
		UploadPath:  getEnv("UPLOAD_PATH", "./uploads"),

		RateLimit:      getEnvAsInt("RATE_LIMIT", 100),
		RateLimitBurst: getEnvAsInt("RATE_LIMIT_BURST", 200),

		CacheTTL: time.Duration(getEnvAsInt("CACHE_TTL", 3600)) * time.Second,

		SentryDSN: getEnv("SENTRY_DSN", ""),
	}

	// Validate required fields
	if err := config.validate(); err != nil {
		return nil, err
	}

	return config, nil
}

func (c *Config) validate() error {
	if c.Environment == "production" {
		if c.JWTSecret == "your-secret-key" || len(c.JWTSecret) < 32 {
			return fmt.Errorf("JWT_SECRET must be set and at least 32 characters in production")
		}
		if c.DBPassword == "" {
			return fmt.Errorf("DB_PASSWORD is required in production")
		}
		if c.SMTPHost == "" || c.SMTPPort <= 0 {
			return fmt.Errorf("SMTP_HOST and SMTP_PORT are required in production")
		}
		if c.SMTPUser == "" || c.SMTPPassword == "" {
			return fmt.Errorf("SMTP_USER/EMAIL_USER and SMTP_PASSWORD/EMAIL_PASS are required in production")
		}
		if c.EmailFrom == "" {
			return fmt.Errorf("EMAIL_FROM/SMTP_FROM is required in production")
		}
	}
	if c.MapboxToken == "" {
		return fmt.Errorf("MAPBOX_TOKEN is required")
	}
	return nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}

func getEnvAsInt64(key string, defaultValue int64) int64 {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.ParseInt(value, 10, 64); err == nil {
			return intVal
		}
	}
	return defaultValue
}
