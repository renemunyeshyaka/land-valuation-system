package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	// Removed unused imports
	"strings"
	"time"

	"github.com/google/uuid"
)

// Property represents a property listing (simplified for handler)
type Property struct {
	ID          string   `json:"id"`
	OwnerID     string   `json:"owner_id"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	PlotNumber  string   `json:"plot_number"`
	Images      []string `json:"images"`
	CreatedAt   int64    `json:"created_at"`
	LikesCount  int      `json:"likes_count"`
}

// LikePropertyHandler increments the likes_count for a property
func LikePropertyHandler(w http.ResponseWriter, r *http.Request) {
	id := r.FormValue("id")
	idx := findPropertyIndex(id)
	if idx == -1 {
		http.Error(w, "Property not found", http.StatusNotFound)
		return
	}
	properties[idx].LikesCount++
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(properties[idx]); err != nil {
		log.Printf("LikePropertyHandler encode error: %v", err)
	}
}

// In-memory store for demonstration (replace with DB in production)
var properties = []Property{}

// Helper: find property index by ID
func findPropertyIndex(id string) int {
	for i, p := range properties {
		if p.ID == id {
			return i
		}
	}
	return -1
}

// UpdatePropertyHandler allows owner or admin to update a property
func UpdatePropertyHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	isAdmin := r.Header.Get("X-Admin") == "true"
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	id := r.FormValue("id")
	idx := findPropertyIndex(id)
	if idx == -1 {
		http.Error(w, "Property not found", http.StatusNotFound)
		return
	}
	prop := &properties[idx]
	if !(isAdmin || prop.OwnerID == userID) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	// Update fields if provided
	if v := r.FormValue("title"); v != "" {
		prop.Title = v
	}
	if v := r.FormValue("description"); v != "" {
		prop.Description = v
	}
	if v := r.FormValue("plot_number"); v != "" {
		prop.PlotNumber = v
	}
	if v := r.FormValue("images"); v != "" {
		prop.Images = strings.Split(v, ",")
	}
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(prop); err != nil {
		log.Printf("UpdatePropertyHandler encode error: %v", err)
	}
}

// DeletePropertyHandler allows owner or admin to delete a property
func DeletePropertyHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	isAdmin := r.Header.Get("X-Admin") == "true"
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	id := r.FormValue("id")
	idx := findPropertyIndex(id)
	if idx == -1 {
		http.Error(w, "Property not found", http.StatusNotFound)
		return
	}
	prop := properties[idx]
	if !(isAdmin || prop.OwnerID == userID) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	// Remove property
	properties = append(properties[:idx], properties[idx+1:]...)
	w.WriteHeader(http.StatusNoContent)
}

// Subscription limits (example: free=1, premium=unlimited)
var userSubscription = map[string]string{} // userID -> subscription ("free" or "premium")

func CreatePropertyHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")          // Simulate auth
	isAdmin := r.Header.Get("X-Admin") == "true" // Simulate admin check
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Admin can create unlimited properties for any user
	targetUserID := userID
	if isAdmin {
		// Admin can specify owner via form value (optional)
		if v := r.FormValue("owner_id"); v != "" {
			targetUserID = v
		}
	}

	sub := userSubscription[targetUserID]
	if !isAdmin && sub == "free" {
		count := 0
		for _, p := range properties {
			if p.OwnerID == targetUserID {
				count++
			}
		}
		if count >= 1 {
			http.Error(w, "Property limit reached for free subscription", http.StatusForbidden)
			return
		}
	}

	title := r.FormValue("title")
	description := r.FormValue("description")
	plotNumber := r.FormValue("plot_number")
	images := r.FormValue("images") // comma-separated URLs
	imageList := []string{}
	if images != "" {
		imageList = strings.Split(images, ",")
	}

	property := Property{
		ID:          uuid.New().String(),
		OwnerID:     targetUserID,
		Title:       title,
		Description: description,
		PlotNumber:  plotNumber,
		Images:      imageList,
		CreatedAt:   time.Now().Unix(),
	}
	properties = append(properties, property)
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(property); err != nil {
		log.Printf("CreatePropertyHandler encode error: %v", err)
	}
}

func ListMarketplaceHandler(w http.ResponseWriter, r *http.Request) {
	// Sort by most recent
	props := make([]Property, len(properties))
	copy(props, properties)
	// Simple sort (newest first)
	for i := 0; i < len(props)/2; i++ {
		props[i], props[len(props)-1-i] = props[len(props)-1-i], props[i]
	}
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(props); err != nil {
		log.Printf("ListMarketplaceHandler encode error: %v", err)
	}
}
