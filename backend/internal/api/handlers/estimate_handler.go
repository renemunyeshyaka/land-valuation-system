package handlers

import (
	"backend/internal/models"
	"backend/internal/services"
	"backend/internal/utils"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

type EstimateSearchRequest struct {
	UPI      string `json:"upi"`
	District string `json:"district"`
	Sector   string `json:"sector"`
	Cell     string `json:"cell"`
}

type EstimateSearchResponse struct {
	Parcel         map[string]interface{} `json:"parcel"`
	Considerations map[string]bool        `json:"considerations"`
	Prices         []float64              `json:"prices"`
}

// EstimateSearchHandler handles refined estimate search
func EstimateSearchHandler(valuationService *services.ValuationService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req EstimateSearchRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "At least plot number or UPI is required", err.Error())
			return
		}
		// Debug log incoming search
		log.Printf("EstimateSearchHandler: Search district='%s', sector='%s', cell='%s', upi='%s'", req.District, req.Sector, req.Cell, req.UPI)

		filter := models.LandParcelFilter{
			UPI: req.UPI,
			District: req.District,
			Sector: req.Sector,
			Cell: req.Cell,
			PlotNumber: req.UPI, // If UPI is just a plot number
		}
		parcels, _, err := valuationService.LandParcelRepo().FindAll(filter)
		log.Printf("EstimateSearchHandler: Parcels found: %d, err: %v", len(parcels), err)
		if err != nil || len(parcels) == 0 {
			utils.ErrorResponse(c, http.StatusNotFound, "Land parcel not found for provided details", "")
			return
		}
		parcel := parcels[0]

		// Check for missing/zero values
		if parcel.BasePricePerSqm == 0 || parcel.LandSizeSqm == 0 || parcel.ZoneCoefficient == 0 {
			utils.ErrorResponse(c, http.StatusUnprocessableEntity, "Parcel data incomplete for estimation (missing base price, size, or zone coefficient)", "")
			return
		}

		// Evaluate six gazette considerations (stubbed: all false)
		considerations := map[string]bool{
			"water":         false,
			"electricity":   false,
			"school":        false,
			"health_center": false,
			"main_road":     false,
			"market":        false,
		}
		// TODO: Implement real geospatial/feature checks using Mapbox API

		// Retrieve three official price options (stub: base, base*1.1, base*0.9)
		base := parcel.BasePricePerSqm * parcel.LandSizeSqm * parcel.ZoneCoefficient
		prices := []float64{base, base * 1.1, base * 0.9}

		resp := EstimateSearchResponse{
			Parcel:         parcel.ToJSON(),
			Considerations: considerations,
			Prices:         prices,
		}
		utils.SuccessResponse(c, http.StatusOK, "Estimate search successful", resp)
	}
}
