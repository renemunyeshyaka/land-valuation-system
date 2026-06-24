package services

import (
	"context"
	"fmt"
	"log"
	"os"
)

// WhatsAppProvider defines the interface for WhatsApp messaging providers
type WhatsAppProvider interface {
	// SendMessage sends a WhatsApp message to the given phone number
	SendMessage(ctx context.Context, to, message string) error
}

// WhatsAppService handles WhatsApp outreach for campaigns
type WhatsAppService struct {
	provider WhatsAppProvider
}

// SimulationProvider is a no-op provider that logs messages instead of sending them
type SimulationProvider struct{}

func (p *SimulationProvider) SendMessage(ctx context.Context, to, message string) error {
	log.Printf("[WHATSAPP SIMULATION] To: %s | Length: %d chars", to, len(message))
	log.Printf("[WHATSAPP SIMULATION] Body: %.200s...", message)
	return nil
}

// TwilioProvider sends WhatsApp messages via Twilio API
type TwilioProvider struct {
	accountSID string
	authToken  string
	fromNumber string
}

func NewTwilioProvider(accountSID, authToken, fromNumber string) *TwilioProvider {
	return &TwilioProvider{
		accountSID: accountSID,
		authToken:  authToken,
		fromNumber: fromNumber,
	}
}

func (p *TwilioProvider) SendMessage(ctx context.Context, to, message string) error {
	// Twilio WhatsApp API integration would go here.
	// Requires: github.com/twilio/twilio-go SDK
	// POST https://api.twilio.com/2010-04-01/Accounts/{SID}/Messages.json
	// Body: From=whatsapp:+14155238886&Body=...&To=whatsapp:+2507XXXXXXXX
	return fmt.Errorf("Twilio provider not yet implemented — use simulation mode")
}

// NewWhatsAppService creates a new WhatsApp service based on the configured provider
func NewWhatsAppService() *WhatsAppService {
	provider := getEnvDefault("WHATSAPP_PROVIDER", "simulation")

	var wp WhatsAppProvider

	switch provider {
	case "twilio":
		accountSID := os.Getenv("TWILIO_ACCOUNT_SID")
		authToken := os.Getenv("TWILIO_AUTH_TOKEN")
		fromNumber := os.Getenv("TWILIO_WHATSAPP_NUMBER")
		if accountSID == "" || authToken == "" || fromNumber == "" {
			log.Println("⚠️  Twilio credentials incomplete — falling back to simulation")
			wp = &SimulationProvider{}
		} else {
			wp = NewTwilioProvider(accountSID, authToken, fromNumber)
		}
	default:
		wp = &SimulationProvider{}
	}

	return &WhatsAppService{provider: wp}
}

// SendCampaignMessage sends a campaign WhatsApp message to a lead
func (s *WhatsAppService) SendCampaignMessage(ctx context.Context, toPhone, message string) error {
	if toPhone == "" {
		return fmt.Errorf("phone number is required")
	}
	return s.provider.SendMessage(ctx, toPhone, message)
}

// IsSimulation returns true if the service is in simulation mode
func (s *WhatsAppService) IsSimulation() bool {
	_, ok := s.provider.(*SimulationProvider)
	return ok
}
