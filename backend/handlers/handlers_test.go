package handlers

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"testing"
)

type mockWriter struct {
	HeaderMap http.Header
	Body      []byte
	Status    int
}

func (m *mockWriter) Header() http.Header {
	return m.HeaderMap
}
func (m *mockWriter) Write(b []byte) (int, error) {
	m.Body = append(m.Body, b...)
	return len(b), nil
}
func (m *mockWriter) WriteHeader(statusCode int) {
	m.Status = statusCode
}

func TestEstimateSearchHandler_EmptyUPI(t *testing.T) {
	w := &mockWriter{HeaderMap: make(http.Header)}
	reqBody := bytes.NewBufferString(`{"upi": ""}`)
	r, _ := http.NewRequest("POST", "/api/v1/estimate-search", reqBody)
	db = &mockDB{}
	priceTable = &mockPriceTable{}
	EstimateSearchHandler(w, r)
	if w.Status != 0 && w.Status != 200 {
		t.Errorf("Expected status 200 or 0, got %d", w.Status)
	}
	var resp EstimateSearchResponse
	json.Unmarshal(w.Body, &resp)
	if resp.Error == "" {
		t.Error("Expected error for empty UPI")
	}
}

func TestUPIPriceHandler_EmptyUPI(t *testing.T) {
	w := &mockWriter{HeaderMap: make(http.Header)}
	reqBody := bytes.NewBufferString(`{"upi": ""}`)
	r, _ := http.NewRequest("POST", "/api/upi-price", reqBody)
	db = &mockDB{}
	priceTable = &mockPriceTable{}
	UPIPriceHandler(w, r)
	if w.Status != 0 && w.Status != 200 {
		t.Errorf("Expected status 200 or 0, got %d", w.Status)
	}
	var resp UPIPriceResponse
	json.Unmarshal(w.Body, &resp)
	if resp.Error == "" {
		t.Error("Expected error for empty UPI")
	}
}

func TestUpiSearchHandler_EmptyUPI(t *testing.T) {
	w := &mockWriter{HeaderMap: make(http.Header)}
	reqBody := bytes.NewBufferString(`{"upi": ""}`)
	r, _ := http.NewRequest("POST", "/api/v1/search-upi", reqBody)
	db = &mockDB{}
	UpiSearchHandler(w, r)
	if w.Status != 0 && w.Status != 200 {
		t.Errorf("Expected status 200 or 0, got %d", w.Status)
	}
	var resp UpiSearchResponse
	json.Unmarshal(w.Body, &resp)
	if resp.Error == "" {
		t.Error("Expected error for empty UPI")
	}
}

// --- Mocks ---
type mockPriceTable struct{}

func (m *mockPriceTable) GetPriceByUPI(upi string) (string, string, error) {
	if upi == "" {
		return "", "", errors.New("UPI required")
	}
	return "1000", "mock", nil
}

type mockRow struct{}

func (m *mockRow) Scan(dest ...interface{}) error {
	return errors.New("no rows")
}

type mockDB struct{}

func (m *mockDB) QueryRow(query string, args ...interface{}) RowIface {
	return &mockRow{}
}
