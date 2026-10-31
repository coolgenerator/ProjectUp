package services

import (
	"errors"
	"fmt"
	"log"
	"projectup/helper"
	"projectup/models"
	"projectup/repositories"
	"strings"
	"time"

	"github.com/dgrijalva/jwt-go"
	"github.com/teris-io/shortid"
)

func SignupService(user *models.User) error {
	user.EmailVerified = true

	// Check if email exists - use FindUserByEmail more effectively
	exists, _ := repositories.FindUserByEmail(user.Email)
	if exists {
		log.Printf("Signup attempt with existing email: %s", *user.Email)
		return errors.New("account with this email already exists, please login instead")
	}

	// Check username only if it's provided
	if user.Username != nil && *user.Username != "" {
		if exists, _ := repositories.FindUserByUsername(*user.Username); exists {
			return errors.New("username already exists")
		}
	}

	// Hash password
	hashedPassword := helper.HashPassword(*user.Password)
	user.Password = &hashedPassword

	// Set timestamps
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()

	// Save user to database first (without ShortID)
	if err := repositories.CreateUser(user); err != nil {
		// Check if the error is a duplicate key violation
		if strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "unique constraint") {
			log.Printf("Database constraint error during signup: %v", err)
			return errors.New("account with this email already exists, please login instead")
		}
		return err
	}

	// Generate unique ShortID for the profile
	shortID, _ := shortid.Generate()
	for {
		if !repositories.CheckProfileShortIDExists(shortID) {
			break
		}
		shortID, _ = shortid.Generate()
	}

	// Create a profile with the ShortID
	profile := &models.Profile{
		UserID:  user.ID,
		ShortID: shortID,
	}

	// Save the profile
	if err := repositories.UpdateProfile(user.ID, profile); err != nil {
		return errors.New("failed to create profile")
	}

	// Generate tokens
	token, refreshToken, err := helper.GenerateAllTokens(user.ID)
	if err != nil {
		return errors.New("failed to generate tokens")
	}
	user.Token = &token
	user.RefreshToken = &refreshToken

	// Update user with tokens
	return repositories.UpdateUser(user.ID, user)
}

func LoginService(request *models.LoginRequest) (*models.LoginResponse, error) {
	user, err := repositories.FindUserByIdentifier(request.Identifier)
	if err != nil {
		return nil, errors.New("email or password is incorrect")
	}

	// Verify password
	if valid, msg := helper.VerifyPassword(request.Password, *user.Password); !valid {
		return nil, errors.New(msg.Error())
	}

	// Generate tokens
	token, refreshToken, err := helper.GenerateAllTokens(user.ID)
	if err != nil {
		return nil, errors.New("failed to generate tokens")
	}

	// Update tokens in the database
	helper.UpdateAllTokens(token, refreshToken, user.ID)

	// Get profile information
	var profile models.Profile
	err = repositories.FindProfileByUserID(user.ID, &profile)
	if err != nil {
		// If no profile exists, create one with a ShortID
		shortID, _ := shortid.Generate()
		for {
			if !repositories.CheckProfileShortIDExists(shortID) {
				break
			}
			shortID, _ = shortid.Generate()
		}

		profile = models.Profile{
			UserID:  user.ID,
			ShortID: shortID,
		}
		if err := repositories.UpdateProfile(user.ID, &profile); err != nil {
			return nil, errors.New("failed to create profile")
		}
	}

	// Return structured response
	return &models.LoginResponse{
		Email:        user.Email,
		Username:     user.Username,
		FirstName:    profile.FirstName,
		LastName:     profile.LastName,
		SID:          profile.ShortID, // Use profile's ShortID
		Avatar:       profile.AvatarURL,
		ID:           user.ID,
		Token:        token,
		RefreshToken: refreshToken,
	}, nil
}

func CheckUsernameService(username string) (bool, error) {
	return repositories.FindUserByUsername(username)
}

func CheckEmailService(email string) (bool, error) {
	emailPtr := &email
	return repositories.FindUserByEmail(emailPtr)
}

// Tokens represents a pair of access and refresh tokens
type Tokens struct {
	AccessToken  string
	RefreshToken string
}

func RefreshTokenService(refreshToken string) (*Tokens, error) {
	if refreshToken == "" {
		return nil, fmt.Errorf("refresh token is empty")
	}

	// Validate the refresh token
	log.Printf("Validating refresh token...")
	claims, err := helper.ValidateToken(refreshToken)
	if err != nil {
		log.Printf("Refresh token validation failed: %v", err)
		return nil, fmt.Errorf("invalid or expired refresh token: %w", err)
	}

	log.Printf("Refresh token valid for user ID: %d", claims.ID)

	// Retrieve the user by ID
	user, err := repositories.GetUserByID(claims.ID)
	if err != nil {
		log.Printf("User not found for ID %d: %v", claims.ID, err)
		return nil, fmt.Errorf("user not found")
	}

	// Verify that the provided refresh token matches the one stored for the user
	if user.RefreshToken == nil || *user.RefreshToken == "" {
		log.Printf("User has no refresh token stored in database")
		return nil, fmt.Errorf("refresh token not found in database")
	}

	// Only log part of the token for security reasons
	tokenLength := len(refreshToken)
	if tokenLength > 10 {
		log.Printf("Stored token prefix: %s..., Provided token prefix: %s...",
			(*user.RefreshToken)[:10], refreshToken[:10])
	}

	// Generate new tokens
	log.Printf("Generating new tokens for user ID: %d", claims.ID)
	newAccessToken, newRefreshToken, err := helper.GenerateAllTokens(user.ID)
	if err != nil {
		log.Printf("Failed to generate new tokens: %v", err)
		return nil, fmt.Errorf("failed to generate new tokens: %w", err)
	}

	// Update refresh token in the database
	if err := repositories.UpdateRefreshToken(user.ID, newRefreshToken); err != nil {
		log.Printf("Failed to update refresh token in database: %v", err)
		return nil, fmt.Errorf("failed to update refresh token: %w", err)
	}

	log.Printf("Successfully refreshed tokens for user ID: %d", claims.ID)
	return &Tokens{
		AccessToken:  newAccessToken,
		RefreshToken: newRefreshToken,
	}, nil
}

// RefreshExpiredTokenService attempts to refresh an expired token using the stored refresh token
// Returns the user ID and new tokens if successful, or an error if not
func RefreshExpiredTokenService(expiredToken string) (uint, *Tokens, error) {
	// Parse the expired token without validation to extract the user ID
	token, _ := jwt.ParseWithClaims(expiredToken, &helper.SignedDetails{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(""), nil // We're not validating here, just extracting claims
	})

	if token == nil || token.Claims == nil {
		return 0, nil, errors.New("could not parse expired token")
	}

	claims, ok := token.Claims.(*helper.SignedDetails)
	if !ok {
		return 0, nil, errors.New("could not extract claims from token")
	}

	userID := claims.ID
	if userID == 0 {
		return 0, nil, errors.New("invalid user ID in token")
	}

	// Look up the user to get their refresh token
	user, err := repositories.GetUserByID(userID)
	if err != nil {
		return 0, nil, fmt.Errorf("user not found: %w", err)
	}

	if user.RefreshToken == nil || *user.RefreshToken == "" {
		return 0, nil, errors.New("no refresh token available")
	}

	// Validate the refresh token
	_, err = helper.ValidateToken(*user.RefreshToken)
	if err != nil {
		return 0, nil, fmt.Errorf("invalid refresh token: %w", err)
	}

	// If refresh token is valid, generate new tokens
	newAccessToken, newRefreshToken, err := helper.GenerateAllTokens(userID)
	if err != nil {
		return 0, nil, fmt.Errorf("failed to generate new tokens: %w", err)
	}

	// Update tokens in database
	helper.UpdateAllTokens(newAccessToken, newRefreshToken, userID)

	// Return the user ID and new tokens
	return userID, &Tokens{
		AccessToken:  newAccessToken,
		RefreshToken: newRefreshToken,
	}, nil
}
