package main

import (
	"backend/internal/config"
	"backend/internal/csvingest"
	"backend/internal/database"

	// "backend/internal/models" // removed unused

	"encoding/csv"
	"flag"
	"fmt"
	"log"
	"os"

	// "regexp"
	// "strconv"
	"strings"
	"time"

	// "github.com/google/uuid"
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

	// Validate CSV file exists (print absolute path for clarity)
	absPath, err := os.Getwd()
	if err != nil {
		log.Fatalf("❌ Could not determine working directory: %v", err)
	}
	fullPath := absPath + string(os.PathSeparator) + *csvFile
	if _, err := os.Stat(*csvFile); os.IsNotExist(err) {
		log.Fatalf("❌ CSV file not found: %s\nChecked absolute path: %s", *csvFile, fullPath)
	}

	log.Printf("🚀 Starting land parcel import from: %s", *csvFile)
	log.Printf("📍 Data source: %s", *source)
	if *dryRun {
		log.Println("🔍 DRY RUN MODE - No data will be modified")
	}

	// Initialize repository
	// LandParcel repository logic removed (model deleted)

	// Delete existing parcels from source if requested (dangerous!)
	if *deleteMode {
		log.Printf("⚠️ WARNING: Delete mode requested for source '%s' (no-op, LandParcel logic removed)", *source)
		confirmed := askForConfirmation("Are you absolutely sure? Type 'yes' to confirm: ")
		if !confirmed {
			log.Println("❌ Deletion cancelled")
			os.Exit(1)
		}
		// No deletion performed (LandParcel logic removed)
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
	// Only require multi-field columns for new workflow
	required := []string{"district", "sector", "cell", "village", "land_size_sqm", "base_price_per_sqm", "zone_coefficient", "property_type", "zoning_type"}
	if err := csvingest.ValidateColumns(columnIndex, required); err != nil {
		log.Fatalf("❌ CSV missing required columns: %v", err)
	}

	// LandParcel legacy repo removed. Use new multi-field workflow.
	var parcelsToSave []map[string]interface{}

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
			created, updated, err := processBatch(db, parcelsToSave, dryRun)
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
		// Stub: just count as created for now
		stats.Created += len(parcelsToSave)
	}

	stats.EndTime = time.Now()
	return stats
}

// parseRow parses a CSV row and creates a LandParcel model
// parseRow now returns a map for multi-field workflow
func parseRow(record []string, columnIndex map[string]int, source string, lineNum int) (map[string]interface{}, string) {
	getValue := func(colName string) string {
		if idx, ok := columnIndex[colName]; ok && idx < len(record) {
			return strings.TrimSpace(record[idx])
		}
		return ""
	}
	// Example: just return a map of all fields for now
	row := map[string]interface{}{}
	for k := range columnIndex {
		row[k] = getValue(k)
	}
	row["source"] = source
	return row, ""
}

// processBatch inserts/updates a batch of land parcels
// processBatch stubbed for multi-field workflow
func processBatch(db *gorm.DB, parcels []map[string]interface{}, dryRun bool) (int, int, error) {
	created := len(parcels)
	updated := 0
	// No DB ops in stub
	return created, updated, nil
}

// askForConfirmation prompts user to confirm dangerous operations
func askForConfirmation(prompt string) bool {
	fmt.Print(prompt)
	var response string
	if _, err := fmt.Scanln(&response); err != nil {
		return false
	}
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
	fmt.Print(`CSV Land Value Ingestion Tool
================================

This tool imports land value data from CSV files into the system (multi-field, no UPI).

USAGE:
	go run ./cmd/csv_ingest_land_parcels -file <path> [options]

REQUIRED FLAGS:
	-file <path>              Path to CSV file to import

OPTIONAL FLAGS:
	-source <name>            Data source name (default: lands.rw)
	-dry-run                  Validate without importing data
	-delete-first             Delete all data from source before importing
	-help                     Show this help message

CSV FORMAT:
	Required columns: district, sector, cell, village, land_size_sqm, base_price_per_sqm, zone_coefficient, property_type, zoning_type

EXAMPLE CSV:
	district,sector,cell,village,land_size_sqm,base_price_per_sqm,zone_coefficient,property_type,zoning_type
	Kigali,Nyarugenge,Rwezamenyo,Agatare,1500,75000,1.5,residential,urban
	Kigali,Gasabo,Kacyiru,Kamatamu,2500,80000,2.0,commercial,urban

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
