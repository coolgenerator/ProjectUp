package helper

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"projectup/database"
	"projectup/models"
	"strconv"
	"time"

	"gopkg.in/gomail.v2"
)

// GetSafeRecipientEmail ensures we only send to verified emails in sandbox mode
// In development/test environments, it redirects all emails to the FROM_EMAIL (which is verified)
// In production, it passes through the original recipient email
func GetSafeRecipientEmail(originalRecipient string) string {
	// Check environment - if not production, redirect emails
	appMode := os.Getenv("APP_MODE")
	if appMode != "production" {
		// Always send to the verified FROM_EMAIL in development/test
		return os.Getenv("FROM_EMAIL")
	}
	return originalRecipient
}

// sendEmail sends an email with a verification link to the given email address.
func SendEmailVerification(email, token string) error {

	baseURL := os.Getenv("BASE_URL")
	fromEmail := os.Getenv("FROM_EMAIL")
	emailPassword := os.Getenv("EMAIL_PASSWORD")
	// Construct the verification link
	verificationLink := fmt.Sprintf("%s/verify?token=%s", baseURL, token)

	// Email content
	subject := "Email Verification"
	body := fmt.Sprintf(`
		<p>Thank you for signing up. Please verify your email by clicking the link below:</p>
		<a href="%s">Verify Email</a>
	`, verificationLink)

	// Configure the email message
	mail := gomail.NewMessage()
	mail.SetHeader("From", fromEmail)
	mail.SetHeader("To", email)
	mail.SetHeader("Subject", subject)
	mail.SetBody("text/html", body)

	// Configure the SMTP server
	dialer := gomail.NewDialer("mail.privateemail.com", 587, fromEmail, emailPassword)

	dialer.TLSConfig = &tls.Config{
		// InsecureSkipVerify: true, // Ensure certificate validation
		ServerName: "mail.privateemail.com",
	}

	// Send the email
	if err := dialer.DialAndSend(mail); err != nil {
		log.Printf("Failed to send email: %v", err)
		return err
	}

	return nil
}

func SendViaPrivateEmail(toEmail, subject, body string) error {
	fromEmail := os.Getenv("FROM_EMAIL")
	password := os.Getenv("EMAIL_PASSWORD")

	// Configure the email message
	mail := gomail.NewMessage()
	mail.SetHeader("From", fmt.Sprintf("Project Up <%s>", fromEmail))
	mail.SetHeader("To", toEmail)
	mail.SetHeader("Subject", subject)
	mail.SetBody("text/html", body)

	// Configure the SMTP server
	dialer := gomail.NewDialer("mail.privateemail.com", 587, fromEmail, password)

	// Allow insecure connections (use only for development)
	dialer.TLSConfig = &tls.Config{
		InsecureSkipVerify: false, // Ensure certificate validation
		ServerName:         "mail.privateemail.com",
	}

	// Send the email
	err := dialer.DialAndSend(mail)
	if err != nil {
		log.Printf("Failed to send email to %s: %v", toEmail, err)
		return fmt.Errorf("error sending email: %w", err)
	}

	log.Printf("Email successfully sent to %s", toEmail)
	return nil
}

func SendViaMailjet(toEmail, subject, body string) error {
	// Try SMTP first
	err := sendViaMailjetSMTP(toEmail, subject, body)
	if err == nil {
		return nil
	}

	// If SMTP fails, try API-based approach
	log.Printf("SMTP approach failed, trying API-based approach: %v", err)
	return sendViaMailjetAPI(toEmail, subject, body)
}

func sendViaMailjetSMTP(toEmail, subject, body string) error {
	fromEmail := os.Getenv("FROM_EMAIL")
	smtpServer := os.Getenv("MAILJET_SMTP_SERVER")
	smtpPortStr := os.Getenv("MAILJET_SMTP_PORT")
	apiKey := os.Getenv("MAILJET_API_KEY")
	secretKey := os.Getenv("MAILJET_SECRET_KEY")

	// Default port if not set
	smtpPort := 587
	if smtpPortStr != "" {
		parsedPort, err := strconv.Atoi(smtpPortStr)
		if err != nil {
			// If parsing fails, use default
			log.Printf("Failed to parse SMTP port '%s', using default: %v", smtpPortStr, err)
		} else {
			smtpPort = parsedPort
		}
	}

	// Log attempt (without credentials)
	log.Printf("Attempting to send email via Mailjet SMTP: FROM=%s, TO=%s, SMTP=%s:%d",
		fromEmail, toEmail, smtpServer, smtpPort)

	// Configure the email message
	mail := gomail.NewMessage()
	mail.SetHeader("From", fmt.Sprintf("Project Up <%s>", fromEmail))
	mail.SetHeader("To", toEmail)
	mail.SetHeader("Subject", subject)
	mail.SetBody("text/html", body)

	// Configure the SMTP server for Mailjet using API key as username and Secret key as password
	dialer := gomail.NewDialer(smtpServer, smtpPort, apiKey, secretKey)

	// TLS configuration
	dialer.TLSConfig = &tls.Config{
		InsecureSkipVerify: false,
		ServerName:         smtpServer,
	}

	// Send the email
	err := dialer.DialAndSend(mail)
	if err != nil {
		log.Printf("Failed to send email via Mailjet SMTP: %v", err)
		return fmt.Errorf("error sending email via Mailjet SMTP: %w", err)
	}

	log.Printf("Email successfully sent to %s via Mailjet SMTP", toEmail)
	return nil
}

func sendViaMailjetAPI(toEmail, subject, body string) error {
	fromEmail := os.Getenv("FROM_EMAIL")
	apiKey := os.Getenv("MAILJET_API_KEY")
	secretKey := os.Getenv("MAILJET_SECRET_KEY")

	if apiKey == "" || secretKey == "" {
		return fmt.Errorf("Mailjet API credentials not configured")
	}

	// Create HTTP client
	client := &http.Client{
		Timeout: time.Second * 10,
	}

	// Create request payload according to Mailjet Send API v3.1
	type Recipient struct {
		Email string `json:"Email"`
		Name  string `json:"Name,omitempty"`
	}

	type EmailContent struct {
		From     Recipient   `json:"From"`
		To       []Recipient `json:"To"`
		Subject  string      `json:"Subject"`
		HTMLPart string      `json:"HTMLPart"`
		TextPart string      `json:"TextPart,omitempty"`
	}

	type EmailPayload struct {
		Messages []EmailContent `json:"Messages"`
	}

	payload := EmailPayload{
		Messages: []EmailContent{
			{
				From: Recipient{
					Email: fromEmail,
					Name:  "Project Up",
				},
				To: []Recipient{
					{
						Email: toEmail,
					},
				},
				Subject:  subject,
				HTMLPart: body,
				TextPart: "", // Optional plain text version
			},
		},
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("error marshaling JSON: %w", err)
	}

	// Create request
	req, err := http.NewRequest("POST", "https://api.mailjet.com/v3.1/send", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("error creating request: %w", err)
	}

	// Set headers
	req.SetBasicAuth(apiKey, secretKey)
	req.Header.Set("Content-Type", "application/json")

	// Send request
	log.Printf("Attempting to send email via Mailjet API v3.1: FROM=%s, TO=%s", fromEmail, toEmail)
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("error sending request: %w", err)
	}
	defer resp.Body.Close()

	// Check response
	if resp.StatusCode >= 400 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("Mailjet API error (status %d): %s", resp.StatusCode, string(bodyBytes))
	}

	log.Printf("Email successfully sent to %s via Mailjet API", toEmail)
	return nil
}

func CleanupOldRecords() {
	threshold := time.Now().Add(-time.Hour)
	err := database.DB.Where("created_at < ?", threshold).Delete(&models.VerifiedUser{}).Error
	if err != nil {
		log.Printf("Error deleting old verified user records: %v", err)
	} else {
		log.Println("Old verified user records cleaned up successfully.")
	}
}
