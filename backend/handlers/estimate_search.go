package handlers

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strings"
)

// EstimateSearchRequest matches the documented multi-field payload
type EstimateSearchRequest struct {
	Province    string  `json:"province"`
	District    string  `json:"district"`
	Sector      string  `json:"sector"`
	Cell        string  `json:"cell"`
	Village     string  `json:"village"`
	PlotSizeSqm float64 `json:"plot_size_sqm"`
}

// EstimateSearchResponse matches the documented response
type EstimateSearchResponse struct {
	Province               string  `json:"province"`
	District               string  `json:"district"`
	Sector                 string  `json:"sector"`
	Cell                   string  `json:"cell"`
	Village                string  `json:"village"`
	LandUse                string  `json:"land_use"`
	MinValuePerSqm         float64 `json:"min_value_per_sqm"`
	WeightedAvgValuePerSqm float64 `json:"weighted_avg_value_per_sqm"`
	MaxValuePerSqm         float64 `json:"max_value_per_sqm"`
	TotalMinValue          float64 `json:"total_min_value"`
	TotalWeightedAvgValue  float64 `json:"total_weighted_avg_value"`
	TotalMaxValue          float64 `json:"total_max_value"`
	Error                  string  `json:"error,omitempty"`
}

// EstimateSearchHandler handles POST /api/v1/estimate-search (multi-field search only)
func EstimateSearchHandler(w http.ResponseWriter, r *http.Request) {
	var req EstimateSearchRequest
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "failed to read request body", http.StatusBadRequest)
		return
	}
	log.Printf("/api/v1/estimate-search raw body: %s", string(body))
	r.Body = io.NopCloser(strings.NewReader(string(body)))
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("/api/v1/estimate-search decode error: %v", err)
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}
	// Validate required fields
	if req.Province == "" || req.District == "" || req.Sector == "" || req.Cell == "" || req.Village == "" {
		resp := EstimateSearchResponse{Error: "All location fields (province, district, sector, cell, village) are required."}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(resp); err != nil {
			log.Printf("/api/v1/estimate-search encode error: %v", err)
		}
		return
	}

	// Use injected GORM repository for strict multi-field search
	ctx := r.Context()
	value, err := LandValueRepo.GetByAllFields(ctx, req.Province, req.District, req.Sector, req.Cell, req.Village)
	if err != nil {
		log.Printf("EstimateSearchHandler: No match found: %v", err)
		resp := EstimateSearchResponse{Error: "No land value data found for the provided location."}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(resp); err != nil {
			log.Printf("/api/v1/estimate-search encode error: %v", err)
		}
		return
	}

	// Calculate total values if plot_size_sqm is provided
	var totalMin, totalWeighted, totalMax float64
	if req.PlotSizeSqm > 0 {
		totalMin = value.MinValuePerSqm * req.PlotSizeSqm
		totalWeighted = value.WeightedAvgValuePerSqm * req.PlotSizeSqm
		totalMax = value.MaxValuePerSqm * req.PlotSizeSqm
	}

	resp := EstimateSearchResponse{
		Province:               value.Province,
		District:               value.District,
		Sector:                 value.Sector,
		Cell:                   value.Cell,
		Village:                value.Village,
		LandUse:                value.LandUse,
		MinValuePerSqm:         value.MinValuePerSqm,
		WeightedAvgValuePerSqm: value.WeightedAvgValuePerSqm,
		MaxValuePerSqm:         value.MaxValuePerSqm,
		TotalMinValue:          totalMin,
		TotalWeightedAvgValue:  totalWeighted,
		TotalMaxValue:          totalMax,
	}
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		log.Printf("/api/v1/estimate-search encode error: %v", err)
	}
}
