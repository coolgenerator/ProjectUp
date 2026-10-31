package services

import (
	"errors"
	"fmt"
	"log"
	"net/url"
	"os"
	"projectup/helper"
	"projectup/models"
	"projectup/repositories"
	"strings"
)

func SendVerificationEmailService(email string) error {
	decodedEmail, _ := url.QueryUnescape(email)
	baseURL := os.Getenv("BASE_URL")

	token, err := helper.GenerateToken(email)
	if err != nil {
		return errors.New("failed to generate verification token")
	}

	// Determine if this is a school email
	isSchoolEmail := strings.Contains(decodedEmail, ".edu") || strings.Contains(decodedEmail, "ac.")

	// Customize the email subject and body based on email type
	var subject, body string
	verificationLink := fmt.Sprintf("%s/verify?token=%s", baseURL, token)

	if isSchoolEmail {
		subject = "Project Up School/Organization Email Verification"
		body = fmt.Sprintf(`
		<p>Hello,</p>
		<p>We're excited to verify your school/organization email! Please confirm your email by visiting the link below:</p>
		<a href="%s">%s</a>
		<p>Best regards,</p>
		<p>Project Up Team</p>
		`, verificationLink, verificationLink)
	} else {
		subject = "Project Up Email Verification"
		body = fmt.Sprintf(`
		<p>Hello,</p>
		<p>We're excited to have you on board! To activate your account, please verify your email by visiting the link below:</p>
		<a href="%s">%s</a>
		<p>Best regards,</p>
		<p>Project Up Team</p>
		`, verificationLink, verificationLink)
	}

	// Try Mailjet first
	log.Printf("Attempting to send verification email to %s via Mailjet", decodedEmail)
	emailErr := helper.SendViaMailjet(decodedEmail, subject, body)
	if emailErr == nil {
		log.Printf("Successfully sent verification email to %s via Mailjet", decodedEmail)
		return nil // Success with Mailjet
	}
	log.Printf("Failed to send verification email via Mailjet: %v", emailErr)

	// If Mailjet fails, try PrivateEmail as fallback
	log.Printf("Attempting to send verification email to %s via PrivateEmail", decodedEmail)
	emailErr = helper.SendViaPrivateEmail(decodedEmail, subject, body)
	if emailErr == nil {
		log.Printf("Successfully sent verification email to %s via PrivateEmail", decodedEmail)
		return nil // Success with PrivateEmail
	}
	log.Printf("Failed to send verification email via PrivateEmail: %v", emailErr)

	// If both methods fail, return the last error
	log.Printf("All email sending methods failed for %s", decodedEmail)
	return emailErr
}

func VerifyEmailService(token string) error {
	claims, err := helper.VerifyToken(token)
	if err != nil {
		return err
	}

	email := claims["sub"].(string)
	return repositories.VerifyEmail(email, token)
}

func IsEmailVerifiedService(email string) bool {
	return repositories.IsEmailVerified(email)
}

func SendResetPasswordEmailService(email string) error {
	decodedEmail, _ := url.QueryUnescape(email)
	baseURL := os.Getenv("BASE_URL")

	token, err := helper.GenerateToken(decodedEmail)
	if err != nil {
		return errors.New("failed to generate reset password token")
	}

	resetLink := fmt.Sprintf("%s/reset-password?token=%s", baseURL, token)
	subject := "Project Up Password Reset"
	body := fmt.Sprintf(`<p>Reset your password using the link below:</p><a href="%s">%s</a>`, resetLink, resetLink)

	// Try Mailjet first
	log.Printf("Attempting to send reset password email to %s via Mailjet", decodedEmail)
	emailErr := helper.SendViaMailjet(decodedEmail, subject, body)
	if emailErr == nil {
		log.Printf("Successfully sent reset password email to %s via Mailjet", decodedEmail)
		return nil // Success with Mailjet
	}
	log.Printf("Failed to send reset password email via Mailjet: %v", emailErr)

	// If Mailjet fails, try PrivateEmail as fallback
	log.Printf("Attempting to send reset password email to %s via PrivateEmail", decodedEmail)
	emailErr = helper.SendViaPrivateEmail(decodedEmail, subject, body)
	if emailErr == nil {
		log.Printf("Successfully sent reset password email to %s via PrivateEmail", decodedEmail)
		return nil // Success with PrivateEmail
	}
	log.Printf("Failed to send reset password email via PrivateEmail: %v", emailErr)

	// If both methods fail, return the last error
	log.Printf("All email sending methods failed for %s", decodedEmail)
	return emailErr
}

func UpdatePasswordService(token, newPassword string) error {
	claims, err := helper.VerifyToken(token)
	if err != nil {
		return err
	}

	email := claims["sub"].(string)
	if len(newPassword) < 8 {
		return errors.New("password must be at least 8 characters")
	}

	hashedPassword := helper.HashPassword(newPassword)
	return repositories.UpdatePassword(email, hashedPassword)
}

func SendApplicationStatusUpdateEmail(userEmail string, projectTitle string, status string) error {
	subject := "Project Application Status Update"
	body := fmt.Sprintf(`
		<p>Hello,</p>
		<p>Your application for the project "<strong>%s</strong>" has been <strong>%s</strong>.</p>
		
		<p>%s</p>
		
		<p>Login to ProjectUp to view your application status and details.</p>
		
		<p>Best regards,</p>
		<p>Project Up Team</p>
	`, projectTitle, status, getStatusMessage(status))

	// Try Mailjet first
	log.Printf("Attempting to send application status update email to %s via Mailjet", userEmail)
	emailErr := helper.SendViaMailjet(userEmail, subject, body)
	if emailErr == nil {
		log.Printf("Successfully sent application status update email to %s via Mailjet", userEmail)
		return nil // Success with Mailjet
	}
	log.Printf("Failed to send application status update email via Mailjet: %v", emailErr)

	// If Mailjet fails, try PrivateEmail as fallback
	log.Printf("Attempting to send application status update email to %s via PrivateEmail", userEmail)
	emailErr = helper.SendViaPrivateEmail(userEmail, subject, body)
	if emailErr == nil {
		log.Printf("Successfully sent application status update email to %s via PrivateEmail", userEmail)
		return nil // Success with PrivateEmail
	}
	log.Printf("Failed to send application status update email via PrivateEmail: %v", emailErr)

	// If both methods fail, return the last error
	log.Printf("All email sending methods failed for %s", userEmail)
	return emailErr
}

// Helper function to get a detailed message based on status
func getStatusMessage(status string) string {
	switch status {
	case "accepted":
		return "Congratulations! You are now a member of this project. You'll be able to access the project dashboard and collaborate with the team."
	case "declined":
		return "Thank you for your interest in this project. We encourage you to explore other projects that may be a better fit for your skills and interests."
	case "pending":
		return "Your application is currently under review. We'll notify you once a decision has been made."
	case "being reconsidered":
		return "Your previously declined application is now being reconsidered by the project owner. We'll notify you of any updates."
	default:
		return ""
	}
}

func UpdateSchoolEmail(userID uint, schoolEmail string) error {
	var profile models.Profile
	// Check if profile exists
	err := repositories.FindProfileByUserID(userID, &profile)
	if err != nil {
		return errors.New("profile not found")
	}

	// Update the school_email field
	profile.SchoolEmail = &schoolEmail
	profile.SchoolEmailVerified = false // Reset to false until verified

	// Save the updated profile
	return repositories.UpdateProfile(userID, &profile)
}

// SendApplicationSubmissionEmail sends an email to a project owner when a new application is submitted
func SendApplicationSubmissionEmail(ownerEmail string, projectTitle string, applicantName string) error {
	subject := "New Project Application Received"
	body := fmt.Sprintf(`
		<p>Hello,</p>
		<p>A new application for your project "%s" has been submitted by %s.</p>
		<p>Please login to your ProjectUp dashboard to review this application.</p>
		<p>Best regards,</p>
		<p>Project Up Team</p>
	`, projectTitle, applicantName)

	// Try Mailjet first
	log.Printf("Attempting to send application submission email to %s via Mailjet", ownerEmail)
	emailErr := helper.SendViaMailjet(ownerEmail, subject, body)
	if emailErr == nil {
		log.Printf("Successfully sent application submission email to %s via Mailjet", ownerEmail)
		return nil // Success with Mailjet
	}
	log.Printf("Failed to send application submission email via Mailjet: %v", emailErr)

	// If Mailjet fails, try PrivateEmail as fallback
	log.Printf("Attempting to send application submission email to %s via PrivateEmail", ownerEmail)
	emailErr = helper.SendViaPrivateEmail(ownerEmail, subject, body)
	if emailErr == nil {
		log.Printf("Successfully sent application submission email to %s via PrivateEmail", ownerEmail)
		return nil // Success with PrivateEmail
	}
	log.Printf("Failed to send application submission email via PrivateEmail: %v", emailErr)

	// If both methods fail, return the last error
	log.Printf("All email sending methods failed for %s", ownerEmail)
	return emailErr
}

// SendApplicationReminderEmail nudges a founder about applications left unanswered.
func SendApplicationReminderEmail(ownerEmail string, count int) error {
	subject := "Applicants are waiting for your reply"
	body := fmt.Sprintf(`
		<p>Hello,</p>
		<p>%d application(s) to your projects have waited more than 48 hours without a reply.</p>
		<p>Open your application board on ProjectUp to talk with them, give a trial task, or let them know it's not a fit.</p>
		<p>Best regards,</p>
		<p>Project Up Team</p>
	`, count)

	if err := helper.SendViaMailjet(ownerEmail, subject, body); err == nil {
		return nil
	}
	return helper.SendViaPrivateEmail(ownerEmail, subject, body)
}
