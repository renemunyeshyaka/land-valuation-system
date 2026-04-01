package main

import (
	"backend/handlers"
	"backend/internal/repository"
	"database/sql"
	"log"
	"net/http"
	"time"

	_ "github.com/lib/pq"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// CORS middleware wrapper
func enableCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "https://landval.kcoders.org")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		
		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		
		next(w, r)
	}
}

func main() {
	// Initialize the price table at startup
	if err := handlers.InitPriceTable("data/village_land_values_joined_clean.csv"); err != nil {
		log.Fatal("Failed to load price table: ", err)
	}

	// Connect to the database (for UPI and legacy handlers)
	db, err := sql.Open("postgres", "postgres://kcoduyxv_landval_admin:gbR7C.XK0maH@localhost:5433/kcoduyxv_landval_bd?sslmode=disable")
	if err != nil {
		log.Fatal("Failed to connect to DB: ", err)
	}
	defer db.Close()
	handlers.SetDB(&handlers.SQLDBAdapter{DB: db})

	// Connect to the database using GORM for the new land value estimate handler
	gormDB, gormErr := connectGorm()
	if gormErr != nil {
		log.Fatal("Failed to connect to GORM DB: ", gormErr)
	}

	// Initialize and inject the repository for land value estimate
	landValueRepo := repository.NewVillageLandValueRepository(gormDB)
	handlers.LandValueRepo = landValueRepo

	// Apply CORS middleware to all routes
	http.HandleFunc("/api/upi-price", enableCORS(handlers.UPIPriceHandler))
	http.HandleFunc("/api/v1/estimate-search", enableCORS(handlers.EstimateSearchHandler))
	http.HandleFunc("/api/v1/search-upi", enableCORS(handlers.UpiSearchHandler))
	http.HandleFunc("/api/v1/land-value-estimate", enableCORS(handlers.LandValueEstimateHandler))

	// Auth endpoint
	http.HandleFunc("/api/v1/auth/login", enableCORS(handlers.AuthLoginHandler))

	// Image upload endpoint
	http.HandleFunc("/api/v1/upload-image", enableCORS(handlers.ImageUploadHandler))

	// Serve static files for property images
	http.Handle("/property_images/", http.StripPrefix("/property_images/", http.FileServer(http.Dir("property_images"))))

	// Property endpoints
	http.HandleFunc("/api/v1/properties", enableCORS(handlers.CreatePropertyHandler))
	http.HandleFunc("/api/v1/marketplace", enableCORS(handlers.ListMarketplaceHandler))

	// Health check endpoint
	http.HandleFunc("/health", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok","timestamp":"` + time.Now().Format(time.RFC3339) + `"}`))
	}))

	log.Println("Server running on :5001...")
	log.Fatal(http.ListenAndServe(":5001", nil))
}

// connectGorm initializes a GORM DB connection using environment variables or defaults
func connectGorm() (*gorm.DB, error) {
	dsn := "host=localhost user=kcoduyxv_landval_admin password=gbR7C.XK0maH dbname=kcoduyxv_landval_bd port=5433 sslmode=disable TimeZone=Africa/Kigali"
	return gorm.Open(postgres.Open(dsn), &gorm.Config{})
}
