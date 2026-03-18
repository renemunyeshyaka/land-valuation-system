package handlers

import (
	"backend/internal/services"
	"backend/internal/utils"
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
)

type LandValueEstimateRequest struct {
	Province    string  `json:"province"`
	District    string  `json:"district"`
	Sector      string  `json:"sector"`
	Cell        string  `json:"cell"`
	Village     string  `json:"village"`
	PlotSizeSqm float64 `json:"plot_size_sqm"`
}

type LandValueEstimateResponse struct {
	Province               string  `json:"province"`
	District               string  `json:"district"`
	Sector                 string  `json:"sector"`
	Cell                   string  `json:"cell"`
	Village                string  `json:"village"`
	LandUse                string  `json:"land_use"`
	MinValuePerSqm         float64 `json:"min_value_per_sqm"`
	WeightedAvgValuePerSqm float64 `json:"weighted_avg_value_per_sqm"`
	MaxValuePerSqm         float64 `json:"max_value_per_sqm"`
	TotalMinValue          float64 `json:"total_min_value,omitempty"`
	TotalWeightedAvgValue  float64 `json:"total_weighted_avg_value,omitempty"`
	TotalMaxValue          float64 `json:"total_max_value,omitempty"`
	PromptForPlotSize      bool    `json:"prompt_for_plot_size"`
}

func LandValueEstimateHandler(estimationService *services.LandValueEstimationService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req LandValueEstimateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
			return
		}
		ctx := context.Background()
		min, avg, max, totalMin, totalAvg, totalMax, landUse, err := estimationService.EstimatePriceByAllFields(
			ctx,
			req.Province,
			req.District,
			req.Sector,
			req.Cell,
			req.Village,
			req.PlotSizeSqm,
		)
		if err != nil {
			utils.ErrorResponse(c, http.StatusNotFound, "No land value data found for the specified location", err.Error())
			return
		}
		resp := LandValueEstimateResponse{
			Province:               req.Province,
			District:               req.District,
			Sector:                 req.Sector,
			Cell:                   req.Cell,
			Village:                req.Village,
			LandUse:                landUse,
			MinValuePerSqm:         min,
			WeightedAvgValuePerSqm: avg,
			MaxValuePerSqm:         max,
			TotalMinValue:          totalMin,
			TotalWeightedAvgValue:  totalAvg,
			TotalMaxValue:          totalMax,
			PromptForPlotSize:      req.PlotSizeSqm <= 0,
		}
		utils.SuccessResponse(c, http.StatusOK, "Land value estimate successful", resp)
	}
}
