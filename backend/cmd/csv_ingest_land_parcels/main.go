package main

import (
	"backend/internal/config"
	"backend/internal/csvingest"
	"backend/internal/database"
	"backend/internal/models"
	"backend/internal/repository"
	"encoding/csv"
	"flag"
	"fmt"
	"log"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ImportStats tracks statistics for the import process
type ImportStats struct {
	StartTime time.Time
	EndTime   time.Time
	Total     int
	Created   int
	Updated   int
	Skipped   int
	Errors    int
}

// Duration returns the duration of the import
func (s ImportStats) Duration() time.Duration {
	return s.EndTime.Sub(s.StartTime)
}

var (
	csvFile    = flag.String("file", "", "Path to CSV file to import")
	source     = flag.String("source", "lands.rw", "Data source name (default: lands.rw)")
	dryRun     = flag.Bool("dry-run", false, "Validate without importing data")
	deleteMode = flag.Bool("delete-first", false, "Delete all parcels from source before importing (dangerous!)")
	help       = flag.Bool("help", false, "Show help message")
)

func main() {
	flag.Parse()

	if *help || *csvFile == "" {
		printUsage()
		os.Exit(1)
	}

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("❌ Failed to load configuration: %v", err)
	}

	// Connect to database
	db, err := database.NewPostgresConnection(cfg)
	if err != nil {
		log.Fatalf("❌ Failed to connect to database: %v", err)
	}

	// Run migrations
	if err := database.AutoMigrate(db); err != nil {
		log.Printf("⚠️ Migration warning: %v", err)
	}

	// Validate CSV file exists
	if _, err := os.Stat(*csvFile); os.IsNotExist(err) {
		log.Fatalf("❌ CSV file not found: %s", *csvFile)
	}

	log.Printf("🚀 Starting land parcel import from: %s", *csvFile)
	log.Printf("📍 Data source: %s", *source)
	if *dryRun {
		log.Println("🔍 DRY RUN MODE - No data will be modified")
	}

	// Initialize repository
	landParcelRepo := repository.NewLandParcelRepository(db)

	// Delete existing parcels from source if requested (dangerous!)
	if *deleteMode {
		log.Printf("⚠️ WARNING: Deleting all existing parcels from source '%s'", *source)
		confirmed := askForConfirmation("Are you absolutely sure? Type 'yes' to confirm: ")
		if !confirmed {
			log.Println("❌ Deletion cancelled")
			os.Exit(1)
		}

		if !*dryRun {
			if err := landParcelRepo.DeleteBySource(*source); err != nil {
				log.Fatalf("❌ Failed to delete existing parcels: %v", err)
			}
			log.Printf("✅ Deleted all parcels from source '%s'", *source)
		}
	}

	// Import CSV
	stats := importCSV(db, *csvFile, *source, *dryRun)

	// Print summary
	printSummary(stats)

	if stats.Errors > 0 {
		os.Exit(1)
	}
	// Extra closing brace removed
}

// importCSV reads CSV file and imports land parcels
func importCSV(db *gorm.DB, csvFile string, source string, dryRun bool) ImportStats {
	stats := ImportStats{
		StartTime: time.Now(),
	}

	file, err := os.Open(csvFile)
	if err != nil {
		log.Fatalf("❌ Failed to open CSV file: %v", err)
	}
	defer file.Close()

	reader := csv.NewReader(file)
	reader.FieldsPerRecord = -1 // Allow variable number of fields

	// Read header
	header, err := csvingest.ReadHeader(reader)
	if err != nil {
		log.Fatalf("❌ Failed to read CSV header: %v", err)
	}

	// Map column indices
	columnIndex := csvingest.MapColumns(header)
	required := []string{"upi", "land_size_sqm"}
	if err := csvingest.ValidateColumns(columnIndex, required); err != nil {
		log.Fatalf("❌ CSV missing required columns: %v", err)
	}

	landParcelRepo := repository.NewLandParcelRepository(db)
	var parcelsToSave []*models.LandParcel

	// Read data rows
	lineNum := 2 // Start from 2 (header is line 1)
	for {
		record, err := reader.Read()
		if err != nil {
			if err.Error() == "EOF" {
				break
			}
			log.Printf("⚠️ Error reading line %d: %v", lineNum, err)
			stats.Errors++
			lineNum++
			continue
		}

		if len(record) == 0 || (len(record) == 1 && strings.TrimSpace(record[0]) == "") {
			lineNum++
			continue // Skip empty lines
		}

		parcel, rowErr := parseRow(record, columnIndex, source, lineNum)
		if rowErr != "" {
			log.Printf("⚠️ Line %d: %s", lineNum, rowErr)
			stats.Errors++
			lineNum++
			continue
		}

		if parcel != nil {
			parcelsToSave = append(parcelsToSave, parcel)
		}

		stats.Total++
		lineNum++

		// Batch process every 1000 records
		if len(parcelsToSave) >= 1000 {
			created, updated, err := processBatch(db, landParcelRepo, parcelsToSave, dryRun)
			if err != nil {
				log.Printf("❌ Batch processing failed: %v", err)
				stats.Errors += len(parcelsToSave)
			} else {
				stats.Created += created
				stats.Updated += updated
			}
			parcelsToSave = nil
		}
	}

	// Process remaining records
	if len(parcelsToSave) > 0 {
		created, updated, err := processBatch(db, landParcelRepo, parcelsToSave, dryRun)
		if err != nil {
			log.Printf("❌ Final batch processing failed: %v", err)
			stats.Errors += len(parcelsToSave)
		} else {
			stats.Created += created
			stats.Updated += updated
		}
	}

	stats.EndTime = time.Now()
	return stats
}

// parseRow parses a CSV row and creates a LandParcel model
func parseRow(record []string, columnIndex map[string]int, source string, lineNum int) (*models.LandParcel, string) {
	// Extract values (with safe indexing)
	getValue := func(colName string) string {
		if idx, ok := columnIndex[colName]; ok && idx < len(record) {
			return strings.TrimSpace(record[idx])
		}
		return ""
	}

	// Required fields
	upi := getValue("upi")
	landSizeStr := getValue("land_size_sqm")

	// Validation
	if upi == "" {
		return nil, "Missing UPI"
	}
	// Validate UPI format (e.g., 1/02/03/04/00012)
	upiPattern := `^\d{1,2}/\d{2}/\d{2}/\d{2}/\d{5}$`
	if matched, _ := regexp.MatchString(upiPattern, upi); !matched {
		return nil, "Invalid UPI format (expected e.g. 1/02/03/04/00012)"
	}
	if landSizeStr == "" {
		return nil, "Missing land_size_sqm"
	}

	// Parse numeric fields
	landSize, err := strconv.ParseFloat(landSizeStr, 64)
	if err != nil {
		return nil, fmt.Sprintf("Invalid land_size_sqm: %s", landSizeStr)
	}

	if landSize <= 0 {
		return nil, "Land size must be positive"
	}

	// Optional fields
	basePriceStr := getValue("base_price_per_sqm")
	var basePrice *float64
	if basePriceStr != "" {
		if price, err := strconv.ParseFloat(basePriceStr, 64); err == nil && price > 0 {
			basePrice = &price
		}
	}

	coeffStr := getValue("zone_coefficient")
	coefficient := 1.0
	if coeffStr != "" {
		if coeff, err := strconv.ParseFloat(coeffStr, 64); err == nil && coeff > 0 {
			coefficient = coeff
		}
	}

	propertyType := getValue("property_type")
	if propertyType == "" {
		propertyType = "unknown"
	}

	// cell already set above
	zoningType := getValue("zoning_type")

	// Create land parcel
	now := time.Now()
	parcel := &models.LandParcel{
		ID:              uuid.New(),
		UPI:             upi,
		LandSizeSqm:     landSize,
		BasePricePerSqm: 0,
		ZoneCoefficient: coefficient,
		PropertyType:    propertyType,
		ZoningType:      zoningType,
		Source:          source,
		SyncedAt:        &now,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	if basePrice != nil {
		parcel.BasePricePerSqm = *basePrice
	}

	return parcel, ""
}

// processBatch inserts/updates a batch of land parcels
func processBatch(db *gorm.DB, repo *repository.LandParcelRepository, parcels []*models.LandParcel, dryRun bool) (int, int, error) {
	created := 0
	updated := 0

	if dryRun {
		// In dry-run mode, just validate
		for _, p := range parcels {
			if p.UPI == "" {
				continue
			}
			created++ // Count as would be created
		}
		return created, 0, nil
	}

	// Process each parcel with upsert (create or update)
	for _, parcel := range parcels {
		if err := repo.Upsert(parcel); err != nil {
			return created, updated, fmt.Errorf("upsert failed for UPI %s: %w", parcel.UPI, err)
		}

		// Check if it was created or updated
		// For now, count as created (we could enhance this with better tracking)
		created++
	}

	return created, updated, nil
}

// askForConfirmation prompts user to confirm dangerous operations
func askForConfirmation(prompt string) bool {
	fmt.Print(prompt)
	var response string
	fmt.Scanln(&response)
	return strings.ToLower(strings.TrimSpace(response)) == "yes"
}

// printSummary prints import summary
func printSummary(stats ImportStats) {
	fmt.Println("\n" + strings.Repeat("=", 60))
	fmt.Println("📊 IMPORT SUMMARY")
	fmt.Println(strings.Repeat("=", 60))
	fmt.Printf("⏱️  Duration:        %v\n", stats.Duration())
	fmt.Printf("📋 Total Records:   %d\n", stats.Total)
	fmt.Printf("✅ Created:         %d\n", stats.Created)
	fmt.Printf("🔄 Updated:         %d\n", stats.Updated)
	fmt.Printf("⏭️  Skipped:         %d\n", stats.Skipped)
	fmt.Printf("❌ Errors:          %d\n", stats.Errors)
	fmt.Println(strings.Repeat("=", 60))

	if stats.Errors == 0 {
		fmt.Println("✅ Import completed successfully!")
	} else {
		fmt.Printf("⚠️  Import completed with %d errors\n", stats.Errors)
	}
}

// printUsage prints help message
func printUsage() {
	fmt.Print(`CSV Land Parcel Ingestion Tool
================================

This tool imports land parcel data from CSV files into the land_parcels table.

USAGE:
	go run ./cmd/csv_ingest_land_parcels -file <path> [options]

REQUIRED FLAGS:
	-file <path>              Path to CSV file to import

OPTIONAL FLAGS:
	-source <name>            Data source name (default: lands.rw)
	-dry-run                  Validate without importing data
	-delete-first             Delete all parcels from source before importing
	-help                     Show this help message

CSV FORMAT:
	Required columns: upi, district, sector, land_size_sqm
	Optional columns: base_price_per_sqm, zone_coefficient, property_type, cell, village, zoning_type

EXAMPLE CSV:
	upi,district,sector,land_size_sqm,base_price_per_sqm,zone_coefficient,property_type
	3711,Kigali,Nyarugenge,1500,75000,1.5,residential
	4512,Kigali,Gasabo,2500,80000,2.0,commercial

EXAMPLE COMMANDS:
	# Validate CSV before importing
	go run ./cmd/csv_ingest_land_parcels -file data.csv -dry-run

	# Import from custom source
	go run ./cmd/csv_ingest_land_parcels -file data.csv -source custom_provider

	# Replace all existing data from lands.rw
	go run ./cmd/csv_ingest_land_parcels -file data.csv -delete-first

FOR PRODUCTION:
	Build the binary: go build -o csv-ingest ./cmd/csv_ingest_land_parcels
	Run: ./csv-ingest -file data.csv -source lands.rw
`)
}
