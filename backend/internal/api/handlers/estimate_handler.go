package handlers

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type EstimateSearchRequest struct {
	Province string  `json:"province"`
	District string  `json:"district"`
	Sector   string  `json:"sector"`
	Cell     string  `json:"cell"`
	Village  string  `json:"village"`
	PlotSize float64 `json:"plot_size_sqm"`
}

type EstimateSearchResponse struct {
	MinValuePerSqm         float64                  `json:"min_value_per_sqm"`
	MaxValuePerSqm         float64                  `json:"max_value_per_sqm"`
	WeightedAvgValuePerSqm float64                  `json:"weighted_avg_value_per_sqm"`
	Count                  int                      `json:"count"`
	Records                []map[string]interface{} `json:"records"`
}

// EstimateSearchHandler implements multi-field land value search using the authoritative CSV
func EstimateSearchHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req EstimateSearchRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
			return
		}

		// Debug: Print incoming request
		fmt.Printf("[DEBUG] Incoming request: province='%s', district='%s', sector='%s', cell='%s', village='%s'\n", req.Province, req.District, req.Sector, req.Cell, req.Village)

		file, err := os.Open("data/village_land_values_joined_clean_converted.csv")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open CSV file", "details": err.Error()})
			return
		}
		defer file.Close()

		reader := csv.NewReader(file)
		reader.TrimLeadingSpace = true
		records, err := reader.ReadAll()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read CSV file", "details": err.Error()})
			return
		}

		// Debug: Print first 3 CSV rows
		fmt.Println("[DEBUG] First 3 CSV rows:")
		for i := 0; i < 4 && i < len(records); i++ {
			fmt.Printf("[DEBUG] Row %d: %v\n", i, records[i])
		}

		if len(records) < 2 {
			c.JSON(http.StatusNotFound, gin.H{"error": "No data in CSV"})
			return
		}

		header := records[0]
		var matches []map[string]interface{}
		var prices []float64

		for _, row := range records[1:] {
			rec := make(map[string]interface{})
			for i, col := range header {
				rec[col] = row[i]
			}
			// Match all fields (case-insensitive, trimmed)
			if !strings.EqualFold(strings.TrimSpace(rec["province"].(string)), strings.TrimSpace(req.Province)) {
				continue
			}
			if !strings.EqualFold(strings.TrimSpace(rec["district"].(string)), strings.TrimSpace(req.District)) {
				continue
			}
			if !strings.EqualFold(strings.TrimSpace(rec["sector"].(string)), strings.TrimSpace(req.Sector)) {
				continue
			}
			if !strings.EqualFold(strings.TrimSpace(rec["cell"].(string)), strings.TrimSpace(req.Cell)) {
				continue
			}
			if !strings.EqualFold(strings.TrimSpace(rec["village"].(string)), strings.TrimSpace(req.Village)) {
				continue
			}
			// Optionally, filter by property_type/zoning_type if needed

			// Parse price
			var priceStr string
			if rec["weighted_avg_value_per_sqm"] != nil {
				priceStr = fmt.Sprintf("%v", rec["weighted_avg_value_per_sqm"])
				priceStr = strings.TrimSpace(priceStr)
			}
			if priceStr == "" {
				continue
			}
			price, err := strconv.ParseFloat(priceStr, 64)
			if err != nil {
				continue
			}
			prices = append(prices, price)
			matches = append(matches, rec)
		}

		if len(prices) == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "No matching records found"})
			return
		}

		// Calculate min, max, weighted average
		minVal, maxVal, sum, weightedSum := prices[0], prices[0], 0.0, 0.0
		totalWeight := 0.0
		for i, price := range prices {
			if price < minVal {
				minVal = price
			}
			if price > maxVal {
				maxVal = price
			}
			// Use land_size_sqm as weight if available
			size := 1.0
			if sz, ok := matches[i]["land_size_sqm"]; ok {
				szStr := strings.TrimSpace(sz.(string))
				if szStr != "" {
					if szVal, err := strconv.ParseFloat(szStr, 64); err == nil {
						size = szVal
					}
				}
			}
			weightedSum += price * size
			totalWeight += size
			sum += price
		}
		weightedAvg := weightedSum / totalWeight

		resp := EstimateSearchResponse{
			MinValuePerSqm:         minVal,
			MaxValuePerSqm:         maxVal,
			WeightedAvgValuePerSqm: weightedAvg,
			Count:                  len(prices),
			Records:                matches,
		}
		c.JSON(http.StatusOK, gin.H{"data": resp})
	}
}
