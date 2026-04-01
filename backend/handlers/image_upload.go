package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

// ImageUploadHandler handles image uploads and returns the image URL
func ImageUploadHandler(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(10 << 20) // 10 MB max
	if err != nil {
		http.Error(w, "Could not parse multipart form", http.StatusBadRequest)
		return
	}

	file, handler, err := r.FormFile("image")
	if err != nil {
		http.Error(w, "Could not get uploaded file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Ensure property_images directory exists
	dirPath := filepath.Join("backend", "property_images")
	if err := os.MkdirAll(dirPath, 0755); err != nil {
		http.Error(w, "Could not create image directory", http.StatusInternalServerError)
		return
	}

	filename := fmt.Sprintf("%d_%s", time.Now().UnixNano(), handler.Filename)
	savePath := filepath.Join(dirPath, filename)

	dst, err := os.Create(savePath)
	if err != nil {
		http.Error(w, "Could not save file", http.StatusInternalServerError)
		return
	}
	defer dst.Close()
	_, err = io.Copy(dst, file)
	if err != nil {
		http.Error(w, "Could not write file", http.StatusInternalServerError)
		return
	}

	// Return image URL (relative to server root)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, `{"image_url":"/property_images/%s"}`, filename)
}
