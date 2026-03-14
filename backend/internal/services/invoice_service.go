package services

import (
	"bytes"
	"context"
	"fmt"
	"html/template"
	"os"

	"backend/internal/models"
)

// InvoiceService generates invoices/receipts as HTML or PDF
// (PDF generation can be added with a library if needed)
type InvoiceService struct{}

func NewInvoiceService() *InvoiceService {
	return &InvoiceService{}
}

// GenerateInvoiceHTML returns an HTML invoice for a transaction
func (s *InvoiceService) GenerateInvoiceHTML(ctx context.Context, txn *models.Transaction, user *models.User) (string, error) {
	tmpl := `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice #{{.InvoiceID}}</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
<h2>Invoice #{{.InvoiceID}}</h2>
<p>Date: {{.Date}}</p>
<p>Billed To: {{.UserName}}</p>
<p>Plan: {{.PlanType}}</p>
<p>Amount: <b>{{.Amount}} RWF</b></p>
<p>Status: {{.Status}}</p>
<hr>
<p>Thank you for your payment!</p>
</body></html>
`
	data := map[string]interface{}{
		"InvoiceID": fmt.Sprintf("INV-%d", txn.ID),
		"Date":      txn.CreatedAt.Format("2006-01-02"),
		"UserName":  user.FullName,
		"PlanType":  txn.Description,
		"Amount":    txn.Amount,
		"Status":    txn.Status,
	}
	var buf bytes.Buffer
	t, err := template.New("invoice").Parse(tmpl)
	if err != nil {
		return "", err
	}
	if err := t.Execute(&buf, data); err != nil {
		return "", err
	}
	return buf.String(), nil
}

// SaveInvoiceHTML writes the invoice HTML to a file
func (s *InvoiceService) SaveInvoiceHTML(ctx context.Context, html string, filename string) error {
	return os.WriteFile(filename, []byte(html), 0644)
}
