package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"backend/internal/config"
	"backend/internal/database"
	"backend/internal/models"
	"backend/internal/repository"
	"backend/internal/services"

	"github.com/joho/godotenv"
)

func main() {
	log.SetPrefix("[lead-aggregator] ")
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	// Load .env
	_ = godotenv.Load()

	// Load config and connect to database
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}
	db, err := database.NewPostgresConnection(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// AutoMigrate to ensure tables exist
	if err := database.AutoMigrate(db); err != nil {
		log.Printf("⚠️  AutoMigrate warning: %v", err)
	}

	// Initialize services
	leadRepo := repository.NewLeadRepository(db)
	aiService := services.NewAIService()

	// Check AI configuration
	if !aiService.IsConfigured() {
		log.Println("⚠️  DeepSeek AI not configured — leads will be stored without enrichment")
	}

	// Context with cancellation
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle graceful shutdown
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigCh
		log.Println("Shutting down...")
		cancel()
	}()

	log.Println("🚀 Lead Aggregator started")

	// Run the aggregation pipeline
	if err := runPipeline(ctx, leadRepo, aiService, db); err != nil {
		log.Fatalf("Pipeline failed: %v", err)
	}

	log.Println("✅ Lead Aggregator completed")
}

// runPipeline executes the full lead discovery → enrichment → storage pipeline
func runPipeline(ctx context.Context, leadRepo *repository.LeadRepository, aiService *services.AIService, db interface{}) error {
	startTime := time.Now()
	var totalDiscovered int
	var totalEnriched int

	// ==========================================
	// Step 1: Discover leads from external sources
	// ==========================================
	log.Println("Step 1/4: Discovering leads from external sources...")
	scraper := services.NewScraperService()

	// Discover from web scrapers
	scrapedLeads, err := scraper.DiscoverLeads(ctx)
	if err != nil {
		log.Printf("⚠️  Scraper discovery warning: %v", err)
	}
	for _, lead := range scrapedLeads {
		created, err := leadRepo.Create(ctx, lead)
		if err != nil {
			log.Printf("⚠️  Failed to create scraped lead: %v", err)
			continue
		}
		totalDiscovered++
		log.Printf("  ✓ Scraped lead: %s", created.Email)
	}

	// Discover from existing users
	userLeads, err := discoverFromUsers(ctx, db)
	if err != nil {
		log.Printf("⚠️  User discovery warning: %v", err)
	} else {
		for _, lead := range userLeads {
			created, err := leadRepo.Create(ctx, lead)
			if err != nil {
				log.Printf("⚠️  Failed to create lead from user: %v", err)
				continue
			}
			totalDiscovered++
			log.Printf("  ✓ Lead created from user: %s %s (score: %.2f)", created.FirstName, created.LastName, created.AIScore)
		}
		log.Printf("  → %d leads discovered from existing users", len(userLeads))
	}

	// Discover from source-specific sample data
	for _, source := range []string{"rlmua", "rdb"} {
		sampleLeads := services.GenerateSampleLeadsForSource(source)
		for _, lead := range sampleLeads {
			created, err := leadRepo.Create(ctx, lead)
			if err != nil {
				log.Printf("⚠️  Failed to create %s sample lead: %v", source, err)
				continue
			}
			totalDiscovered++
			log.Printf("  ✓ %s sample lead: %s %s (%s)", source, created.FirstName, created.LastName, created.Role)
		}
	}

	// ==========================================
	// Step 2: Discover leads from test/seed data
	// ==========================================
	log.Println("Step 2/4: Generating sample leads for testing...")
	sampleLeads := generateSampleLeads()

	// Deduplicate before inserting (email/phone unique constraints)
	sampleLeads = services.DeduplicateLeads(sampleLeads)
	log.Printf("  → %d unique sample leads after dedup", len(sampleLeads))

	for _, lead := range sampleLeads {
		created, err := leadRepo.Create(ctx, lead)
		if err != nil {
			log.Printf("⚠️  Failed to create lead %s: %v", lead.Email, err)
			continue
		}
		totalDiscovered++
		log.Printf("  ✓ Sample lead: %s %s (%s)", created.FirstName, created.LastName, created.Role)
	}

	// ==========================================
	// Step 3: AI Enrichment
	// ==========================================
	if aiService.IsConfigured() {
		log.Println("Step 3/4: Enriching leads with DeepSeek AI...")

		// Fetch unscored leads
		unscored, _, err := leadRepo.List(ctx, 1, 100, map[string]interface{}{
			"status": "discovered",
		})
		if err != nil {
			log.Printf("⚠️  Failed to fetch unscored leads: %v", err)
		} else {
			for _, lead := range unscored {
				if err := enrichLead(ctx, leadRepo, aiService, &lead); err != nil {
					log.Printf("⚠️  Failed to enrich lead %d: %v", lead.ID, err)
					continue
				}
				totalEnriched++
				log.Printf("  ✓ Enriched lead %d: score=%.2f segment=%s", lead.ID, lead.AIScore, lead.AISegment)
			}
		}
	} else {
		log.Println("Step 3/4: Skipping AI enrichment (not configured)")
	}

	// ==========================================
	// Step 4: Summary
	// ==========================================
	elapsed := time.Since(startTime)
	log.Println("Step 4/4: Summary")
	log.Printf("  📊 Total leads discovered: %d", totalDiscovered)
	log.Printf("  🧠 Total leads enriched:   %d", totalEnriched)
	log.Printf("  ⏱️  Duration:              %s", elapsed)

	return nil
}

// discoverFromUsers scans existing users and creates leads for those not already in the leads table
func discoverFromUsers(ctx context.Context, db interface{}) ([]*models.Lead, error) {
	// This would normally query users who haven't been converted to leads yet.
	// For now, return sample data that would come from real user analysis.
	return nil, nil
}

// enrichLead enriches a single lead with DeepSeek AI
func enrichLead(ctx context.Context, leadRepo *repository.LeadRepository, aiService *services.AIService, lead *models.Lead) error {
	rawData := map[string]interface{}{
		"first_name": lead.FirstName,
		"last_name":  lead.LastName,
		"email":      lead.Email,
		"phone":      lead.Phone,
		"company":    lead.Company,
		"role":       lead.Role,
		"location":   lead.Location,
		"district":   lead.District,
	}

	enriched, err := aiService.EnrichLead(ctx, rawData)
	if err != nil {
		return err
	}

	insights := models.JSONB{
		"estimated_property_value": enriched.EstimatedPropertyValue,
		"likely_role":              enriched.LikelyRole,
		"language_preference":      enriched.LanguagePreference,
		"interest_score":           enriched.InterestScore,
		"segment":                  enriched.Segment,
		"recommended_outreach":     enriched.RecommendedOutreach,
	}

	return leadRepo.UpdateAIScore(ctx, lead.ID, enriched.InterestScore, enriched.Segment, insights)
}

// generateUnsubscribeToken creates a random hex token for unsubscribe links
func generateUnsubscribeToken() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "fallback-token"
	}
	return hex.EncodeToString(b)
}

// generateSampleLeads creates sample leads for testing the pipeline
func generateSampleLeads() []*models.Lead {
	token := generateUnsubscribeToken()
	return []*models.Lead{
		{
			FirstName:    "Jean",
			LastName:     "Habimana",
			Email:        "jean.habimana@example.com",
			Phone:        "+250788100001",
			Role:         "owner",
			Location:     "Kacyiru, Gasabo",
			District:     "Gasabo",
			Sector:       "Kacyiru",
			Source:       "sample",
			Status:       "discovered",
			LanguagePref: "rw",
			UnsubscribeToken: token,
		},
		{
			FirstName:    "Alice",
			LastName:     "Mukamana",
			Email:        "alice.mukamana@example.com",
			Phone:        "+250788100002",
			Role:         "agent",
			Company:      "Vibe House Real Estate",
			Location:     "Kicukiro, Kigali",
			District:     "Kicukiro",
			Sector:       "Kicukiro",
			Source:       "sample",
			Status:       "discovered",
			LanguagePref: "en",
		},
		{
			FirstName:    "Patrick",
			LastName:     "Niyonzima",
			Email:        "patrick.niyonzima@example.com",
			Phone:        "+250788100003",
			Role:         "developer",
			Company:      "Rwanda Properties Ltd",
			Location:     "Nyarugenge, Kigali",
			District:     "Nyarugenge",
			Sector:       "Nyarugenge",
			Source:       "sample",
			Status:       "discovered",
			LanguagePref: "en",
		},
		{
			FirstName:    "Marie",
			LastName:     "Uwimana",
			Email:        "marie.uwimana@example.com",
			Phone:        "+250788100004",
			Role:         "owner",
			Location:     "Musanze, Northern Province",
			District:     "Musanze",
			Source:       "sample",
			Status:       "discovered",
			LanguagePref: "rw",
		},
		{
			FirstName:    "David",
			LastName:     "Kagame",
			Email:        "david.kagame@example.com",
			Phone:        "+250788100005",
			Role:         "institution",
			Company:      "Equity Bank Rwanda",
			Location:     "Kigali",
			District:     "Gasabo",
			Source:       "sample",
			Status:       "discovered",
			LanguagePref: "en",
		},
		{
			FirstName:    "Claudine",
			LastName:     "Ishimwe",
			Email:        "claudine.ishimwe@example.com",
			Phone:        "+250788100006",
			Role:         "agent",
			Company:      "Century Real Estate Rwanda",
			Location:     "Kicukiro, Kigali",
			District:     "Kicukiro",
			Source:       "sample",
			Status:       "discovered",
			LanguagePref: "fr",
		},
		{
			FirstName:    "Emmanuel",
			LastName:     "Bizimana",
			Email:        "emmanuel.bizimana@example.com",
			Phone:        "+250788100007",
			Role:         "developer",
			Company:      "Bizimana Construction",
			Location:     "Rubavu, Western Province",
			District:     "Rubavu",
			Source:       "sample",
			Status:       "discovered",
			LanguagePref: "rw",
		},
		{
			FirstName:    "Grace",
			LastName:     "Uwase",
			Email:        "grace.uwase@example.com",
			Phone:        "+250788100008",
			Role:         "owner",
			Location:     "Huye, Southern Province",
			District:     "Huye",
			Source:       "sample",
			Status:       "discovered",
			LanguagePref: "fr",
		},
	}
}
