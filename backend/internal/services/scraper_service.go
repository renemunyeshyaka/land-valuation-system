package services

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"

	"backend/internal/models"
)

// ============================================
// ScraperService — discovers leads from public Rwandan real estate sources
// ============================================

// ScraperSource defines a lead source with its configuration
type ScraperSource struct {
	Name    string
	BaseURL string
	Type    string // "rlmua", "rdb", "property_site"
}

// ScrapedLead represents a raw lead extracted from a source
type ScrapedLead struct {
	FirstName string
	LastName  string
	Email     string
	Phone     string
	Company   string
	Role      string
	Location  string
	District  string
	Source    string
	SourceURL string
}

// ScraperService handles lead discovery from external sources
type ScraperService struct {
	httpClient *http.Client
	sources    []ScraperSource
}

// NewScraperService creates a new ScraperService with configured sources
func NewScraperService() *ScraperService {
	return &ScraperService{
		httpClient: &http.Client{Timeout: 30 * time.Second},
		sources: []ScraperSource{
			{
				Name:    "Rwanda Land Management Authority",
				BaseURL: "https://www.lands.rw",
				Type:    "rlmua",
			},
			{
				Name:    "Rwanda Development Board",
				BaseURL: "https://rdb.rw",
				Type:    "rdb",
			},
		},
	}
}

// DiscoverLeads runs all configured scrapers and returns discovered leads
func (s *ScraperService) DiscoverLeads(ctx context.Context) ([]*models.Lead, error) {
	var allLeads []*models.Lead

	for _, source := range s.sources {
		select {
		case <-ctx.Done():
			return allLeads, ctx.Err()
		default:
		}

		leads, err := s.scrapeSource(ctx, source)
		if err != nil {
			log.Printf("[scraper] ⚠️  Source %s error: %v", source.Name, err)
			continue
		}
		allLeads = append(allLeads, leads...)
		log.Printf("[scraper] ✓ %s: %d leads discovered", source.Name, len(leads))
	}

	return allLeads, nil
}

// scrapeSource scrapes a single configured source
func (s *ScraperService) scrapeSource(ctx context.Context, source ScraperSource) ([]*models.Lead, error) {
	switch source.Type {
	case "rlmua":
		return s.scrapeRLMUA(ctx, source)
	case "rdb":
		return s.scrapeRDB(ctx, source)
	case "property_site":
		return s.scrapePropertySite(ctx, source)
	default:
		return nil, fmt.Errorf("unknown source type: %s", source.Type)
	}
}

// scrapeRLMUA scrapes the Rwanda Land Management Authority website for property/owner data
func (s *ScraperService) scrapeRLMUA(ctx context.Context, source ScraperSource) ([]*models.Lead, error) {
	// RLMUA is a government portal — in production, use their official data API/data feed.
	// For now, return nil as RLMUA requires authenticated access.
	// TODO: Integrate with RLMUA data-sharing agreement / API when available.
	log.Printf("[scraper] RLMUA scrape requires authenticated API access — returning empty set")
	return nil, nil
}

// scrapeRDB scrapes the Rwanda Development Board website for real estate listings
func (s *ScraperService) scrapeRDB(ctx context.Context, source ScraperSource) ([]*models.Lead, error) {
	// RDB does not directly list property owners — they provide investment data.
	// TODO: Use RDB's open data portal for investor/developer leads when API is available.
	log.Printf("[scraper] RDB scrape requires data-sharing agreement — returning empty set")
	return nil, nil
}

// scrapePropertySite scrapes a general property listing website for leads
func (s *ScraperService) scrapePropertySite(ctx context.Context, source ScraperSource) ([]*models.Lead, error) {
	// Generic property site scraper — looks for contact info patterns
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, source.BaseURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("User-Agent", "LandVal-LeadAggregator/1.0 (research; contact@landval.kcoders.org)")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status %d", resp.StatusCode)
	}

	// Email extraction heuristic
	emailRegex := regexp.MustCompile(`[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`)
	phoneRegex := regexp.MustCompile(`\+?250\d{9}|\+?25\d{9}`)

	// Read a limited amount of body for scanning
	buf := make([]byte, 1024*512) // 512KB max
	n, _ := resp.Body.Read(buf)
	content := string(buf[:n])

	emails := emailRegex.FindAllString(content, -1)
	phones := phoneRegex.FindAllString(content, -1)

	if len(emails) == 0 && len(phones) == 0 {
		return nil, nil
	}

	// Deduplicate emails
	seen := make(map[string]bool)
	var leads []*models.Lead

	for _, email := range emails {
		email = strings.ToLower(strings.TrimSpace(email))
		if seen[email] {
			continue
		}
		seen[email] = true

		// Skip generic/role-based emails
		if isGenericEmail(email) {
			continue
		}

		leads = append(leads, &models.Lead{
			Email:   email,
			Source:  source.Name,
			SourceURL: source.BaseURL,
			Status:  "discovered",
			Role:    inferRoleFromEmail(email),
		})
	}

	return leads, nil
}

// ============================================
// Deduplication
// ============================================

// DeduplicateLeads removes duplicates from a list of leads based on email/phone
func DeduplicateLeads(leads []*models.Lead) []*models.Lead {
	seen := make(map[string]bool)
	var unique []*models.Lead

	for _, lead := range leads {
		key := ""
		if lead.Email != "" {
			key = "email:" + strings.ToLower(lead.Email)
		} else if lead.Phone != "" {
			key = "phone:" + lead.Phone
		} else {
			key = fmt.Sprintf("name:%s-%s", lead.FirstName, lead.LastName)
		}

		if seen[key] {
			continue
		}
		seen[key] = true
		unique = append(unique, lead)
	}

	return unique
}

// ============================================
// Helpers
// ============================================

// isGenericEmail returns true for role-based or disposable email addresses
func isGenericEmail(email string) bool {
	generic := []string{
		"info@", "contact@", "admin@", "support@", "hello@",
		"noreply@", "no-reply@", "sales@", "marketing@",
		"webmaster@", "postmaster@", "hr@", "jobs@",
	}
	lower := strings.ToLower(email)
	for _, prefix := range generic {
		if strings.HasPrefix(lower, prefix) {
			return true
		}
	}
	return false
}

// inferRoleFromEmail attempts to infer the contact's role from their email domain
func inferRoleFromEmail(email string) string {
	domain := strings.ToLower(email[strings.LastIndex(email, "@")+1:])

	// Government
	if strings.HasSuffix(domain, ".gov.rw") || domain == "rlmua.gov.rw" || domain == "rdb.rw" {
		return "institution"
	}

	// Real estate agencies
	agencyDomains := []string{"vibehouse", "century", "knightfrank", "savills", "remax"}
	for _, d := range agencyDomains {
		if strings.Contains(domain, d) {
			return "agent"
		}
	}

	// Banks & financial institutions
	bankDomains := []string{"bank", "equity", "bpr", "cogebanque", "kcb"}
	for _, d := range bankDomains {
		if strings.Contains(domain, d) {
			return "institution"
		}
	}

	// Property developers
	devDomains := []string{"property", "realestate", "construction", "estate"}
	for _, d := range devDomains {
		if strings.Contains(domain, d) {
			return "developer"
		}
	}

	return "owner"
}

// GenerateSampleLeadsForSource creates sample leads specific to a source
// Used for testing the scraper pipeline before real sources are connected
func GenerateSampleLeadsForSource(source string) []*models.Lead {
	switch source {
	case "rlmua":
		return []*models.Lead{
			{
				FirstName: "Jean-Pierre", LastName: "Habimana",
				Email: "jp.habimana@lands.rw", Phone: "+250788200001",
				Role: "owner", District: "Gasabo", Source: "rlmua_sample",
				Status: "discovered", LanguagePref: "rw",
			},
			{
				FirstName: "Aline", LastName: "Mukeshimana",
				Email: "aline.muke@gmail.com", Phone: "+250788200002",
				Role: "owner", District: "Nyarugenge", Source: "rlmua_sample",
				Status: "discovered", LanguagePref: "rw",
			},
		}
	case "rdb":
		return []*models.Lead{
			{
				FirstName: "Patrick", LastName: "Niyonzima",
				Email: "patrick@rwandaproperties.rw", Phone: "+250788200003",
				Role: "developer", Company: "Rwanda Properties Ltd",
				District: "Kicukiro", Source: "rdb_sample",
				Status: "discovered", LanguagePref: "en",
			},
			{
				FirstName: "Marie-Goretti", LastName: "Uwimana",
				Email: "mg.uwimana@cogebanque.rw", Phone: "+250788200004",
				Role: "institution", Company: "Cogebanque",
				District: "Gasabo", Source: "rdb_sample",
				Status: "discovered", LanguagePref: "fr",
			},
		}
	default:
		return nil
	}
}
