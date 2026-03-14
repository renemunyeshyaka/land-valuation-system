package csvingest

import (
	"encoding/csv"
	"fmt"
	"strings"
	"time"
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

// MapColumns creates a map of column names to their indices
func MapColumns(header []string) map[string]int {
	columnIndex := make(map[string]int)
	for i, col := range header {
		columnIndex[strings.ToLower(strings.TrimSpace(col))] = i
	}
	return columnIndex
}

// ValidateColumns checks if required columns exist
func ValidateColumns(columnIndex map[string]int, required []string) error {
	for _, col := range required {
		if _, exists := columnIndex[col]; !exists {
			return fmt.Errorf("missing required column: %s", col)
		}
	}
	return nil
}

// ReadHeader reads the header row from a CSV reader
func ReadHeader(reader *csv.Reader) ([]string, error) {
	header, err := reader.Read()
	if err != nil {
		return nil, fmt.Errorf("failed to read CSV header: %w", err)
	}
	return header, nil
}
