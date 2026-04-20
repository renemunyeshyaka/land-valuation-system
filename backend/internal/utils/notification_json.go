package utils

import (
	"backend/internal/models"
	"encoding/json"
)

type NotificationPayload struct {
	ID      uint   `json:"id"`
	UserID  uint   `json:"user_id"`
	Title   string `json:"title"`
	Message string `json:"message"`
	Type    string `json:"type"`
	IsRead  bool   `json:"is_read"`
	SentBy  uint   `json:"sent_by"`
}

type BroadcastNotificationPayload struct {
	Broadcast bool   `json:"broadcast"`
	Title     string `json:"title"`
	Message   string `json:"message"`
	Type      string `json:"type"`
	UserRole  string `json:"user_role"`
}

func NotificationToJSON(n *models.Notification) string {
	payload := NotificationPayload{
		ID:      n.ID,
		UserID:  n.UserID,
		Title:   n.Title,
		Message: n.Message,
		Type:    n.Type,
		IsRead:  n.IsRead,
		SentBy:  n.SentByID,
	}
	b, _ := json.Marshal(payload)
	return string(b)
}

func BroadcastNotificationToJSON(title, message, typ, userRole string) string {
	payload := BroadcastNotificationPayload{
		Broadcast: true,
		Title:     title,
		Message:   message,
		Type:      typ,
		UserRole:  userRole,
	}
	b, _ := json.Marshal(payload)
	return string(b)
}
