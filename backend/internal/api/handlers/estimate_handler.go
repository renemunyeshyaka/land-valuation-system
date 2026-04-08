package handlers

import (
	"backend/internal/repository"
	"backend/internal/services"
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

		file, err := os.Open("data/village_land_values_search_ready.csv")
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
		getValue := func(rec map[string]interface{}, keys ...string) string {
			for _, k := range keys {
				if v, ok := rec[k]; ok && v != nil {
					s := strings.TrimSpace(fmt.Sprintf("%v", v))
					if s != "" {
						return s
					}
				}
			}
			return ""
		}
		var matches []map[string]interface{}
		var values []repository.VillageLandValue

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

			minStr := getValue(rec, "Minimum Value Per Sqm", "min_value_per_sqm")
			avgStr := getValue(rec, "Weighted Average Value Per Sqm", "weighted_avg_value_per_sqm")
			maxStr := getValue(rec, "Maximum Value Per Sqm", "max_value_per_sqm")
			if minStr == "" || avgStr == "" || maxStr == "" {
				continue
			}
			minVal, err := strconv.ParseFloat(minStr, 64)
			if err != nil {
				continue
			}
			avgVal, err := strconv.ParseFloat(avgStr, 64)
			if err != nil {
				continue
			}
			maxVal, err := strconv.ParseFloat(maxStr, 64)
			if err != nil {
				continue
			}
			values = append(values, repository.VillageLandValue{
				Province:               strings.TrimSpace(rec["province"].(string)),
				District:               strings.TrimSpace(rec["district"].(string)),
				Sector:                 strings.TrimSpace(rec["sector"].(string)),
				Cell:                   strings.TrimSpace(rec["cell"].(string)),
				Village:                strings.TrimSpace(rec["village"].(string)),
				LandUse:                getValue(rec, "Land Use", "land_use"),
				MinValuePerSqm:         minVal,
				WeightedAvgValuePerSqm: avgVal,
				MaxValuePerSqm:         maxVal,
			})
			matches = append(matches, rec)
		}

		if len(values) == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "No matching records found"})
			return
		}

		aggregated, err := services.AggregateLandValues(values)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "No matching records found"})
			return
		}

		resp := EstimateSearchResponse{
			MinValuePerSqm:         aggregated.MinValuePerSqm,
			MaxValuePerSqm:         aggregated.MaxValuePerSqm,
			WeightedAvgValuePerSqm: aggregated.WeightedAvgValuePerSqm,
			Count:                  aggregated.Count,
			Records:                matches,
		}
		c.JSON(http.StatusOK, gin.H{"data": resp})
	}
}
