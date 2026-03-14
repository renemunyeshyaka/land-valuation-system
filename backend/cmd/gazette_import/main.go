package main

import (
	"backend/internal/config"
	"backend/internal/database"
	"encoding/csv"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"os"
	"strconv"
	"strings"
	"time"
)

type row struct {
	GazetteVersion         string
	SourceDocument         string
	EffectiveFrom          string
	EffectiveTo            string
	Province               string
	District               string
	Sector                 string
	AreaClassification     string
	MinimumValuePerSqm     float64
	WeightedAvgValuePerSqm float64
	MaximumValuePerSqm     float64
	ConfidenceScore        float64
	RawLine                string
}

func main() {
	filePath := flag.String("file", "", "Path to gazette prices CSV")
	deactivateOlder := flag.Bool("deactivate-older", false, "Deactivate older active gazette versions after successful import")
	flag.Parse()

	if strings.TrimSpace(*filePath) == "" {
		log.Fatal("-file is required")
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}
	db, err := database.NewPostgresConnection(cfg)
	if err != nil {
		log.Fatalf("failed to connect DB: %v", err)
	}

	f, err := os.Open(*filePath)
	if err != nil {
		log.Fatalf("failed to open CSV: %v", err)
	}
	defer f.Close()

	r := csv.NewReader(f)
	r.TrimLeadingSpace = true

	header, err := r.Read()
	if err != nil {
		log.Fatalf("failed to read CSV header: %v", err)
	}

	index := map[string]int{}
	for i, h := range header {
		index[strings.ToLower(strings.TrimSpace(h))] = i
	}

	required := []string{
		"gazette_version", "source_document", "effective_from",
		"province", "district", "sector", "area_classification",
		"minimum_value_per_sqm", "weighted_avg_value_per_sqm", "maximum_value_per_sqm",
	}
	for _, k := range required {
		if _, ok := index[k]; !ok {
			log.Fatalf("missing required CSV column: %s", k)
		}
	}

	var imported int
	seenVersions := map[string]struct{}{}

	tx := db.Begin()
	if tx.Error != nil {
		log.Fatalf("failed to begin transaction: %v", tx.Error)
	}

	for {
		rec, err := r.Read()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			tx.Rollback()
			log.Fatalf("failed reading CSV row: %v", err)
		}

		parsed, err := parseRow(rec, index)
		if err != nil {
			tx.Rollback()
			log.Fatalf("invalid CSV row: %v", err)
		}

		seenVersions[parsed.GazetteVersion] = struct{}{}

		upsert := `
INSERT INTO gazette_land_prices (
    gazette_version, source_document, effective_from, effective_to, is_active,
    province, district, sector, area_classification,
    minimum_value_per_sqm, weighted_avg_value_per_sqm, maximum_value_per_sqm,
    confidence_score, raw_line, created_at, updated_at
) VALUES (
    ?, ?, ?, ?, TRUE,
    ?, ?, ?, ?,
    ?, ?, ?,
    ?, ?, NOW(), NOW()
)
ON CONFLICT (gazette_version, province, district, sector, area_classification)
DO UPDATE SET
    source_document = EXCLUDED.source_document,
    effective_from = EXCLUDED.effective_from,
    effective_to = EXCLUDED.effective_to,
    is_active = TRUE,
    minimum_value_per_sqm = EXCLUDED.minimum_value_per_sqm,
    weighted_avg_value_per_sqm = EXCLUDED.weighted_avg_value_per_sqm,
    maximum_value_per_sqm = EXCLUDED.maximum_value_per_sqm,
    confidence_score = EXCLUDED.confidence_score,
    raw_line = EXCLUDED.raw_line,
    updated_at = NOW()`

		if err := tx.Exec(upsert,
			parsed.GazetteVersion, parsed.SourceDocument, parsed.EffectiveFrom, nullableDate(parsed.EffectiveTo),
			parsed.Province, parsed.District, parsed.Sector, parsed.AreaClassification,
			parsed.MinimumValuePerSqm, parsed.WeightedAvgValuePerSqm, parsed.MaximumValuePerSqm,
			parsed.ConfidenceScore, parsed.RawLine,
		).Error; err != nil {
			tx.Rollback()
			log.Fatalf("upsert failed: %v", err)
		}

		imported++
	}

	if *deactivateOlder {
		for v := range seenVersions {
			q := `UPDATE gazette_land_prices
SET is_active = FALSE, updated_at = NOW()
WHERE is_active = TRUE AND gazette_version <> ?`
			if err := tx.Exec(q, v).Error; err != nil {
				tx.Rollback()
				log.Fatalf("failed to deactivate older versions: %v", err)
			}
		}
	}

	if err := tx.Commit().Error; err != nil {
		log.Fatalf("failed to commit: %v", err)
	}

	log.Printf("Imported/updated %d gazette price rows", imported)
}

func parseRow(rec []string, index map[string]int) (*row, error) {
	get := func(name string) string {
		pos, ok := index[name]
		if !ok || pos >= len(rec) {
			return ""
		}
		return strings.TrimSpace(rec[pos])
	}

	minVal, err := parseFloat(get("minimum_value_per_sqm"))
	if err != nil {
		return nil, fmt.Errorf("minimum_value_per_sqm: %w", err)
	}
	avgVal, err := parseFloat(get("weighted_avg_value_per_sqm"))
	if err != nil {
		return nil, fmt.Errorf("weighted_avg_value_per_sqm: %w", err)
	}
	maxVal, err := parseFloat(get("maximum_value_per_sqm"))
	if err != nil {
		return nil, fmt.Errorf("maximum_value_per_sqm: %w", err)
	}

	conf := 1.0
	if c := get("confidence_score"); c != "" {
		conf, err = parseFloat(c)
		if err != nil {
			return nil, fmt.Errorf("confidence_score: %w", err)
		}
	}

	r := &row{
		GazetteVersion:         get("gazette_version"),
		SourceDocument:         get("source_document"),
		EffectiveFrom:          get("effective_from"),
		EffectiveTo:            get("effective_to"),
		Province:               get("province"),
		District:               get("district"),
		Sector:                 get("sector"),
		AreaClassification:     get("area_classification"),
		MinimumValuePerSqm:     minVal,
		WeightedAvgValuePerSqm: avgVal,
		MaximumValuePerSqm:     maxVal,
		ConfidenceScore:        conf,
		RawLine:                get("raw_line"),
	}

	if r.GazetteVersion == "" || r.SourceDocument == "" || r.EffectiveFrom == "" || r.Province == "" || r.District == "" || r.Sector == "" {
		return nil, fmt.Errorf("one of required string fields is empty")
	}

	if _, err := time.Parse("2006-01-02", r.EffectiveFrom); err != nil {
		return nil, fmt.Errorf("effective_from must be YYYY-MM-DD: %w", err)
	}
	if r.EffectiveTo != "" {
		if _, err := time.Parse("2006-01-02", r.EffectiveTo); err != nil {
			return nil, fmt.Errorf("effective_to must be YYYY-MM-DD: %w", err)
		}
	}

	if r.AreaClassification == "" {
		r.AreaClassification = "unknown"
	}

	return r, nil
}

func parseFloat(v string) (float64, error) {
	if v == "" {
		return 0, fmt.Errorf("empty value")
	}
	normalized := strings.ReplaceAll(v, ",", "")
	return strconv.ParseFloat(normalized, 64)
}

func nullableDate(v string) interface{} {
	if strings.TrimSpace(v) == "" {
		return nil
	}
	return v
}
