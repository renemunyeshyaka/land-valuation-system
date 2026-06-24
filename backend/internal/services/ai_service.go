package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"backend/internal/models"
)

// ============================================
// Types
// ============================================

// AIService handles all DeepSeek AI interactions for customer targeting
type AIService struct {
	apiKey    string
	model     string
	baseURL   string
	httpClient *http.Client
}

// DeepSeekRequest is the request body sent to DeepSeek chat completions API
type DeepSeekRequest struct {
	Model       string            `json:"model"`
	Messages    []DeepSeekMessage `json:"messages"`
	Temperature float64           `json:"temperature,omitempty"`
	MaxTokens   int               `json:"max_tokens,omitempty"`
}

// DeepSeekMessage is a single message in the chat conversation
type DeepSeekMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// DeepSeekResponse is the response from DeepSeek chat completions API
type DeepSeekResponse struct {
	ID      string             `json:"id"`
	Object  string             `json:"object"`
	Created int64              `json:"created"`
	Model   string             `json:"model"`
	Choices []DeepSeekChoice   `json:"choices"`
	Usage   DeepSeekUsage      `json:"usage"`
	Error   *DeepSeekError     `json:"error,omitempty"`
}

// DeepSeekChoice represents a single choice in the response
type DeepSeekChoice struct {
	Index        int              `json:"index"`
	Message      DeepSeekMessage  `json:"message"`
	FinishReason string           `json:"finish_reason"`
}

// DeepSeekUsage tracks token usage
type DeepSeekUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// DeepSeekError represents an API error
type DeepSeekError struct {
	Message string `json:"message"`
	Type    string `json:"type"`
	Code    string `json:"code"`
}

// ============================================
// Enrichment / Scoring / Content Types
// ============================================

// EnrichedLeadData is the AI-enriched data returned by DeepSeek
type EnrichedLeadData struct {
	EstimatedPropertyValue  string  `json:"estimated_property_value"`
	LikelyRole              string  `json:"likely_role"`
	LanguagePreference      string  `json:"language_preference"`
	InterestScore           float64 `json:"interest_score"`
	Segment                 string  `json:"segment"`
	RecommendedOutreach     string  `json:"recommended_outreach"`
	PersonalizedMessageKey  string  `json:"personalized_message_template"`
	SimilarLeadsCluster     string  `json:"similar_leads_cluster"`
}

// CampaignContent is AI-generated outreach content
type CampaignContent struct {
	Subject     string `json:"subject"`
	Body        string `json:"body"`
	Language    string `json:"language"`
	Tone        string `json:"tone"`
}

// PerformanceInsights is AI-generated campaign analysis
type PerformanceInsights struct {
	Summary        string            `json:"summary"`
	TopSegment     string            `json:"top_segment"`
	Recommendation string            `json:"recommendation"`
	SegmentScores  map[string]float64 `json:"segment_scores"`
}

// ============================================
// Constructor
// ============================================

// NewAIService creates a new AIService with credentials from environment variables
func NewAIService() *AIService {
	return &AIService{
		apiKey:    os.Getenv("DEEPSEEK_API_KEY"),
		model:     getEnvDefault("DEEPSEEK_MODEL", "deepseek-chat"),
		baseURL:   getEnvDefault("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1"),
		httpClient: &http.Client{Timeout: 60 * time.Second},
	}
}

func getEnvDefault(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

// ============================================
// Core API Call
// ============================================

// callDeepSeek sends a prompt to DeepSeek and returns the response text
func (s *AIService) callDeepSeek(ctx context.Context, systemPrompt, userPrompt string, temperature float64) (string, error) {
	if s.apiKey == "" {
		return "", fmt.Errorf("DEEPSEEK_API_KEY is not configured")
	}

	reqBody := DeepSeekRequest{
		Model: s.model,
		Messages: []DeepSeekMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userPrompt},
		},
		Temperature: temperature,
		MaxTokens:   2048,
	}

	payload, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", s.baseURL+"/chat/completions", bytes.NewReader(payload))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+s.apiKey)

	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		var apiErr DeepSeekResponse
		if json.Unmarshal(body, &apiErr) == nil && apiErr.Error != nil {
			return "", fmt.Errorf("DeepSeek API error (HTTP %d): %s", resp.StatusCode, apiErr.Error.Message)
		}
		return "", fmt.Errorf("DeepSeek API returned HTTP %d: %s", resp.StatusCode, string(body))
	}

	var result DeepSeekResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	if len(result.Choices) == 0 {
		return "", fmt.Errorf("DeepSeek returned no choices")
	}

	return strings.TrimSpace(result.Choices[0].Message.Content), nil
}

// callDeepSeekJSON sends a prompt and expects a JSON response, parsing it into the target
func (s *AIService) callDeepSeekJSON(ctx context.Context, systemPrompt, userPrompt string, temperature float64, target interface{}) error {
	// Instruct the model to return only valid JSON
	jsonPrompt := userPrompt + "\n\nReturn ONLY valid JSON. No markdown, no code blocks, no explanation."

	content, err := s.callDeepSeek(ctx, systemPrompt, jsonPrompt, temperature)
	if err != nil {
		return err
	}

	// Strip any markdown code block markers the model might add
	content = stripMarkdownJSON(content)

	if err := json.Unmarshal([]byte(content), target); err != nil {
		return fmt.Errorf("failed to parse AI response as JSON: %w\nRaw response: %s", err, content)
	}

	return nil
}

// stripMarkdownJSON removes ```json ... ``` markers if present
func stripMarkdownJSON(s string) string {
	s = strings.TrimSpace(s)
	if strings.HasPrefix(s, "```") {
		// Find first newline after opening ```
		if idx := strings.Index(s, "\n"); idx != -1 {
			s = s[idx+1:]
		}
		// Remove trailing ```
		if idx := strings.LastIndex(s, "```"); idx != -1 {
			s = s[:idx]
		}
	}
	return strings.TrimSpace(s)
}

// ============================================
// Lead Enrichment
// ============================================

// System prompt for lead enrichment
const leadEnrichmentPrompt = `You are LandVal Assistant, an AI customer intelligence specialist for the Land Valuation System (https://landval.kcoders.org/), operating in Rwanda.

Analyze the raw lead data and enrich it with intelligence. Return a JSON object with:
- estimated_property_value: estimated market value in RWF (string with currency)
- likely_role: one of "owner", "agent", "developer", "institution", "other"
- language_preference: one of "en", "fr", "rw"
- interest_score: float between 0.0 and 1.0
- segment: one of "high_value_owner", "mid_value_owner", "agent", "developer", "institution", "diaspora", "other"
- recommended_outreach: one of "email", "whatsapp", "both"
- personalized_message_template: template key string
- similar_leads_cluster: cluster ID or null`

// EnrichLead enriches raw lead data using DeepSeek AI
func (s *AIService) EnrichLead(ctx context.Context, rawData map[string]interface{}) (*EnrichedLeadData, error) {
	rawJSON, err := json.Marshal(rawData)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal raw data: %w", err)
	}

	userPrompt := fmt.Sprintf("Raw Lead Data:\n%s", string(rawJSON))

	var result EnrichedLeadData
	if err := s.callDeepSeekJSON(ctx, leadEnrichmentPrompt, userPrompt, 0.3, &result); err != nil {
		return nil, fmt.Errorf("lead enrichment failed: %w", err)
	}

	return &result, nil
}

// ============================================
// Lead Scoring
// ============================================

// System prompt for lead scoring
const leadScoringPrompt = `You are LandVal Assistant, an AI scoring specialist for the Land Valuation System.

Score this lead based on the following weighted factors:
- Property Value (25%): Higher value → more likely to need valuation services
- Transaction Recency (20%): Recent buyers/sellers → active market participants
- Professional Role (20%): Agents & developers → recurring need for valuations
- Online Presence (10%): Active on real estate platforms → engaged
- Referral Potential (10%): Connected to networks → viral acquisition potential
- Language Match (5%): Preferred language matches outreach language
- Geographic Priority (10%): Kigali > Provincial > Rural

Return a JSON object with:
- score: float between 0.0 and 1.0
- score_breakdown: object with individual factor scores
- reasoning: brief explanation of the score`

// ScoreLead scores a lead using DeepSeek AI
func (s *AIService) ScoreLead(ctx context.Context, lead *models.Lead) (float64, map[string]interface{}, error) {
	leadJSON, err := json.Marshal(map[string]interface{}{
		"id":             lead.ID,
		"first_name":     lead.FirstName,
		"last_name":      lead.LastName,
		"email":          lead.Email,
		"phone":          lead.Phone,
		"company":        lead.Company,
		"role":           lead.Role,
		"location":       lead.Location,
		"district":       lead.District,
		"sector":         lead.Sector,
		"language_pref":  lead.LanguagePref,
		"ai_segment":     lead.AISegment,
		"ai_score":       lead.AIScore,
		"total_emails":   lead.TotalEmails,
		"total_whatsapps": lead.TotalWhatsApps,
		"status":         lead.Status,
	})
	if err != nil {
		return 0, nil, fmt.Errorf("failed to marshal lead: %w", err)
	}

	userPrompt := fmt.Sprintf("Lead Data:\n%s", string(leadJSON))

	var result struct {
		Score          float64                `json:"score"`
		ScoreBreakdown map[string]interface{} `json:"score_breakdown"`
		Reasoning      string                 `json:"reasoning"`
	}
	if err := s.callDeepSeekJSON(ctx, leadScoringPrompt, userPrompt, 0.2, &result); err != nil {
		return 0, nil, fmt.Errorf("lead scoring failed: %w", err)
	}

	return result.Score, result.ScoreBreakdown, nil
}

// ============================================
// Campaign Content Generation
// ============================================

// System prompt for content generation
const contentGenerationPrompt = `You are LandVal Assistant, a marketing AI for the Land Valuation System (https://landval.kcoders.org/).

Generate a personalized outreach message. The message should:
1. Reference their specific location/property context
2. Explain the value of professional land valuation
3. Include a clear call-to-action to visit landval.kcoders.org
4. Be culturally appropriate for Rwanda
5. Be in the requested language (English/French/Kinyarwanda)

Keep emails under 200 words, WhatsApp messages under 100 words.

Return a JSON object with:
- subject: email subject line (omit for WhatsApp)
- body: the message body
- language: the language code used
- tone: one of "professional", "friendly", "formal"`

// GenerateCampaignContent generates personalized outreach content via DeepSeek
func (s *AIService) GenerateCampaignContent(ctx context.Context, lead *models.Lead, channel, language string) (*CampaignContent, error) {
	leadInfo := map[string]interface{}{
		"first_name":    lead.FirstName,
		"last_name":     lead.LastName,
		"location":      lead.Location,
		"district":      lead.District,
		"sector":        lead.Sector,
		"role":          lead.Role,
		"ai_segment":    lead.AISegment,
		"ai_score":      lead.AIScore,
		"company":       lead.Company,
		"language_pref": lead.LanguagePref,
	}

	leadJSON, _ := json.Marshal(leadInfo)

	userPrompt := fmt.Sprintf(`Generate a %s outreach message in %s for this lead:
%s`, channel, language, string(leadJSON))

	var result CampaignContent
	if err := s.callDeepSeekJSON(ctx, contentGenerationPrompt, userPrompt, 0.7, &result); err != nil {
		return nil, fmt.Errorf("content generation failed: %w", err)
	}

	return &result, nil
}

// ============================================
// Lead Segmentation
// ============================================

// SegmentLeads segments a batch of leads using DeepSeek AI
func (s *AIService) SegmentLeads(ctx context.Context, leads []*models.Lead) (map[string][]uint, error) {
	type leadSummary struct {
		ID       uint    `json:"id"`
		Name     string  `json:"name"`
		Role     string  `json:"role"`
		District string  `json:"district"`
		Score    float64 `json:"score"`
	}

	var summaries []leadSummary
	for _, l := range leads {
		summaries = append(summaries, leadSummary{
			ID:       l.ID,
			Name:     l.FirstName + " " + l.LastName,
			Role:     l.Role,
			District: l.District,
			Score:    l.AIScore,
		})
	}

	summaryJSON, _ := json.Marshal(summaries)

	systemPrompt := `You are LandVal Assistant, an AI segmentation specialist. Group these leads into meaningful segments based on their role, location, and score. Return a JSON object where keys are segment names and values are arrays of lead IDs.`
	userPrompt := fmt.Sprintf("Segment these leads:\n%s", string(summaryJSON))

	var segments map[string][]uint
	if err := s.callDeepSeekJSON(ctx, systemPrompt, userPrompt, 0.3, &segments); err != nil {
		return nil, fmt.Errorf("segmentation failed: %w", err)
	}

	return segments, nil
}

// ============================================
// Campaign Performance Analysis
// ============================================

// AnalyzeCampaignPerformance generates insights from campaign data
func (s *AIService) AnalyzeCampaignPerformance(ctx context.Context, campaign *models.Campaign, openRate, clickRate, conversionRate float64) (*PerformanceInsights, error) {
	campaignInfo := map[string]interface{}{
		"name":            campaign.Name,
		"type":            campaign.Type,
		"channel":         campaign.Channel,
		"language":        campaign.Language,
		"sent_count":      campaign.SentCount,
		"opened_count":    campaign.OpenedCount,
		"clicked_count":   campaign.ClickedCount,
		"converted_count": campaign.ConvertedCount,
		"open_rate":       openRate,
		"click_rate":      clickRate,
		"conversion_rate": conversionRate,
		"status":          campaign.Status,
	}

	campaignJSON, _ := json.Marshal(campaignInfo)

	systemPrompt := `You are LandVal Assistant, an AI marketing analyst for the Land Valuation System. Analyze this campaign's performance and provide actionable insights. Return a JSON object with:
- summary: brief performance summary
- top_segment: the best-performing segment
- recommendation: specific actionable recommendation
- segment_scores: object with segment names and their performance scores`

	userPrompt := fmt.Sprintf("Analyze this campaign:\n%s", string(campaignJSON))

	var result PerformanceInsights
	if err := s.callDeepSeekJSON(ctx, systemPrompt, userPrompt, 0.4, &result); err != nil {
		return nil, fmt.Errorf("campaign analysis failed: %w", err)
	}

	return &result, nil
}

// ============================================
// General Chat (LandVal Assistant)
// ============================================

const chatSystemPrompt = `You are LandVal Assistant, a friendly and helpful AI assistant for the Land Valuation System (https://landval.kcoders.org/), operating in Rwanda.

Your role is to help users with:
- Answering questions about land valuation, pricing, and the platform
- Explaining features: valuation search, marketplace, subscriptions, payment methods (PesaPal, PayPal, bank transfer)
- Guiding users on how to create property listings, get estimates, and use the dashboard
- Providing information about pricing plans (Freemium, Premium, Corporate)
- Helping with technical support questions about the platform
- The platform supports English, French, and Kinyarwanda — respond in the user's language

Keep responses concise, helpful, and friendly. If you don't know something, be honest. Never make up pricing or legal information. Direct users to the appropriate dashboard section or support contact for complex issues.

Available features: land valuation estimates, property marketplace, subscription plans (Freemium with 3 free valuations, Premium, Corporate), user dashboard with profile, billing, refunds, notifications, multi-language support (EN/FR/RW), PesaPal & PayPal payments, bank transfers.`

// ChatRequest represents a chat request from the frontend
type ChatRequest struct {
	Message string           `json:"message"`
	History []DeepSeekMessage `json:"history,omitempty"`
}

// ChatResponse represents the AI response
type ChatResponse struct {
	Message string `json:"message"`
}

// Chat sends a message to the LandVal Assistant and returns a response
func (s *AIService) Chat(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
	if req.Message == "" {
		return &ChatResponse{Message: "Hi! 👋 How can I help you with Land Valuation System today?"}, nil
	}

	// Build conversation history if provided
	var messages []DeepSeekMessage
	messages = append(messages, DeepSeekMessage{Role: "system", Content: chatSystemPrompt})

	// Add history (up to last 10 messages to keep context manageable)
	if len(req.History) > 0 {
		start := 0
		if len(req.History) > 10 {
			start = len(req.History) - 10
		}
		messages = append(messages, req.History[start:]...)
	}

	// Add the current user message
	messages = append(messages, DeepSeekMessage{Role: "user", Content: req.Message})

	reqBody := DeepSeekRequest{
		Model:       s.model,
		Messages:    messages,
		Temperature: 0.7,
		MaxTokens:   1024,
	}

	payload, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", s.baseURL+"/chat/completions", bytes.NewReader(payload))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+s.apiKey)

	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		var apiErr DeepSeekResponse
		if json.Unmarshal(body, &apiErr) == nil && apiErr.Error != nil {
			return nil, fmt.Errorf("DeepSeek API error (HTTP %d): %s", resp.StatusCode, apiErr.Error.Message)
		}
		return nil, fmt.Errorf("DeepSeek API returned HTTP %d: %s", resp.StatusCode, string(body))
	}

	var result DeepSeekResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if len(result.Choices) == 0 {
		return nil, fmt.Errorf("DeepSeek returned no choices")
	}

	return &ChatResponse{Message: strings.TrimSpace(result.Choices[0].Message.Content)}, nil
}

// ============================================
// Health Check
// ============================================

// IsConfigured returns true if the DeepSeek API key is set
func (s *AIService) IsConfigured() bool {
	return s.apiKey != ""
}
