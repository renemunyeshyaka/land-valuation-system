package services

import (
	"backend/internal/repository"
	"math"
	"testing"
)

func TestAggregateLandValues(t *testing.T) {
	values := []repository.VillageLandValue{
		{MinValuePerSqm: 270, WeightedAvgValuePerSqm: 725, MaxValuePerSqm: 2730},
		{MinValuePerSqm: 281, WeightedAvgValuePerSqm: 853, MaxValuePerSqm: 8080},
		{MinValuePerSqm: 675, WeightedAvgValuePerSqm: 1260, MaxValuePerSqm: 3167},
		{MinValuePerSqm: 226, WeightedAvgValuePerSqm: 948, MaxValuePerSqm: 5371},
	}

	aggregated, err := AggregateLandValues(values)
	if err != nil {
		t.Fatalf("AggregateLandValues returned error: %v", err)
	}

	if aggregated.MinValuePerSqm != 226 {
		t.Fatalf("expected min 226, got %v", aggregated.MinValuePerSqm)
	}
	if math.Abs(aggregated.WeightedAvgValuePerSqm-946.5) > 0.000001 {
		t.Fatalf("expected weighted avg 946.5, got %v", aggregated.WeightedAvgValuePerSqm)
	}
	if aggregated.MaxValuePerSqm != 8080 {
		t.Fatalf("expected max 8080, got %v", aggregated.MaxValuePerSqm)
	}
	if aggregated.Count != 4 {
		t.Fatalf("expected count 4, got %d", aggregated.Count)
	}
}

func TestAggregateLandValuesEmpty(t *testing.T) {
	_, err := AggregateLandValues(nil)
	if err == nil {
		t.Fatal("expected error for empty values slice")
	}
}
