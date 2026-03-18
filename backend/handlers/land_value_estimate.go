package handlers

import (
	"backend/internal/repository"
	"encoding/json"
	"log"
	"net/http"
)

type LandValueEstimateRequest struct {
	Province string  `json:"province"`
	District string  `json:"district"`
	Sector   string  `json:"sector"`
	Cell     string  `json:"cell"`
	Village  string  `json:"village"`
	PlotSize float64 `json:"plot_size"`
}

type LandValueEstimateResponse struct {
	Province  string  `json:"province"`
	District  string  `json:"district"`
	Sector    string  `json:"sector"`
	Cell      string  `json:"cell"`
	Village   string  `json:"village"`
	UnitPrice float64 `json:"unit_price"`
	PriceType string  `json:"price_type"`
	PlotSize  float64 `json:"plot_size"`
	Total     float64 `json:"total"`
	Error     string  `json:"error,omitempty"`
}

// You must set this from main.go after initializing the repo
var LandValueRepo *repository.VillageLandValueRepository

func LandValueEstimateHandler(w http.ResponseWriter, r *http.Request) {
	var req LandValueEstimateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}
	if req.Province == "" || req.District == "" || req.Sector == "" || req.Cell == "" || req.Village == "" || req.PlotSize <= 0 {
		resp := LandValueEstimateResponse{Error: "All fields are required and plot_size must be positive (district required)."}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
		return
	}
	// Query the repository (case-insensitive, alternate name logic)
	val, err := LandValueRepo.GetByAllFields(r.Context(), req.Province, req.District, req.Sector, req.Cell, req.Village)
	if err != nil {
		log.Printf("LandValueEstimateHandler: %v", err)
		resp := LandValueEstimateResponse{Error: "Land parcel not found for provided details"}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
		return
	}
	// Use weighted average if available, else min, else max
	unitPrice := val.WeightedAvgValuePerSqm
	priceType := "Weighted Average Value Per Sqm"
	if unitPrice == 0 && val.MinValuePerSqm > 0 {
		unitPrice = val.MinValuePerSqm
		priceType = "Minimum Value Per Sqm"
	} else if unitPrice == 0 && val.MaxValuePerSqm > 0 {
		unitPrice = val.MaxValuePerSqm
		priceType = "Maximum Value Per Sqm"
	}
	total := val.MaxValuePerSqm * req.PlotSize
	resp := LandValueEstimateResponse{
		Province:  req.Province,
		District:  req.District,
		Sector:    req.Sector,
		Cell:      req.Cell,
		Village:   req.Village,
		UnitPrice: unitPrice,
		PriceType: priceType,
		PlotSize:  req.PlotSize,
		Total:     total,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
