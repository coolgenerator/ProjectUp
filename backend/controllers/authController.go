package controllers

import (
	"log"
	"net/http"
	"os"
	"projectup/models"
	"projectup/services"

	"github.com/gin-gonic/gin"
)

// Signup registers a new user
// @Summary Register a new user
// @Description Creates a new user account with the provided details
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body models.User true "User data"
// @Success 201 {object} interface{} "User created successfully"
// @Failure 400 {object} interface{} "Invalid input"
// @Router /signup [post]
func Signup() gin.HandlerFunc {
	return func(c *gin.Context) {
		var user models.User

		if err := c.BindJSON(&user); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input data format", "details": err.Error()})
			return
		}

		if user.Email == nil || *user.Email == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Email is required"})
			return
		}

		if user.Password == nil || *user.Password == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Password is required"})
			return
		}

		if err := services.SignupService(&user); err != nil {
			log.Printf("Signup error: %v", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Remove sensitive data before sending response
		user.Password = nil
		c.JSON(http.StatusCreated, gin.H{"message": "User created successfully", "user": user})
	}
}

// Login authenticates a user
// @Summary User login
// @Description Logs in a user and returns an access token and refresh token
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body models.LoginRequest true "User credentials"
// @Success 200 {object} models.LoginResponse "Successful login"
// @Failure 400 {object} interface{} "Invalid input"
// @Failure 401 {object} interface{} "Unauthorized"
// @Router /login [post]
func Login() gin.HandlerFunc {
	return func(c *gin.Context) {
		var loginRequest models.LoginRequest

		if err := c.ShouldBindJSON(&loginRequest); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input", "details": err.Error()})
			return
		}

		userResponse, err := services.LoginService(&loginRequest)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}

		domain := os.Getenv("DOMAIN")
		if domain == "" {
			domain = "projectup.me"
		}
		log.Print(domain)
		// c.SetCookie("auth_token", token, 3600, "/", domain, false, true)              // Access token (1 hour)
		// c.SetCookie("refresh_token", refreshToken, 2592000, "/", domain, false, true) // Refresh token (30 days)
		c.JSON(http.StatusOK, userResponse)
	}
}

// CheckUsernameHandler checks if a username is already taken
// @Summary Check username availability
// @Description Checks if a given username already exists in the system
// @Tags Auth
// @Produce json
// @Param username query string true "Username to check"
// @Success 200 {object} interface{} "Username exists status"
// @Failure 400 {object} interface{} "Invalid request"
// @Failure 500 {object} interface{} "Database query error"
// @Router /check-username [get]
func CheckUsernameHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		username := c.Query("username")
		if username == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Username is required"})
			return
		}

		exists, err := services.CheckUsernameService(username)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database query failed", "details": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"exists": exists})
	}
}

// CheckEmailHandler checks if an email is already taken
// @Summary Check email availability
// @Description Checks if a given email already exists in the system
// @Tags Auth
// @Produce json
// @Param email query string true "Email to check"
// @Success 200 {object} interface{} "Email exists status"
// @Failure 400 {object} interface{} "Invalid request"
// @Failure 500 {object} interface{} "Database query error"
// @Router /check-email [get]
func CheckEmailHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		email := c.Query("email")
		if email == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Email is required"})
			return
		}

		exists, err := services.CheckEmailService(email)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database query failed", "details": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"exists": exists})
	}
}

// LogoutHandler logs out a user
// @Summary Logout user
// @Description Clears authentication cookies to log out the user
// @Tags Auth
// @Produce json
// @Success 200 {object} interface{} "Logged out successfully"
// @Router /logout [post]
func LogoutHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		domain := os.Getenv("DOMAIN")
		if domain == "" {
			domain = "projectup.me"
		}
		c.SetCookie("auth_token", "", -1, "/", domain, false, true)
		c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
	}
}

// RefreshTokenHandler refreshes an expired access token
// @Summary Refresh access token
// @Description Provides a new access token using a valid refresh token
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body map[string]string true "Refresh token"
// @Success 200 {object} models.LoginResponse "New access token"
// @Failure 400 {object} interface{} "Invalid request"
// @Failure 401 {object} interface{} "Unauthorized"
// @Router /refresh-token [post]
func RefreshTokenHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		var requestBody struct {
			RefreshToken string `json:"refreshToken"`
		}

		// Bind JSON input and validate
		if err := c.ShouldBindJSON(&requestBody); err != nil {
			log.Printf("Invalid refresh token request: %v", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
			return
		}

		if requestBody.RefreshToken == "" {
			log.Printf("Refresh token missing in request")
			c.JSON(http.StatusBadRequest, gin.H{"error": "Refresh token is required"})
			return
		}

		// Log refresh token attempt (truncated for security)
		tokenPreview := requestBody.RefreshToken
		if len(tokenPreview) > 10 {
			tokenPreview = tokenPreview[:10] + "..."
		}
		log.Printf("Attempting to refresh token: %s", tokenPreview)

		// Call the service layer to handle the refresh token logic
		newTokens, err := services.RefreshTokenService(requestBody.RefreshToken)
		if err != nil {
			log.Printf("Token refresh failed: %v", err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired refresh token"})
			return
		}

		// Return the new tokens
		c.JSON(http.StatusOK, gin.H{
			"token":        newTokens.AccessToken,
			"refreshToken": newTokens.RefreshToken,
		})
	}
}
