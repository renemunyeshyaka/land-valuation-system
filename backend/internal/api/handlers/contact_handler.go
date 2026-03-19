package handlers

import (
	"fmt"
	"net/http"
	"net/smtp"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

type ContactFormRequest struct {
	Name    string `json:"name" binding:"required"`
	Email   string `json:"email" binding:"required,email"`
	Message string `json:"message" binding:"required"`
}

// ContactFormHandler handles contact form submissions and sends email to jeanrenemunyeshyaka@gmail.com
func ContactFormHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req ContactFormRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input. Please fill all fields correctly."})
			return
		}

		// SMTP config from environment
		smtpHost := os.Getenv("SMTP_HOST")
		smtpPort := os.Getenv("SMTP_PORT")
		smtpUser := os.Getenv("EMAIL_USER")
		smtpPass := os.Getenv("EMAIL_PASS")
		smtpFrom := os.Getenv("SMTP_FROM")
		to := "jeanrenemunyeshyaka@gmail.com"

		subject := "New Contact Form Submission"
		body := fmt.Sprintf("Name: %s\nEmail: %s\nMessage:\n%s", req.Name, req.Email, req.Message)
		msg := strings.Join([]string{
			fmt.Sprintf("From: %s", smtpFrom),
			fmt.Sprintf("To: %s", to),
			fmt.Sprintf("Subject: %s", subject),
			"MIME-Version: 1.0",
			"Content-Type: text/plain; charset=\"utf-8\"",
			"",
			body,
		}, "\r\n")

		addr := fmt.Sprintf("%s:%s", smtpHost, smtpPort)
		auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)
		if err := smtp.SendMail(addr, auth, smtpFrom, []string{to}, []byte(msg)); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send email. Please try again later."})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Message sent successfully. We will contact you soon."})
	}
}
