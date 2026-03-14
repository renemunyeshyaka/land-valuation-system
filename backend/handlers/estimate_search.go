package handlers

import (
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"
	"strings"
)

// EstimateSearchRequest matches your documented frontend payload
type EstimateSearchRequest struct {
	UPI string `json:"upi"`
}

// EstimateSearchResponse matches your documented frontend response
type EstimateSearchResponse struct {
	UPI       string `json:"upi"`
	Price     string `json:"price"`
	PriceType string `json:"price_type"`
	Error     string `json:"error,omitempty"`
}

// EstimateSearchHandler handles POST /api/v1/estimate-search
func EstimateSearchHandler(w http.ResponseWriter, r *http.Request) {
	var req EstimateSearchRequest
	body, _ := ioutil.ReadAll(r.Body)
	log.Printf("/api/v1/estimate-search raw body: %s", string(body))
	r.Body = ioutil.NopCloser(strings.NewReader(string(body)))
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("/api/v1/estimate-search decode error: %v", err)
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}
	if req.UPI == "" {
		resp := EstimateSearchResponse{Error: "UPI is required."}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
		return
	}
	query := `SELECT upi FROM collected_upis WHERE upi = $1 LIMIT 1`
	var upi string
	err := db.QueryRow(query, req.UPI).Scan(&upi)
	if err != nil {
		log.Printf("EstimateSearchHandler: Parcel lookup failed: %v", err)
		resp := EstimateSearchResponse{Error: "Parcel not found or inactive"}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
		return
	}
	// Call priceTable.GetPriceByUPI or similar logic for UPI-based lookup
	price, priceType, err := priceTable.GetPriceByUPI(upi)
	resp := EstimateSearchResponse{
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
