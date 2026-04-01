package models


import (
    "time"
)

type Property struct {
    ID          uint      `json:"id" gorm:"primaryKey"`
    OwnerID     uint      `json:"owner_id"`
    Title       string    `json:"title"`
    Description string    `json:"description"`
    Province    string    `json:"province"`
    District    string    `json:"district"`
    Sector      string    `json:"sector"`
    Cell        string    `json:"cell"`
    Village     string    `json:"village"`
    PlotSizeSqm float64   `json:"plot_size_sqm"`
    Price       float64   `json:"price"`
    Status      string    `json:"status"`
    Images      string    `json:"images"` // Comma-separated URLs or use a separate table for images
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}