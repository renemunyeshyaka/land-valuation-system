package handlers

import (
	"backend/pricing"
	"database/sql"
	"encoding/json"
	"net/http"
)

type UPIPriceRequest struct {
	UPI        string `json:"upi"`
	Conditions []bool `json:"conditions"` // 6 booleans
}

type UPIPriceResponse struct {
	UPI       string `json:"upi"`
	Price     string `json:"price"`
	PriceType string `json:"price_type"`
	Error     string `json:"error,omitempty"`
}

var priceTable *pricing.PriceTable
var db *sql.DB

func InitPriceTable(csvPath string) error {
	pt, err := pricing.LoadPriceTable(csvPath)
	if err != nil {
		return err
	}
	priceTable = pt
	return nil
}

func SetDB(database *sql.DB) {
	db = database
}

// UPIPriceHandler handles POST /api/upi-price (UPI-only)
func UPIPriceHandler(w http.ResponseWriter, r *http.Request) {
	var req UPIPriceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}
	// Step 1: UPI existence check
	var upi string
	err := db.QueryRow(`SELECT upi FROM collected_upis WHERE upi = $1 LIMIT 1`, req.UPI).Scan(&upi)
	if err != nil {
		resp := UPIPriceResponse{UPI: req.UPI, Error: "UPI not found or inactive"}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
		return
	}
	// Step 2: Pricing Lookup by UPI
	price, priceType, err := priceTable.GetPriceByUPI(upi)
	resp := UPIPriceResponse{
		UPI:       upi,
		Price:     price,
		PriceType: priceType,
	}
	if err != nil {
		resp.Error = err.Error()
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
