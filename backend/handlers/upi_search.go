package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
)

type UpiSearchRequest struct {
	UPI string `json:"upi"`
}

type UpiSearchResponse struct {
	ID                int64  `json:"id"`
	UPI               string `json:"upi"`
	DistrictCode      string `json:"district_code"`
	SectorCode        string `json:"sector_code"`
	CellCode          string `json:"cell_code"`
	ParcelNumber      string `json:"parcel_number"`
	CollectionBatchID string `json:"collection_batch_id"`
	CollectionTime    string `json:"collection_time"`
	Error             string `json:"error,omitempty"`
}

// UpiSearchHandler handles POST /api/v1/search-upi
func UpiSearchHandler(w http.ResponseWriter, r *http.Request) {
	var req UpiSearchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}
	if req.UPI == "" {
		resp := UpiSearchResponse{Error: "UPI is required"}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(resp); err != nil {
			log.Printf("UpiSearchHandler encode error: %v", err)
		}
		return
	}
	var resp UpiSearchResponse
	err := db.QueryRow(`SELECT id, upi, district_code, sector_code, cell_code, parcel_number, collection_batch_id, collection_time FROM collected_upis WHERE upi = $1 LIMIT 1`, req.UPI).Scan(
		&resp.ID, &resp.UPI, &resp.DistrictCode, &resp.SectorCode, &resp.CellCode, &resp.ParcelNumber, &resp.CollectionBatchID, &resp.CollectionTime,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			resp.Error = "UPI not found"
		} else {
			resp.Error = err.Error()
		}
	}
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		log.Printf("UpiSearchHandler encode error: %v", err)
	}
}
