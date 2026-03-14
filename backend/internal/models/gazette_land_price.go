package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// GazetteLandPrice stores official land reference prices from gazette editions.
// A new gazette release can be loaded as a new version without deleting older versions.
type GazetteLandPrice struct {
	ID uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`

	GazetteVersion string     `gorm:"size:40;not null;index" json:"gazette_version"`
	SourceDocument string     `gorm:"type:text;not null" json:"source_document"`
	EffectiveFrom  time.Time  `gorm:"type:date;not null;index" json:"effective_from"`
	EffectiveTo    *time.Time `gorm:"type:date" json:"effective_to,omitempty"`
	IsActive       bool       `gorm:"not null;default:true;index" json:"is_active"`

	Province           string `gorm:"size:100;not null;index:idx_gazette_location" json:"province"`
	District           string `gorm:"size:100;not null;index:idx_gazette_location" json:"district"`
	Sector             string `gorm:"size:100;not null;index:idx_gazette_location" json:"sector"`
	AreaClassification string `gorm:"size:30;not null;default:unknown" json:"area_classification"`

	MinimumValuePerSqm     float64 `gorm:"type:decimal(15,2);not null" json:"minimum_value_per_sqm"`
	WeightedAvgValuePerSqm float64 `gorm:"type:decimal(15,2);not null" json:"weighted_avg_value_per_sqm"`
	MaximumValuePerSqm     float64 `gorm:"type:decimal(15,2);not null" json:"maximum_value_per_sqm"`

	ConfidenceScore float64 `gorm:"type:decimal(5,2);not null;default:1.0" json:"confidence_score"`
	RawLine         string  `gorm:"type:text" json:"raw_line,omitempty"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (g *GazetteLandPrice) BeforeCreate(tx *gorm.DB) error {
	if g.ID == uuid.Nil {
		g.ID = uuid.New()
	}
	return nil
}
