package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"time"

	"backend/internal/models"
	"backend/internal/repository"
)

// CampaignWorker processes running campaigns: sends emails/WhatsApp, tracks activities
type CampaignWorker struct {
	campaignRepo  *repository.CampaignRepository
	leadRepo      *repository.LeadRepository
	aiService     *AIService
	emailService  *EmailService
	whatsApp      *WhatsAppService
	trackingBase  string
}

// NewCampaignWorker creates a new campaign worker
func NewCampaignWorker(
	campaignRepo *repository.CampaignRepository,
	leadRepo *repository.LeadRepository,
	aiService *AIService,
	emailService *EmailService,
	whatsApp *WhatsAppService,
	trackingBase string,
) *CampaignWorker {
	return &CampaignWorker{
		campaignRepo: campaignRepo,
		leadRepo:     leadRepo,
		aiService:    aiService,
		emailService: emailService,
		whatsApp:     whatsApp,
		trackingBase: trackingBase,
	}
}

// ProcessCampaign processes a single campaign — sends messages to its target leads
func (w *CampaignWorker) ProcessCampaign(ctx context.Context, campaignID uint) error {
	campaign, err := w.campaignRepo.GetByID(ctx, campaignID)
	if err != nil {
		return fmt.Errorf("failed to get campaign: %w", err)
	}

	if campaign.Status != "running" {
		return fmt.Errorf("campaign %d is not running (status: %s)", campaignID, campaign.Status)
	}

	log.Printf("[campaign-worker] Processing campaign %q (ID=%d, channel=%s)", campaign.Name, campaign.ID, campaign.Channel)

	// Fetch leads matching the campaign's segment filter
	leads, total, err := w.fetchTargetLeads(ctx, campaign)
	if err != nil {
		return fmt.Errorf("failed to fetch target leads: %w", err)
	}

	log.Printf("[campaign-worker] Found %d target leads for campaign %q", total, campaign.Name)

	var sentCount int
	for _, lead := range leads {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		if err := w.sendToLead(ctx, campaign, &lead); err != nil {
			log.Printf("[campaign-worker] ⚠️  Failed to send to lead %d (%s): %v", lead.ID, lead.Email, err)
			continue
		}
		sentCount++
	}

	// Mark campaign as completed
	if err := w.campaignRepo.UpdateStatus(ctx, campaign.ID, "completed"); err != nil {
		log.Printf("[campaign-worker] ⚠️  Failed to mark campaign as completed: %v", err)
	}

	log.Printf("[campaign-worker] ✅ Campaign %q complete: %d/%d sent", campaign.Name, sentCount, total)
	return nil
}

// fetchTargetLeads retrieves leads matching the campaign's segment filter
func (w *CampaignWorker) fetchTargetLeads(ctx context.Context, campaign *models.Campaign) ([]models.Lead, int64, error) {
	filters := map[string]interface{}{
		"status": "discovered",
	}

	// Apply segment filter from campaign
	if campaign.SegmentFilter != nil {
		if segment, ok := campaign.SegmentFilter["ai_segment"]; ok {
			filters["ai_segment"] = segment
		}
		if minScore, ok := campaign.SegmentFilter["min_score"]; ok {
			filters["min_score"] = minScore
		}
	}

	return w.leadRepo.List(ctx, 1, 100, filters)
}

// sendToLead sends a campaign message to a single lead via the appropriate channel
func (w *CampaignWorker) sendToLead(ctx context.Context, campaign *models.Campaign, lead *models.Lead) error {
	// Generate tracking ID
	trackingID := generateTrackingID()

	// Create campaign activity record
	activity := &models.CampaignActivity{
		CampaignID: campaign.ID,
		LeadID:     lead.ID,
		Channel:    campaign.Channel,
		Status:     "pending",
		TrackingID: trackingID,
	}

	created, err := w.campaignRepo.CreateActivity(ctx, activity)
	if err != nil {
		return fmt.Errorf("failed to create activity: %w", err)
	}

	// Determine message language
	lang := campaign.Language
	if lang == "all" {
		lang = lead.LanguagePref
		if lang == "" {
			lang = "en"
		}
	}

	// Send based on channel
	switch campaign.Channel {
	case "email":
		if err := w.sendEmail(ctx, campaign, lead, trackingID, lang); err != nil {
			return err
		}
		if err := w.campaignRepo.UpdateActivityStatus(ctx, created.ID, "sent", nil); err != nil {
			log.Printf("[campaign-worker] ⚠️  Failed to update activity status: %v", err)
		}
		_ = w.campaignRepo.IncrementSent(ctx, campaign.ID)
		_ = w.leadRepo.UpdateStatus(ctx, lead.ID, "contacted")

	case "whatsapp":
		if err := w.sendWhatsApp(ctx, campaign, lead, lang); err != nil {
			return err
		}
		if err := w.campaignRepo.UpdateActivityStatus(ctx, created.ID, "sent", nil); err != nil {
			log.Printf("[campaign-worker] ⚠️  Failed to update activity status: %v", err)
		}
		_ = w.campaignRepo.IncrementSent(ctx, campaign.ID)
		_ = w.leadRepo.UpdateStatus(ctx, lead.ID, "contacted")

	case "both":
		// Send email
		if err := w.sendEmail(ctx, campaign, lead, trackingID, lang); err != nil {
			log.Printf("[campaign-worker] ⚠️  Email failed for lead %d: %v", lead.ID, err)
		} else {
			_ = w.campaignRepo.IncrementSent(ctx, campaign.ID)
		}
		// Send WhatsApp
		if err := w.sendWhatsApp(ctx, campaign, lead, lang); err != nil {
			log.Printf("[campaign-worker] ⚠️  WhatsApp failed for lead %d: %v", lead.ID, err)
		} else {
			_ = w.campaignRepo.IncrementSent(ctx, campaign.ID)
		}
		_ = w.campaignRepo.UpdateActivityStatus(ctx, created.ID, "sent", nil)
		_ = w.leadRepo.UpdateStatus(ctx, lead.ID, "contacted")
	}

	return nil
}

// sendEmail sends a campaign email with tracking and unsubscribe
func (w *CampaignWorker) sendEmail(ctx context.Context, campaign *models.Campaign, lead *models.Lead, trackingID, lang string) error {
	if lead.Email == "" {
		return fmt.Errorf("lead %d has no email", lead.ID)
	}

	// Use AI-generated content if no template is set
	body := campaign.BodyTemplate
	subject := campaign.SubjectTemplate

	if body == "" && w.aiService.IsConfigured() {
		content, err := w.aiService.GenerateCampaignContent(ctx, lead, "email", lang)
		if err == nil {
			subject = content.Subject
			body = content.Body
		}
	}

	if body == "" {
		body = fmt.Sprintf("Hello %s,\n\nThank you for your interest in Land Valuation System. We have properties and valuation services that may interest you.\n\nVisit https://landval.kcoders.org to learn more.", lead.FirstName)
	}
	if subject == "" {
		subject = fmt.Sprintf("LandVal — %s", campaign.Name)
	}

	// Wrap body in HTML with tracking
	htmlBody := fmt.Sprintf(`<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;padding:20px;">
		<h2 style="color:#0b5e42;">%s</h2>
		<p>%s</p>
	</body></html>`, subject, body)

	// Ensure lead has unsubscribe token
	if lead.UnsubscribeToken == "" {
		token := generateTrackingID()
		lead.UnsubscribeToken = token
		_ = w.leadRepo.SetUnsubscribeToken(ctx, lead.ID, token)
	}

	return w.emailService.SendCampaignEmail(lead.Email, subject, htmlBody, trackingID, w.trackingBase, lead.UnsubscribeToken)
}

// sendWhatsApp sends a campaign WhatsApp message
func (w *CampaignWorker) sendWhatsApp(ctx context.Context, campaign *models.Campaign, lead *models.Lead, lang string) error {
	if lead.Phone == "" {
		return fmt.Errorf("lead %d has no phone number", lead.ID)
	}

	message := campaign.BodyTemplate
	if message == "" && w.aiService.IsConfigured() {
		content, err := w.aiService.GenerateCampaignContent(ctx, lead, "whatsapp", lang)
		if err == nil {
			message = content.Body
		}
	}

	if message == "" {
		message = fmt.Sprintf("Hello %s! Check out Land Valuation System at https://landval.kcoders.org", lead.FirstName)
	}

	return w.whatsApp.SendCampaignMessage(ctx, lead.Phone, message)
}

// ProcessAllRunningCampaigns processes all campaigns with "running" status
func (w *CampaignWorker) ProcessAllRunningCampaigns(ctx context.Context) error {
	campaigns, total, err := w.campaignRepo.List(ctx, 1, 50, map[string]interface{}{
		"status": "running",
	})
	if err != nil {
		return fmt.Errorf("failed to list running campaigns: %w", err)
	}

	if total == 0 {
		log.Println("[campaign-worker] No running campaigns to process")
		return nil
	}

	log.Printf("[campaign-worker] Processing %d running campaigns", total)

	for _, campaign := range campaigns {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		if err := w.ProcessCampaign(ctx, campaign.ID); err != nil {
			log.Printf("[campaign-worker] ⚠️  Campaign %d (%s) failed: %v", campaign.ID, campaign.Name, err)
			continue
		}
	}

	return nil
}

// generateTrackingID creates a unique tracking identifier
func generateTrackingID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("track-%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(b)
}
