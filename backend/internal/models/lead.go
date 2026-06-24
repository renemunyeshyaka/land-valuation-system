package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"

	"gorm.io/gorm"
)

// JSONB is a generic type for PostgreSQL JSONB columns
type JSONB map[string]interface{}

func (j JSONB) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return json.Unmarshal(bytes, j)
}

// Lead represents a discovered prospect for AI customer targeting
type Lead struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Source
	Source    string `gorm:"size:50;not null;default:manual" json:"source"`
	SourceURL string `gorm:"type:text" json:"source_url,omitempty"`

	// Contact
	FirstName string `gorm:"size:100" json:"first_name,omitempty"`
	LastName  string `gorm:"size:100" json:"last_name,omitempty"`
	Email     string `gorm:"size:255;uniqueIndex" json:"email,omitempty"`
	Phone     string `gorm:"size:50;uniqueIndex" json:"phone,omitempty"`
	Company   string `gorm:"size:255" json:"company,omitempty"`
	Role      string `gorm:"size:50;index" json:"role,omitempty"` // owner, agent, developer, institution, other

	// Location
	Location string `gorm:"size:255" json:"location,omitempty"`
	District string `gorm:"size:100;index" json:"district,omitempty"`
	Sector   string `gorm:"size:100" json:"sector,omitempty"`
	Cell     string `gorm:"size:100" json:"cell,omitempty"`
	UPI      string `gorm:"size:50" json:"upi,omitempty"`

	// Preferences
	LanguagePref string `gorm:"size:10;default:en" json:"language_pref"` // en, fr, rw

	// AI Enrichment
	AIScore     float64   `gorm:"type:decimal(5,2);default:0;index:idx_leads_score" json:"ai_score"`
	AISegment   string    `gorm:"size:50;index" json:"ai_segment,omitempty"`
	AIInsights  JSONB     `gorm:"type:jsonb" json:"ai_insights,omitempty"`
	AILastScored *time.Time `json:"ai_last_scored,omitempty"`

	// Status
	Status string `gorm:"size:20;default:discovered;index" json:"status"`
	// discovered, enriched, scored, queued, contacted, engaged,
	// converted, unresponsive, warm_pool, blacklisted, unsubscribed

	// Unsubscribe / Opt-out
	UnsubscribedAt  *time.Time `json:"unsubscribed_at,omitempty"`
	UnsubscribeToken string    `gorm:"size:100;uniqueIndex" json:"unsubscribe_token,omitempty"`

	// Activity
	TotalEmails   int        `gorm:"default:0" json:"total_emails"`
	TotalWhatsApps int       `gorm:"default:0" json:"total_whatsapps"`
	LastContacted *time.Time `json:"last_contacted,omitempty"`
	ConvertedAt   *time.Time `json:"converted_at,omitempty"`
	ConvertedUserID *uint    `json:"converted_user_id,omitempty"`
}

// TableName overrides the table name
func (Lead) TableName() string {
	return "leads"
}

// BeforeCreate hook for default values
func (l *Lead) BeforeCreate(tx *gorm.DB) error {
	if l.Status == "" {
		l.Status = "discovered"
	}
	if l.LanguagePref == "" {
		l.LanguagePref = "en"
	}
	return nil
}

// Campaign represents an outreach campaign configuration
type Campaign struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Configuration
	Name        string `gorm:"size:255;not null" json:"name"`
	Description string `gorm:"type:text" json:"description,omitempty"`
	Type        string `gorm:"size:50;not null;index" json:"campaign_type"`
	// welcome, owner_outreach, agent_onboarding, reactivation, digest, seasonal

	Channel string `gorm:"size:20;not null" json:"channel"` // email, whatsapp, both

	// Targeting
	SegmentFilter JSONB `gorm:"type:jsonb" json:"segment_filter,omitempty"`
	TargetCount   int   `gorm:"default:0" json:"target_count"`

	// Content
	SubjectTemplate string `gorm:"type:text" json:"subject_template,omitempty"`
	BodyTemplate    string `gorm:"type:text" json:"body_template,omitempty"`
	Language        string `gorm:"size:10" json:"language,omitempty"` // en, fr, rw, all

	// Schedule
	Status      string     `gorm:"size:20;default:draft;index" json:"status"`
	ScheduledAt *time.Time `json:"scheduled_at,omitempty"`
	StartedAt   *time.Time `json:"started_at,omitempty"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`

	// Performance
	SentCount      int `gorm:"default:0" json:"sent_count"`
	OpenedCount    int `gorm:"default:0" json:"opened_count"`
	ClickedCount   int `gorm:"default:0" json:"clicked_count"`
	ConvertedCount int `gorm:"default:0" json:"converted_count"`

	// FK
	CreatedBy uint `gorm:"index" json:"created_by"`
}

// TableName overrides the table name
func (Campaign) TableName() string {
	return "campaigns"
}

// CampaignActivity represents a single outreach action to a lead within a campaign
type CampaignActivity struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	CreatedAt time.Time `json:"created_at"`

	CampaignID uint `gorm:"not null;index" json:"campaign_id"`
	LeadID     uint `gorm:"not null;index" json:"lead_id"`

	Channel string `gorm:"size:20;not null" json:"channel"` // email, whatsapp
	Status  string `gorm:"size:20;default:pending;index" json:"status"`
	// pending, sent, delivered, opened, clicked, bounced, failed

	Subject    string `gorm:"type:text" json:"subject,omitempty"`
	BodyPreview string `gorm:"size:100" json:"body_preview,omitempty"`
	TrackingID string `gorm:"size:100;uniqueIndex" json:"tracking_id,omitempty"`

	SentAt    *time.Time `json:"sent_at,omitempty"`
	OpenedAt  *time.Time `json:"opened_at,omitempty"`
	ClickedAt *time.Time `json:"clicked_at,omitempty"`

	ErrorMessage string `gorm:"type:text" json:"error_message,omitempty"`
}

// TableName overrides the table name
func (CampaignActivity) TableName() string {
	return "campaign_activities"
}

// LeadScore represents a historical scoring snapshot for a lead
type LeadScore struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	CreatedAt time.Time `json:"created_at"`

	LeadID   uint    `gorm:"not null;index" json:"lead_id"`
	Score    float64 `gorm:"type:decimal(5,2);not null" json:"score"`
	ScoreBreakdown JSONB `gorm:"type:jsonb" json:"score_breakdown,omitempty"`
	ScoredBy string  `gorm:"size:20;default:deepseek" json:"scored_by"`
}

// TableName overrides the table name
func (LeadScore) TableName() string {
	return "lead_scores"
}
