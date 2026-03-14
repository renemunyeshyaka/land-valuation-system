package main

import (
	"backend/handlers"
	"database/sql"
	"log"
	"net/http"

	_ "github.com/lib/pq"
)

func main() {
	// Initialize the price table at startup
	if err := handlers.InitPriceTable("backend/data/land_valuation_full_matched_with_upi.csv"); err != nil {
		log.Fatal("Failed to load price table: ", err)
	}

	// Connect to the database
	db, err := sql.Open("postgres", "postgres://kcoduyxv_landval_admin:gbR7C.XK0maH@localhost:5432/kcoduyxv_landval_bd?sslmode=disable")
	if err != nil {
		log.Fatal("Failed to connect to DB: ", err)
	}
	defer db.Close()
	handlers.SetDB(db)

	// http.HandleFunc("/api/price", handlers.PriceHandler) // Removed: handler not defined
	http.HandleFunc("/api/upi-price", handlers.UPIPriceHandler)
	http.HandleFunc("/api/v1/estimate-search", handlers.EstimateSearchHandler)
	http.HandleFunc("/api/v1/search-upi", handlers.UpiSearchHandler)
	log.Println("Server running on :5000...")
	log.Fatal(http.ListenAndServe(":5000", nil))
}
