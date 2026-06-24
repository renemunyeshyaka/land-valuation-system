package handlers

import (
	"net/http"

	"backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type TrackingHandler struct {
	campaignRepo *repository.CampaignRepository
}

func NewTrackingHandler(campaignRepo *repository.CampaignRepository) *TrackingHandler {
	return &TrackingHandler{campaignRepo: campaignRepo}
}

// TrackOpen handles GET /api/v1/track/open/:tracking_id
// Returns a 1x1 transparent GIF to log email opens.
func (h *TrackingHandler) TrackOpen(c *gin.Context) {
	trackingID := c.Param("tracking_id")
	if trackingID == "" {
		c.Status(http.StatusNotFound)
		return
	}

	// Log the open event (fire-and-forget)
	go func(id string) {
		activity, err := h.campaignRepo.GetActivityByTrackingID(c.Request.Context(), id)
		if err != nil {
			return
		}
		_ = h.campaignRepo.UpdateActivityStatus(c.Request.Context(), activity.ID, "opened", nil)
		// Also increment campaign opened counter
		_ = h.campaignRepo.IncrementOpened(c.Request.Context(), activity.CampaignID)
	}(trackingID)

	// Return 1x1 transparent GIF
	c.Data(http.StatusOK, "image/gif", transparentGIF)
}

// TrackClick handles GET /api/v1/track/click/:tracking_id
// Logs the click and redirects to the target URL stored in activity metadata.
func (h *TrackingHandler) TrackClick(c *gin.Context) {
	trackingID := c.Param("tracking_id")
	if trackingID == "" {
		c.Status(http.StatusNotFound)
		return
	}

	// Get target URL from query param, fallback to homepage
	targetURL := c.DefaultQuery("url", "https://landval.kcoders.org/")

	// Log the click event (fire-and-forget)
	go func(id, url string) {
		activity, err := h.campaignRepo.GetActivityByTrackingID(c.Request.Context(), id)
		if err != nil {
			return
		}
		_ = h.campaignRepo.UpdateActivityStatus(c.Request.Context(), activity.ID, "clicked", nil)
		// Also increment campaign clicked counter
		_ = h.campaignRepo.IncrementClicked(c.Request.Context(), activity.CampaignID)
	}(trackingID, targetURL)

	// Redirect to target URL
	c.Redirect(http.StatusFound, targetURL)
}

// 1x1 transparent GIF pixel (minimum valid GIF)
var transparentGIF = []byte{
	0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // GIF89a
	0x01, 0x00, 0x01, 0x00, // 1x1 pixel
	0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00,
	0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
	0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
}
