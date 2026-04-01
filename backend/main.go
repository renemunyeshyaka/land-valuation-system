package main

import (
	"backend/handlers"
	"backend/internal/repository"
	"database/sql"
	"log"
	"net/http"

	_ "github.com/lib/pq"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

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

	http.HandleFunc("/api/upi-price", handlers.UPIPriceHandler)
	http.HandleFunc("/api/v1/estimate-search", handlers.EstimateSearchHandler)
	http.HandleFunc("/api/v1/search-upi", handlers.UpiSearchHandler)
	http.HandleFunc("/api/v1/land-value-estimate", handlers.LandValueEstimateHandler)

	// Image upload endpoint
	http.HandleFunc("/api/v1/upload-image", handlers.ImageUploadHandler)

	// Serve static files for property images
	http.Handle("/property_images/", http.StripPrefix("/property_images/", http.FileServer(http.Dir("backend/property_images"))))

	// Property endpoints
	http.HandleFunc("/api/v1/properties", handlers.CreatePropertyHandler)   // POST
	http.HandleFunc("/api/v1/marketplace", handlers.ListMarketplaceHandler) // GET

	log.Println("Server running on :5001...")
	log.Fatal(http.ListenAndServe(":5001", nil))
}

// connectGorm initializes a GORM DB connection using environment variables or defaults
func connectGorm() (*gorm.DB, error) {
	dsn := "host=localhost user=kcoduyxv_landval_admin password=gbR7C.XK0maH dbname=kcoduyxv_landval_bd port=5433 sslmode=disable TimeZone=Africa/Kigali"
	return gorm.Open(postgres.Open(dsn), &gorm.Config{})
}
