package csvingest

import (
	"encoding/csv"
	"strings"
	"testing"
)

func TestMapColumns(t *testing.T) {
	header := []string{"UPI", "District", "Sector", "Land_Size_Sqm"}
	cols := MapColumns(header)
	if cols["upi"] != 0 || cols["district"] != 1 || cols["sector"] != 2 || cols["land_size_sqm"] != 3 {
		t.Errorf("MapColumns failed: got %v", cols)
	}
}

func TestValidateColumns(t *testing.T) {
	cols := map[string]int{"upi": 0, "district": 1, "sector": 2, "land_size_sqm": 3}
	required := []string{"upi", "district", "sector", "land_size_sqm"}
	if err := ValidateColumns(cols, required); err != nil {
		t.Errorf("ValidateColumns failed: %v", err)
	}
	missing := []string{"upi", "district", "sector", "missing_col"}
	if err := ValidateColumns(cols, missing); err == nil {
		t.Error("ValidateColumns should fail for missing column")
	}
}

func TestReadHeader(t *testing.T) {
	csvData := "upi,district,sector,land_size_sqm\n1,2,3,4"
	reader := csv.NewReader(strings.NewReader(csvData))
	header, err := ReadHeader(reader)
	if err != nil {
		t.Fatalf("ReadHeader failed: %v", err)
	}
	if len(header) != 4 || header[0] != "upi" {
		t.Errorf("ReadHeader returned wrong header: %v", header)
	}
}
