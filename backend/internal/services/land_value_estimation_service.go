package services

import (
	"backend/internal/repository"
	"context"
	"errors"
)

type AggregatedLandValue struct {
	MinValuePerSqm         float64
	WeightedAvgValuePerSqm float64
	MaxValuePerSqm         float64
	LandUse                string
	Count                  int
}

type LandValueEstimationService struct {
	villageLandValueRepo *repository.VillageLandValueRepository
}

func NewLandValueEstimationService(villageLandValueRepo *repository.VillageLandValueRepository) *LandValueEstimationService {
	return &LandValueEstimationService{villageLandValueRepo: villageLandValueRepo}
}

func AggregateLandValues(values []repository.VillageLandValue) (*AggregatedLandValue, error) {
	if len(values) == 0 {
		return nil, errors.New("no land value data found for the specified location")
	}

	minVal := values[0].MinValuePerSqm
	maxVal := values[0].MaxValuePerSqm
	weightedSum := 0.0
	landUse := ""

	for _, value := range values {
		if value.MinValuePerSqm < minVal {
			minVal = value.MinValuePerSqm
		}
		if value.MaxValuePerSqm > maxVal {
			maxVal = value.MaxValuePerSqm
		}
		weightedSum += value.WeightedAvgValuePerSqm
		if landUse == "" && value.LandUse != "" {
			landUse = value.LandUse
		}
	}

	return &AggregatedLandValue{
		MinValuePerSqm:         minVal,
		WeightedAvgValuePerSqm: weightedSum / float64(len(values)),
		MaxValuePerSqm:         maxVal,
		LandUse:                landUse,
		Count:                  len(values),
	}, nil
}

// EstimatePriceByAllFields returns price per sqm and, if plotSizeSqm > 0, the total price, using all fields
func (s *LandValueEstimationService) EstimatePriceByAllFields(ctx context.Context, province, district, sector, cell, village string, plotSizeSqm float64) (min, avg, max, totalMin, totalAvg, totalMax float64, landUse string, err error) {
	values, err := s.villageLandValueRepo.GetAllByAllFields(ctx, province, district, sector, cell, village)
	if err != nil {
		return 0, 0, 0, 0, 0, 0, "", err
	}
	aggregated, err := AggregateLandValues(values)
	if err != nil {
		return 0, 0, 0, 0, 0, 0, "", err
	}
	min = aggregated.MinValuePerSqm
	avg = aggregated.WeightedAvgValuePerSqm
	max = aggregated.MaxValuePerSqm
	landUse = aggregated.LandUse
	if plotSizeSqm > 0 {
		totalMin = min * plotSizeSqm
		totalAvg = avg * plotSizeSqm
		totalMax = max * plotSizeSqm
	}
	return
}
