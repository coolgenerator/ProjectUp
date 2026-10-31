package controllers

import (
	"io"
	"net/http"
	"projectup/services"
	"time"

	"github.com/gin-gonic/gin"
)

// SendVerificationEmail sends a verification email
// @Summary Send email verification
// @Description Sends a verification email to the user's email address
// @Tags Auth
// @Accept json
// @Produce json
// @Param email formData string true "User Email"
// @Success 200 {object} map[string]string "Verification email sent successfully"
// @Failure 400 {object} map[string]string "Email is required"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /send-verification-email [post]
func SendVerificationEmail() gin.HandlerFunc {
	return func(c *gin.Context) {
		email := c.PostForm("email")
		if email == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Email is required"})
			return
		}

		err := services.SendVerificationEmailService(email)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Verification email sent successfully"})
	}
}

// VerifyEmailHandler verifies an email with a token
// @Summary Verify email
// @Description Verifies a user's email using the provided token
// @Tags Auth
// @Accept json
// @Produce json
// @Param token query string true "Verification Token"
// @Success 200 {object} map[string]string "Email verified successfully"
// @Failure 400 {object} map[string]string "Token is required"
// @Failure 401 {object} map[string]string "Invalid token"
// @Router /verify [get]
func VerifyEmailHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.Query("token")
		if token == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Token is required"})
			return
		}

		err := services.VerifyEmailService(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Email verified successfully"})
	}
}

// IsEmailVerified checks if an email is verified
// @Summary Check email verification status
// @Description Checks whether a given email is verified
// @Tags Auth
// @Accept json
// @Produce json
// @Param email query string true "User Email"
// @Success 200 {object} map[string]bool "Verification status"
// @Failure 400 {object} map[string]string "Email is required"
// @Router /check-email-verified [get]
func IsEmailVerified() gin.HandlerFunc {
	return func(c *gin.Context) {
		email := c.Query("email")
		if email == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Email is required"})
			return
		}

		// Check if client accepts SSE
		if c.GetHeader("Accept") == "text/event-stream" {
			// Set SSE headers
			c.Header("Content-Type", "text/event-stream")
			c.Header("Cache-Control", "no-cache")
			c.Header("Connection", "keep-alive")
			c.Header("Transfer-Encoding", "chunked")

			// Keep checking until timeout or verified
			c.Stream(func(w io.Writer) bool {
				verified := services.IsEmailVerifiedService(email)

				// Send SSE message with verification status
				c.SSEvent("message", gin.H{"is_verified": verified})

				// Continue streaming if not verified
				if !verified {
					time.Sleep(2 * time.Second)
					return true
				}

				// Stop streaming if verified
				return false
			})
		} else {
			// Regular JSON response
			verified := services.IsEmailVerifiedService(email)
			c.JSON(http.StatusOK, gin.H{"is_verified": verified})
		}
	}
}

// SendResetPasswordEmail sends a password reset email
// @Summary Send password reset email
// @Description Sends a password reset email to the user
// @Tags Auth
// @Accept json
// @Produce json
// @Param email formData string true "User Email"
// @Success 200 {object} map[string]string "Reset password email sent successfully"
// @Failure 400 {object} map[string]string "Email is required"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /send-reset-password [post]
func SendResetPasswordEmail() gin.HandlerFunc {
	return func(c *gin.Context) {
		email := c.PostForm("email")
		if email == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Email is required"})
			return
		}

		err := services.SendResetPasswordEmailService(email)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Reset password email sent successfully"})
	}
}

// UpdatePassword updates the user's password
// @Summary Update password
// @Description Updates the user's password using a reset token
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body map[string]string true "Token and new password"
// @Success 200 {object} map[string]string "Password updated successfully"
// @Failure 400 {object} map[string]string "Invalid input"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Router /update-password [post]
func UpdatePassword() gin.HandlerFunc {
	return func(c *gin.Context) {
		var input struct {
			Token       string `json:"token" binding:"required"`
			NewPassword string `json:"new_password" binding:"required"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input", "details": err.Error()})
			return
		}

		err := services.UpdatePasswordService(input.Token, input.NewPassword)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Password updated successfully"})
	}
}

// UpdateSchoolEmail updates a user's school email
// @Summary Update school email
// @Description Updates a user's school email and sends a verification email
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body map[string]string true "User ID and school email"
// @Success 200 {object} map[string]string "School email updated successfully"
// @Failure 400 {object} map[string]string "Invalid input"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Router /update-school-email [post]
func UpdateSchoolEmail() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get user ID from the context (set by auth middleware)
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		var input struct {
			SchoolEmail string `json:"school_email" binding:"required,email"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input", "details": err.Error()})
			return
		}

		// Update the school email in the profile
		err := services.UpdateSchoolEmail(userID.(uint), input.SchoolEmail)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Send verification email
		err = services.SendVerificationEmailService(input.SchoolEmail)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "School email updated successfully and verification email sent"})
	}
}
