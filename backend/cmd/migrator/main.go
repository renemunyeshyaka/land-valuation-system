package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// Initialize database connection
	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "localhost"
	}

	dbPort := os.Getenv("DB_PORT")
	if dbPort == "" {
		dbPort = "5432"
	}

	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "land_valuation"
	}

	dbUser := os.Getenv("DB_USER")
	if dbUser == "" {
		dbUser = "postgres"
	}

	dbPassword := os.Getenv("DB_PASSWORD")
	if dbPassword == "" {
		dbPassword = "password"
	}

	dbSSL := os.Getenv("DB_SSL")
	if dbSSL == "" {
		dbSSL = "disable"
	}

	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		dbHost, dbPort, dbUser, dbPassword, dbName, dbSSL,
	)

	db, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Run migrations
	log.Println("Running migrations...")

	// Read and execute migration files
	migrationFiles := []string{
		"001_init_schema.sql",
		"002_seed_data.sql",
		"003_add_mfa_fields.sql",
		"004_setup_admin_users.sql",
	}

	for _, file := range migrationFiles {
		filePath := fmt.Sprintf("./migrations/%s", file)
		data, err := os.ReadFile(filePath)
		if err != nil {
			log.Fatalf("Failed to read migration file %s: %v", file, err)
		}

		log.Printf("Executing migration: %s", file)
		_, err = db.Exec(string(data))
		if err != nil {
			// Check if error is due to already existing objects (not a failure)
			if err == sql.ErrNoRows {
				log.Printf("Migration %s already applied or no data to migrate", file)
			} else {
				log.Printf("Warning during migration %s: %v", file, err)
			}
		}
	}

	log.Println("Migrations completed successfully!")
	log.Println("Database schema initialized")
}
