package alert

import (
	"fmt"
	"net/smtp"
	"os"
)

// SendEmail sends an alert email using SMTP
func SendEmail(subject, body string) error {
	smtpHost := os.Getenv("ALERT_SMTP_HOST")
	smtpPort := os.Getenv("ALERT_SMTP_PORT")
	smtpUser := os.Getenv("ALERT_SMTP_USER")
	smtpPass := os.Getenv("ALERT_SMTP_PASS")
	to := os.Getenv("ALERT_EMAIL_TO")
	from := os.Getenv("ALERT_EMAIL_FROM")

	if smtpHost == "" || smtpPort == "" || smtpUser == "" || smtpPass == "" || to == "" || from == "" {
		return fmt.Errorf("alert email env vars not set")
	}

	header := "From: " + from + "\r\n" +
		"To: " + to + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"MIME-version: 1.0;\r\nContent-Type: text/plain; charset=\"UTF-8\";\r\n\r\n"
	msg := []byte(header + body)
	auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)
	addr := smtpHost + ":" + smtpPort
	return smtp.SendMail(addr, auth, from, []string{to}, msg)
}
