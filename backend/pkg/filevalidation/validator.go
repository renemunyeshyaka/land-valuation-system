package filevalidation

import (
	"fmt"
	"mime"
	"net/http"
	"strings"
)

const (
	// Size limits in bytes
	MaxFileSize   = 2 * 1024 * 1024  // 2 MB per file
	MaxUploadSize = 10 * 1024 * 1024 // 10 MB per upload session
	MaxImages     = 5
	MaxDocuments  = 5
)

// AllowedImageTypes defines allowed image MIME types
var AllowedImageTypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/gif":  true,
}

// AllowedDocumentTypes defines allowed document MIME types
var AllowedDocumentTypes = map[string]bool{
	"application/pdf": true,
}

// BlockedMediaTypes defines blocked media types (audio/video)
var BlockedMediaTypes = map[string]bool{
	"audio": true,
	"video": true,
}

// FileValidationError represents a file validation error
type FileValidationError struct {
	Field   string
	Message string
}

func (e FileValidationError) Error() string {
	return fmt.Sprintf("%s: %s", e.Field, e.Message)
}

// ValidateFileSize checks if file size is within limits
func ValidateFileSize(fileSize int64, fieldName string) error {
	if fileSize > MaxFileSize {
		return FileValidationError{
			Field:   fieldName,
			Message: fmt.Sprintf("File exceeds maximum size of 2 MB (uploaded: %.2f MB)", float64(fileSize)/(1024*1024)),
		}
	}
	return nil
}

// ValidateTotalUploadSize checks if total upload size is within limits
func ValidateTotalUploadSize(totalSize int64) error {
	if totalSize > MaxUploadSize {
		return FileValidationError{
			Field:   "upload",
			Message: fmt.Sprintf("Total upload exceeds maximum size of 10 MB (total: %.2f MB)", float64(totalSize)/(1024*1024)),
		}
	}
	return nil
}

// ValidateImageFile checks if file is a valid image
func ValidateImageFile(filename string, mimeType string, fileSize int64) error {
	// Check file size
	if err := ValidateFileSize(fileSize, filename); err != nil {
		return err
	}

	// Detect MIME type from filename if not provided
	if mimeType == "" {
		mimeType = mime.TypeByExtension("." + getFileExtension(filename))
	}

	// Check MIME type
	if !isAllowedImageType(mimeType) {
		return FileValidationError{
			Field:   filename,
			Message: fmt.Sprintf("Invalid image format. Allowed: JPG, PNG, GIF"),
		}
	}

	// Block audio/video
	if isBlockedMediaType(mimeType) {
		return FileValidationError{
			Field:   filename,
			Message: "Audio and video files are not allowed",
		}
	}

	return nil
}

// ValidateDocumentFile checks if file is a valid document
func ValidateDocumentFile(filename string, mimeType string, fileSize int64) error {
	// Check file size
	if err := ValidateFileSize(fileSize, filename); err != nil {
		return err
	}

	// Detect MIME type from filename if not provided
	if mimeType == "" {
		ext := "." + getFileExtension(filename)
		if ext == ".pdf" {
			mimeType = "application/pdf"
		} else {
			mimeType = mime.TypeByExtension(ext)
		}
	}

	// Check MIME type
	if !isAllowedDocumentType(mimeType) {
		return FileValidationError{
			Field:   filename,
			Message: fmt.Sprintf("Invalid document format. Only PDF files are allowed"),
		}
	}

	// Block audio/video
	if isBlockedMediaType(mimeType) {
		return FileValidationError{
			Field:   filename,
			Message: "Audio and video files are not allowed",
		}
	}

	return nil
}

// ValidateImageCount checks if image count is within limits
func ValidateImageCount(count int) error {
	if count > MaxImages {
		return FileValidationError{
			Field:   "images",
			Message: fmt.Sprintf("Maximum %d images allowed (uploaded: %d)", MaxImages, count),
		}
	}
	return nil
}

// ValidateDocumentCount checks if document count is within limits
func ValidateDocumentCount(count int) error {
	if count > MaxDocuments {
		return FileValidationError{
			Field:   "documents",
			Message: fmt.Sprintf("Maximum %d documents allowed (uploaded: %d)", MaxDocuments, count),
		}
	}
	return nil
}

// DetectMIMEType detects MIME type from file header
func DetectMIMEType(data []byte) string {
	// Use net/http to detect MIME type from file content
	return http.DetectContentType(data)
}

// Helper functions

func getFileExtension(filename string) string {
	parts := strings.Split(filename, ".")
	if len(parts) > 1 {
		return strings.ToLower(parts[len(parts)-1])
	}
	return ""
}

func isAllowedImageType(mimeType string) bool {
	return AllowedImageTypes[mimeType]
}

func isAllowedDocumentType(mimeType string) bool {
	return AllowedDocumentTypes[mimeType]
}

func isBlockedMediaType(mimeType string) bool {
	return strings.HasPrefix(mimeType, "audio/") || strings.HasPrefix(mimeType, "video/")
}
