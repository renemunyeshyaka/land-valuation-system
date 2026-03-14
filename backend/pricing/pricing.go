package pricing

import (
	"encoding/csv"
	"fmt"
	"os"
)

type PriceRow struct {
	UPI      string
	MinValue string
	Weighted string
	MaxValue string
}

type PriceTable struct {
	rows []PriceRow
}

// LoadPriceTable loads the CSV into memory for fast lookup
func LoadPriceTable(csvPath string) (*PriceTable, error) {
	file, err := os.Open(csvPath)
	if err != nil {
		return nil, err
	}
	defer file.Close()
	reader := csv.NewReader(file)
	reader.FieldsPerRecord = -1
	all, err := reader.ReadAll()
	if err != nil {
		return nil, err
	}
	var rows []PriceRow
	for _, rec := range all {
		if len(rec) < 5 {
			continue // skip incomplete rows
		}
		rows = append(rows, PriceRow{
			UPI:      rec[0],
			MinValue: rec[2],
			Weighted: rec[3],
			MaxValue: rec[4],
		})
	}
	return &PriceTable{rows: rows}, nil
}

// GetPriceByUPI returns the price for the given UPI
func (pt *PriceTable) GetPriceByUPI(upi string) (string, string, error) {
	for _, row := range pt.rows {
		if row.UPI == upi {
			// For simplicity, return Weighted if available, else MinValue
			if row.Weighted != "" {
				return row.Weighted, "Weighted Average Value Per Sqm", nil
			} else if row.MinValue != "" {
				return row.MinValue, "Minimum Value Per Sqm", nil
			} else if row.MaxValue != "" {
				return row.MaxValue, "Maximum Value Per Sqm", nil
			}
		}
	}
	return "", "", fmt.Errorf("no price found for UPI")
}
