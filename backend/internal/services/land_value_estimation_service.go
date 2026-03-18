package services

import (
	"backend/internal/repository"
	"context"
)

type LandValueEstimationService struct {
	villageLandValueRepo *repository.VillageLandValueRepository
}

func NewLandValueEstimationService(villageLandValueRepo *repository.VillageLandValueRepository) *LandValueEstimationService {
	return &LandValueEstimationService{villageLandValueRepo: villageLandValueRepo}
}

// EstimatePriceByAllFields returns price per sqm and, if plotSizeSqm > 0, the total price, using all fields
func (s *LandValueEstimationService) EstimatePriceByAllFields(ctx context.Context, province, district, sector, cell, village string, plotSizeSqm float64) (min, avg, max, totalMin, totalAvg, totalMax float64, landUse string, err error) {
	value, err := s.villageLandValueRepo.GetByAllFields(ctx, province, district, sector, cell, village)
	if err != nil {
		return 0, 0, 0, 0, 0, 0, "", err
	}
	min = value.MinValuePerSqm
	avg = value.WeightedAvgValuePerSqm
	max = value.MaxValuePerSqm
	landUse = value.LandUse
	if plotSizeSqm > 0 {
		totalMin = min * plotSizeSqm
		totalAvg = avg * plotSizeSqm
		totalMax = max * plotSizeSqm
	}
	return
}
