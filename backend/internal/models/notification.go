package models

import "time"

type Notification struct {
	ID        uint       `gorm:"primarykey" json:"id"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	UserID    uint       `gorm:"index;not null" json:"user_id"`
	Title     string     `gorm:"size:200;not null" json:"title"`
	Message   string     `gorm:"type:text;not null" json:"message"`
	Type      string     `gorm:"size:50;default:info" json:"type"`
	IsRead    bool       `gorm:"default:false" json:"is_read"`
	ReadAt    *time.Time `json:"read_at,omitempty"`
	SentByID  uint       `gorm:"index" json:"sent_by_id"`
}
