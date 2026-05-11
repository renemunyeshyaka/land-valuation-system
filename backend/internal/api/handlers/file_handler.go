package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	maxFileSize = 2 * 1024 * 1024 // 2 MB per file
)

var allowedImageTypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/gif":  true,
}

// FileHandler handles file uploads
type FileHandler struct {
	uploadDir       string
	publicURLPrefix string
	allowDelete     bool
}

// NewFileHandler creates a new file handler
func NewFileHandler(uploadDir string, allowDelete bool) *FileHandler {
	return &FileHandler{
		uploadDir:       filepath.Clean(uploadDir),
		publicURLPrefix: "/property_images",
		allowDelete:     allowDelete,
	}
}

// UploadPropertyImage handles property image uploads
func (h *FileHandler) UploadPropertyImage(c *gin.Context) {
	// Validate file size
	if c.Request.ContentLength > maxFileSize {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "File size exceeds 2 MB limit",
		})
		return
	}

	// Parse multipart form
	file, header, err := c.Request.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Failed to parse file: " + err.Error(),
		})
		return
	}
	defer file.Close()

	// Validate file type
	contentType := header.Header.Get("Content-Type")
	if !allowedImageTypes[contentType] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("Invalid file type. Allowed types: JPEG, PNG, GIF. Got: %s", contentType),
		})
		return
	}

	// Read file content to verify it's a valid image
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to read file",
		})
		return
	}

	if len(fileBytes) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "File is empty",
		})
		return
	}

	// Create upload directory if it doesn't exist
	if err := os.MkdirAll(h.uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create upload directory",
		})
		return
	}

	// Generate unique filename
	ext := filepath.Ext(header.Filename)
	timestamp := time.Now().UnixNano()
	filename := fmt.Sprintf("property_%d%s", timestamp, ext)
	filePath := filepath.Join(h.uploadDir, filename)

	// Save file
	if err := os.WriteFile(filePath, fileBytes, 0644); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to save file",
		})
		return
	}

	// Return the file URL (relative path that can be served)
	fileURL := h.publicURLPrefix + "/" + filename
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"url":      fileURL,
			"filename": filename,
		},
	})
}

// UploadPropertyDocuments handles property document uploads (placeholder for future use)
func (h *FileHandler) UploadPropertyDocuments(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Document upload coming soon",
	})
}

// DeletePropertyImage handles image deletion
func (h *FileHandler) DeletePropertyImage(c *gin.Context) {
	if !h.allowDelete {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Image deletion is disabled by configuration",
		})
		return
	}

	imageURL := c.Query("url")
	if imageURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Image URL required",
		})
		return
	}

	cleanURL := path.Clean(strings.TrimSpace(imageURL))
	prefix := h.publicURLPrefix + "/"
	if !strings.HasPrefix(cleanURL, prefix) {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Access denied",
		})
		return
	}

	filename := strings.TrimPrefix(cleanURL, prefix)
	if filename == "" || filename != filepath.Base(filename) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid image URL",
		})
		return
	}

	filePath := filepath.Join(h.uploadDir, filename)

	trashDir := filepath.Join(h.uploadDir, ".trash")
	if err := os.MkdirAll(trashDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to prepare trash directory",
		})
		return
	}

	archivedName := fmt.Sprintf("%d_%s", time.Now().UnixNano(), filename)
	archivePath := filepath.Join(trashDir, archivedName)

	if err := os.Rename(filePath, archivePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to archive image",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Image archived successfully",
	})
}
