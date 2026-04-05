package services

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"net/smtp"
	"os"
)

type EmailService struct {
	smtpHost  string
	smtpPort  string
	emailUser string
	from      string
	password  string
}

func NewEmailService() *EmailService {
	emailUser := os.Getenv("SMTP_USER")
	if emailUser == "" {
		emailUser = os.Getenv("EMAIL_USER")
	}

	from := os.Getenv("EMAIL_FROM")
	if from == "" {
		from = os.Getenv("SMTP_FROM")
	}

	password := os.Getenv("SMTP_PASSWORD")
	if password == "" {
		password = os.Getenv("EMAIL_PASS")
	}

	return &EmailService{
		smtpHost:  os.Getenv("SMTP_HOST"),
		smtpPort:  os.Getenv("SMTP_PORT"),
		emailUser: emailUser,
		from:      from,
		password:  password,
	}
}

// SendInvoiceEmail sends an invoice HTML to the user
func (s *EmailService) SendInvoiceEmail(toEmail, userName, invoiceHTML string) error {
	subject := "Your Payment Invoice - Land Valuation System"
	body := s.buildInvoiceEmailBody(userName, invoiceHTML)
	return s.sendEmail(toEmail, subject, body)
}

// buildInvoiceEmailBody wraps the invoice HTML in a styled email
func (s *EmailService) buildInvoiceEmailBody(userName, invoiceHTML string) string {
	return fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">
    <table width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color:#fff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="background:linear-gradient(135deg,#667eea 0%%,#764ba2 100%%);padding:30px;text-align:center;border-radius:8px 8px 0 0;">
                            <h1 style="color:#fff;margin:0;font-size:28px;">Land Valuation System</h1>
                            <p style="color:#fff;margin:10px 0 0 0;font-size:14px;">Rwanda</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:40px 30px;">
                            <h2 style="color:#333;margin:0 0 20px 0;">Hello, %s!</h2>
                            <p style="color:#666;font-size:16px;line-height:1.6;margin:0 0 20px 0;">Thank you for your payment. Please find your invoice below:</p>
                            <div style="margin:30px 0;">%s</div>
                            <p style="color:#666;font-size:14px;line-height:1.6;margin:20px 0;">If you have any questions, reply to this email.</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color:#f4f4f4;padding:20px;text-align:center;border-radius:0 0 8px 8px;color:#999;font-size:12px;">
                            &copy; 2024 Land Valuation System. All rights reserved.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`, userName, invoiceHTML)
}

// GenerateOTP generates a 6-digit OTP code
func GenerateOTP() (string, error) {
	max := big.NewInt(1000000)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}

// SendActivationEmail sends email verification code to user
func (s *EmailService) SendActivationEmail(toEmail, firstName, code string) error {
	subject := "Activate Your Land Valuation System Account"
	body := s.buildActivationEmailBody(firstName, code)
	return s.sendEmail(toEmail, subject, body)
}

// SendOTPEmail sends OTP code for login verification
func (s *EmailService) SendOTPEmail(toEmail, firstName, code string) error {
	subject := "Your Login Verification Code"
	body := s.buildOTPEmailBody(firstName, code)
	return s.sendEmail(toEmail, subject, body)
}

// SendPasswordResetEmail sends password reset code
func (s *EmailService) SendPasswordResetEmail(toEmail, firstName, code string) error {
	subject := "Reset Your Password"
	body := s.buildPasswordResetEmailBody(firstName, code)
	return s.sendEmail(toEmail, subject, body)
}

// sendEmail sends an email using SMTP
func (s *EmailService) sendEmail(to, subject, body string) error {
	auth := smtp.PlainAuth("", s.emailUser, s.password, s.smtpHost)

	msg := []byte(fmt.Sprintf(
		"From: %s\r\n"+
			"To: %s\r\n"+
			"Subject: %s\r\n"+
			"MIME-Version: 1.0\r\n"+
			"Content-Type: text/html; charset=UTF-8\r\n"+
			"\r\n"+
			"%s",
		s.from, to, subject, body,
	))

	addr := fmt.Sprintf("%s:%s", s.smtpHost, s.smtpPort)
	return smtp.SendMail(addr, auth, s.from, []string{to}, msg)
}

// buildActivationEmailBody creates HTML email for account activation
func (s *EmailService) buildActivationEmailBody(firstName, code string) string {
	return fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Land Valuation System</h1>
                            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">Rwanda</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #333333; margin: 0 0 20px 0;">Welcome, %s! 🎉</h2>
                            <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Thank you for registering with the Land Valuation System. To activate your account, 
                                please use the verification code below:
                            </p>
                            
                            <!-- Verification Code Box -->
                            <table width="100%%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center" style="background-color: #f8f9fa; border: 2px dashed #667eea; border-radius: 8px; padding: 20px;">
                                        <p style="color: #666666; font-size: 14px; margin: 0 0 10px 0;">Your Verification Code</p>
                                        <p style="font-size: 36px; font-weight: bold; color: #667eea; margin: 0; letter-spacing: 8px;">%s</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                                This code will expire in <strong>30 minutes</strong>. If you didn't create an account, 
                                please ignore this email.
                            </p>
                            
                            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                                <p style="color: #856404; font-size: 13px; margin: 0;">
                                    <strong>Security Tip:</strong> Never share this code with anyone. Our team will never ask for your verification code.
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px;">
                            <p style="color: #999999; font-size: 12px; margin: 0;">
                                Land Valuation System · Rwanda<br>
                                © 2026 All rights reserved
                            </p>
                            <p style="color: #999999; font-size: 12px; margin: 10px 0 0 0;">
                                Need help? Contact us at <a href="mailto:support@landvaluation.rw" style="color: #667eea; text-decoration: none;">support@landvaluation.rw</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`, firstName, code)
}

// buildOTPEmailBody creates HTML email for OTP login
func (s *EmailService) buildOTPEmailBody(firstName, code string) string {
	return fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🔐 Login Verification</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #333333; margin: 0 0 20px 0;">Hello, %s!</h2>
                            <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                We received a login attempt for your account. Please use the verification code below to complete your login:
                            </p>
                            
                            <!-- OTP Code Box -->
                            <table width="100%%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center" style="background-color: #f8f9fa; border: 2px dashed #28a745; border-radius: 8px; padding: 20px;">
                                        <p style="color: #666666; font-size: 14px; margin: 0 0 10px 0;">Your One-Time Password</p>
                                        <p style="font-size: 36px; font-weight: bold; color: #28a745; margin: 0; letter-spacing: 8px;">%s</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                                This code will expire in <strong>5 minutes</strong>. If you didn't attempt to log in, 
                                please change your password immediately.
                            </p>
                            
                            <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; border-radius: 4px;">
                                <p style="color: #721c24; font-size: 13px; margin: 0;">
                                    <strong>Security Alert:</strong> If you didn't request this code, someone may be trying to access your account. 
                                    Please secure your account immediately.
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px;">
                            <p style="color: #999999; font-size: 12px; margin: 0;">
                                Land Valuation System · Rwanda<br>
                                © 2026 All rights reserved
                            </p>
                            <p style="color: #999999; font-size: 12px; margin: 10px 0 0 0;">
                                Need help? Contact us at <a href="mailto:support@landvaluation.rw" style="color: #667eea; text-decoration: none;">support@landvaluation.rw</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`, firstName, code)
}

// buildPasswordResetEmailBody creates HTML email for password reset
func (s *EmailService) buildPasswordResetEmailBody(firstName, code string) string {
	return fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🔑 Password Reset</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #333333; margin: 0 0 20px 0;">Hello, %s!</h2>
                            <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                We received a request to reset your password. Use the code below to create a new password:
                            </p>
                            
                            <!-- Reset Code Box -->
                            <table width="100%%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center" style="background-color: #f8f9fa; border: 2px dashed #dc3545; border-radius: 8px; padding: 20px;">
                                        <p style="color: #666666; font-size: 14px; margin: 0 0 10px 0;">Your Reset Code</p>
                                        <p style="font-size: 36px; font-weight: bold; color: #dc3545; margin: 0; letter-spacing: 8px;">%s</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                                This code will expire in <strong>15 minutes</strong>. If you didn't request a password reset, 
                                please ignore this email or contact support if you have concerns.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px;">
                            <p style="color: #999999; font-size: 12px; margin: 0;">
                                Land Valuation System · Rwanda<br>
                                © 2026 All rights reserved
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`, firstName, code)
}
