package helper

import (
	"fmt"
	"log"
	"os"
	"projectup/database"
	"projectup/models"
	"projectup/utils"
	"regexp"
	"strings"
	"time"

	jwt "github.com/dgrijalva/jwt-go"
	"github.com/teris-io/shortid"
)

// Token expiration durations
const (
	AccessTokenExpireDuration  = 24 * time.Hour  // 24 hours
	RefreshTokenExpireDuration = 720 * time.Hour // 30 days
)

type SignedDetails struct {
	ID  uint
	SID string
	jwt.StandardClaims
}

func GenerateTokens(userID uint, profileSID string) (accessToken, refreshToken string, err error) {
	// Get the secret key from environment
	secretKey := os.Getenv("SECRET_KEY")
	if secretKey == "" {
		// Fallback to JWT_SECRET if SECRET_KEY is not set
		secretKey = os.Getenv("JWT_SECRET")
		if secretKey == "" {
			return "", "", fmt.Errorf("missing JWT secret key in environment")
		}
	}

	// Create an access token
	accessToken, err = jwt.NewWithClaims(jwt.SigningMethodHS256, SignedDetails{
		ID:  userID,
		SID: profileSID,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: time.Now().Add(AccessTokenExpireDuration).Unix(),
		},
	}).SignedString([]byte(secretKey))
	if err != nil {
		log.Printf("Error generating access token: %v", err)
		return "", "", err
	}

	// Create a refresh token with a longer validity
	refreshToken, err = jwt.NewWithClaims(jwt.SigningMethodHS256, SignedDetails{
		ID:  userID,
		SID: profileSID,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: time.Now().Add(RefreshTokenExpireDuration).Unix(),
		},
	}).SignedString([]byte(secretKey))
	if err != nil {
		log.Printf("Error generating refresh token: %v", err)
		return "", "", err
	}

	return accessToken, refreshToken, nil
}

func GenerateAllTokens(userID uint) (signedToken, signedRefreshToken string, err error) {
	// Get the profile ShortID
	var profile models.Profile
	err = database.DB.Where("user_id = ?", userID).First(&profile).Error
	if err != nil {
		// If no profile exists, create one
		shortID, _ := shortid.Generate()
		profile = models.Profile{
			UserID:  userID,
			ShortID: shortID,
		}

		// Save the profile
		if err := database.DB.Create(&profile).Error; err != nil {
			return "", "", err
		}
	}

	return GenerateTokens(userID, profile.ShortID)
}

func UpdateAllTokens(signedToken string, signedRefreshToken string, id uint) {
	updatedAt, _ := time.Parse(time.RFC3339, time.Now().Format(time.RFC3339))
	updates := map[string]interface{}{
		"token":         signedToken,
		"refresh_token": signedRefreshToken,
		"updated_at":    updatedAt,
	}

	result := database.DB.Model(&models.User{}).Where("id = ?", id).Updates(updates)
	if result.Error != nil {
		log.Printf("Failed to update tokens: %v", result.Error)
		return
	}

	if result.RowsAffected == 0 {
		log.Printf("No rows updated for id: %d", id)
		return
	} else {
		log.Printf("Tokens updated successfully for id: %d", id)
	}
}

// GenerateShortID generates a random alphanumeric string of the given length.
func GenerateShortID(length int) string {
	shortID, err := utils.GenerateShortID()
	if err != nil {
		log.Printf("Failed to generate short ID: %v", err)
		return ""
	}
	// Ensure we don't exceed the length of the generated ID
	if len(shortID) < length {
		return shortID
	}
	return shortID[:length]
}

// Slugify generates a URL-friendly slug from a given string.
func Slugify(input string) string {
	// Convert to lowercase
	input = strings.ToLower(input)

	// Replace spaces and underscores with hyphens
	input = strings.ReplaceAll(input, " ", "-")
	input = strings.ReplaceAll(input, "_", "-")

	// Remove all non-alphanumeric characters except hyphens
	reg, _ := regexp.Compile("[^a-zA-Z0-9-]+")
	input = reg.ReplaceAllString(input, "")

	// Trim leading and trailing hyphens
	input = strings.Trim(input, "-")

	return input
}

func GenerateToken(email string) (string, error) {
	// Set expiration time for the token (e.g., 15 minutes)
	expirationTime := time.Now().Add(15 * time.Minute)

	// Create the claims
	claims := &jwt.StandardClaims{
		Subject:   email,
		ExpiresAt: expirationTime.Unix(),
	}

	// Create the token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	secretKey := os.Getenv("JWT_SECRET")

	// Sign the token with the secret key
	tokenString, err := token.SignedString([]byte(secretKey))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

func ParseAndValidateToken(tokenString string, claims jwt.Claims) error {
	secretKey := os.Getenv("JWT_SECRET")

	// Parse and validate the token
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		// Ensure the token uses the correct signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secretKey), nil
	})

	if err != nil {
		return fmt.Errorf("failed to parse token: %w", err)
	}

	// Ensure the token is valid
	if !token.Valid {
		return fmt.Errorf("invalid or expired token")
	}

	return nil
}

func ValidateToken(signedToken string) (*SignedDetails, error) {
	claims := &SignedDetails{}

	// Get the appropriate key for token validation
	secretKey := os.Getenv("SECRET_KEY")
	if secretKey == "" {
		// Fallback to JWT_SECRET if SECRET_KEY is not set
		secretKey = os.Getenv("JWT_SECRET")
		if secretKey == "" {
			return nil, fmt.Errorf("missing JWT secret key in environment")
		}
	}

	// Parse and validate the token
	token, err := jwt.ParseWithClaims(signedToken, claims, func(token *jwt.Token) (interface{}, error) {
		// Ensure the token uses the correct signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secretKey), nil
	})

	if err != nil {
		log.Printf("Token validation error: %v", err)
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	// Ensure the token is valid
	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	// Additional custom validation (e.g., expiration)
	if claims.ExpiresAt < time.Now().Unix() {
		return nil, fmt.Errorf("token is expired")
	}

	return claims, nil
}

func VerifyToken(tokenString string) (jwt.MapClaims, error) {
	claims := jwt.MapClaims{}

	err := ParseAndValidateToken(tokenString, claims)
	if err != nil {
		return nil, err
	}

	return claims, nil
}
