package services

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"projectup/config"
	"projectup/helper"
	"projectup/models"
	"projectup/repositories"
	"time"

	"github.com/teris-io/shortid"
)

type OAuthService struct {
	config *config.Config
}

func NewOAuthService(cfg *config.Config) *OAuthService {
	return &OAuthService{
		config: cfg,
	}
}

// Google OAuth2
func (s *OAuthService) GetGoogleAuthURL(redirectURI string) string {
	if redirectURI == "" {
		redirectURI = fmt.Sprintf("%s/auth/google/callback", s.config.ClientURL)
	}
	scope := "email profile"
	return fmt.Sprintf(
		"https://accounts.google.com/o/oauth2/v2/auth?client_id=%s&redirect_uri=%s&response_type=code&scope=%s&access_type=offline&prompt=consent",
		s.config.GoogleClientID,
		redirectURI,
		url.QueryEscape(scope),
	)
}

func (s *OAuthService) HandleGoogleCallback(code string) (*models.LoginResponse, error) {
	redirectURI := fmt.Sprintf("%s/auth/google/callback", s.config.ClientURL)

	// Exchange code for tokens
	tokenURL := "https://oauth2.googleapis.com/token"
	data := url.Values{}
	data.Set("client_id", s.config.GoogleClientID)
	data.Set("client_secret", s.config.GoogleClientSecret)
	data.Set("code", code)
	data.Set("redirect_uri", redirectURI)
	data.Set("grant_type", "authorization_code")

	resp, err := http.PostForm(tokenURL, data)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange code for tokens: %v", err)
	}
	defer resp.Body.Close()

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		IDToken     string `json:"id_token"`
		ExpiresIn   int    `json:"expires_in"`
		TokenType   string `json:"token_type"`
		Scope       string `json:"scope"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, fmt.Errorf("failed to decode token response: %v", err)
	}

	// Get user info
	userInfoURL := "https://www.googleapis.com/oauth2/v2/userinfo"
	req, err := http.NewRequest("GET", userInfoURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create user info request: %v", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", tokenResp.AccessToken))
	client := &http.Client{}
	resp, err = client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to get user info: %v", err)
	}
	defer resp.Body.Close()

	var userInfo struct {
		ID            string `json:"id"`
		Email         string `json:"email"`
		VerifiedEmail bool   `json:"verified_email"`
		Name          string `json:"name"`
		GivenName     string `json:"given_name"`
		FamilyName    string `json:"family_name"`
		Picture       string `json:"picture"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return nil, fmt.Errorf("failed to decode user info: %v", err)
	}

	// Check if user exists
	exists, err := repositories.FindUserByEmail(&userInfo.Email)
	if err != nil {
		return nil, fmt.Errorf("failed to check user existence: %v", err)
	}

	var user *models.User
	if !exists {
		// Create new user
		user = &models.User{
			Email:         &userInfo.Email,
			EmailVerified: userInfo.VerifiedEmail,
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}

		// Save the user first
		if err := repositories.CreateUser(user); err != nil {
			return nil, fmt.Errorf("failed to create user: %v", err)
		}

		// Generate unique ShortID for profile
		shortID, _ := shortid.Generate()
		for {
			if !repositories.CheckProfileShortIDExists(shortID) {
				break
			}
			shortID, _ = shortid.Generate()
		}

		// Create profile for the user
		profile := models.Profile{
			UserID:    user.ID,
			ShortID:   shortID,
			FirstName: &userInfo.GivenName,
			LastName:  &userInfo.FamilyName,
			AvatarURL: &userInfo.Picture,
		}
		if err := repositories.UpdateProfile(user.ID, &profile); err != nil {
			return nil, fmt.Errorf("failed to create profile: %v", err)
		}
	} else {
		// Get existing user
		user, err = repositories.FindUserByIdentifier(userInfo.Email)
		if err != nil {
			return nil, fmt.Errorf("failed to get user: %v", err)
		}
	}

	// Get profile for the user
	var profile models.Profile
	if err := repositories.FindProfileByUserID(user.ID, &profile); err != nil {
		// If profile not found, create one with a ShortID
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
		// Save the new profile
		if err := repositories.UpdateProfile(user.ID, &profile); err != nil {
			return nil, fmt.Errorf("failed to create profile: %v", err)
		}
	}

	// Generate tokens
	token, refreshToken, err := helper.GenerateAllTokens(user.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to generate tokens: %v", err)
	}

	// Update tokens in the database
	helper.UpdateAllTokens(token, refreshToken, user.ID)

	return &models.LoginResponse{
		Email:        user.Email,
		Username:     user.Username,
		FirstName:    profile.FirstName,
		LastName:     profile.LastName,
		SID:          profile.ShortID,
		Avatar:       profile.AvatarURL,
		ID:           user.ID,
		Token:        token,
		RefreshToken: refreshToken,
	}, nil
}

// Facebook OAuth2
func (s *OAuthService) GetFacebookAuthURL() string {
	redirectURI := fmt.Sprintf("%s/auth/facebook/callback", s.config.ClientURL)
	scope := "email public_profile"
	return fmt.Sprintf(
		"https://www.facebook.com/v12.0/dialog/oauth?client_id=%s&redirect_uri=%s&scope=%s&response_type=code",
		s.config.FacebookClientID,
		redirectURI,
		url.QueryEscape(scope),
	)
}

func (s *OAuthService) HandleFacebookCallback(code string) (*models.LoginResponse, error) {
	redirectURI := fmt.Sprintf("%s/auth/facebook/callback", s.config.ClientURL)

	// Exchange code for tokens
	tokenURL := "https://graph.facebook.com/v12.0/oauth/access_token"
	data := url.Values{}
	data.Set("client_id", s.config.FacebookClientID)
	data.Set("client_secret", s.config.FacebookClientSecret)
	data.Set("code", code)
	data.Set("redirect_uri", redirectURI)

	resp, err := http.PostForm(tokenURL, data)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange code for tokens: %v", err)
	}
	defer resp.Body.Close()

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, fmt.Errorf("failed to decode token response: %v", err)
	}

	// Get user info
	userInfoURL := fmt.Sprintf("https://graph.facebook.com/v12.0/me?fields=id,name,email,picture&access_token=%s", tokenResp.AccessToken)
	resp, err = http.Get(userInfoURL)
	if err != nil {
		return nil, fmt.Errorf("failed to get user info: %v", err)
	}
	defer resp.Body.Close()

	var userInfo struct {
		ID      string `json:"id"`
		Name    string `json:"name"`
		Email   string `json:"email"`
		Picture struct {
			Data struct {
				URL string `json:"url"`
			} `json:"data"`
		} `json:"picture"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return nil, fmt.Errorf("failed to decode user info: %v", err)
	}

	// Check if user exists
	exists, err := repositories.FindUserByEmail(&userInfo.Email)
	if err != nil {
		return nil, fmt.Errorf("failed to check user existence: %v", err)
	}

	var user *models.User
	if !exists {
		// Create new user
		user = &models.User{
			Email:         &userInfo.Email,
			EmailVerified: true, // Facebook emails are verified
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}

		// Save the user first
		if err := repositories.CreateUser(user); err != nil {
			return nil, fmt.Errorf("failed to create user: %v", err)
		}

		// Generate unique ShortID for profile
		shortID, _ := shortid.Generate()
		for {
			if !repositories.CheckProfileShortIDExists(shortID) {
				break
			}
			shortID, _ = shortid.Generate()
		}

		// Create profile for the user
		profile := models.Profile{
			UserID:    user.ID,
			ShortID:   shortID,
			AvatarURL: &userInfo.Picture.Data.URL,
		}
		if err := repositories.UpdateProfile(user.ID, &profile); err != nil {
			return nil, fmt.Errorf("failed to create profile: %v", err)
		}
	} else {
		// Get existing user
		user, err = repositories.FindUserByIdentifier(userInfo.Email)
		if err != nil {
			return nil, fmt.Errorf("failed to get user: %v", err)
		}
	}

	// Get profile for the user
	var profile models.Profile
	if err := repositories.FindProfileByUserID(user.ID, &profile); err != nil {
		// If profile not found, create one with a ShortID
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
		// Save the new profile
		if err := repositories.UpdateProfile(user.ID, &profile); err != nil {
			return nil, fmt.Errorf("failed to create profile: %v", err)
		}
	}

	// Generate tokens
	token, refreshToken, err := helper.GenerateAllTokens(user.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to generate tokens: %v", err)
	}

	// Update tokens in the database
	helper.UpdateAllTokens(token, refreshToken, user.ID)

	return &models.LoginResponse{
		Email:        user.Email,
		Username:     user.Username,
		FirstName:    profile.FirstName,
		LastName:     profile.LastName,
		SID:          profile.ShortID,
		Avatar:       profile.AvatarURL,
		ID:           user.ID,
		Token:        token,
		RefreshToken: refreshToken,
	}, nil
}

// Discord OAuth2
func (s *OAuthService) GetDiscordAuthURL() string {
	redirectURI := fmt.Sprintf("%s/auth/discord/callback", s.config.ClientURL)
	scope := "identify email"
	return fmt.Sprintf(
		"https://discord.com/api/oauth2/authorize?client_id=%s&redirect_uri=%s&response_type=code&scope=%s",
		s.config.DiscordClientID,
		redirectURI,
		url.QueryEscape(scope),
	)
}

func (s *OAuthService) HandleDiscordCallback(code string) (*models.LoginResponse, error) {
	redirectURI := fmt.Sprintf("%s/auth/discord/callback", s.config.ClientURL)

	// Exchange code for tokens
	tokenURL := "https://discord.com/api/oauth2/token"
	data := url.Values{}
	data.Set("client_id", s.config.DiscordClientID)
	data.Set("client_secret", s.config.DiscordClientSecret)
	data.Set("code", code)
	data.Set("redirect_uri", redirectURI)
	data.Set("grant_type", "authorization_code")

	resp, err := http.PostForm(tokenURL, data)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange code for tokens: %v", err)
	}
	defer resp.Body.Close()

	var tokenResp struct {
		AccessToken  string `json:"access_token"`
		TokenType    string `json:"token_type"`
		ExpiresIn    int    `json:"expires_in"`
		RefreshToken string `json:"refresh_token"`
		Scope        string `json:"scope"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, fmt.Errorf("failed to decode token response: %v", err)
	}

	// Get user info
	userInfoURL := "https://discord.com/api/users/@me"
	req, err := http.NewRequest("GET", userInfoURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create user info request: %v", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", tokenResp.AccessToken))
	client := &http.Client{}
	resp, err = client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to get user info: %v", err)
	}
	defer resp.Body.Close()

	var userInfo struct {
		ID       string `json:"id"`
		Username string `json:"username"`
		Email    string `json:"email"`
		Avatar   string `json:"avatar"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return nil, fmt.Errorf("failed to decode user info: %v", err)
	}

	// Handle missing email
	if userInfo.Email == "" {
		return nil, fmt.Errorf("email not provided by Discord")
	}

	// Format Discord avatar URL
	var avatarURL string
	if userInfo.Avatar != "" {
		avatarURL = fmt.Sprintf("https://cdn.discordapp.com/avatars/%s/%s.png", userInfo.ID, userInfo.Avatar)
	}

	// Check if user exists
	exists, err := repositories.FindUserByEmail(&userInfo.Email)
	if err != nil {
		return nil, fmt.Errorf("failed to check user existence: %v", err)
	}

	var user *models.User
	if !exists {
		// Create new user
		user = &models.User{
			Email:         &userInfo.Email,
			EmailVerified: true, // Discord emails are verified
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}

		// Save the user first
		if err := repositories.CreateUser(user); err != nil {
			return nil, fmt.Errorf("failed to create user: %v", err)
		}

		// Generate unique ShortID for profile
		shortID, _ := shortid.Generate()
		for {
			if !repositories.CheckProfileShortIDExists(shortID) {
				break
			}
			shortID, _ = shortid.Generate()
		}

		// Create profile for the user
		profile := models.Profile{
			UserID:    user.ID,
			ShortID:   shortID,
			AvatarURL: &avatarURL,
		}
		if err := repositories.UpdateProfile(user.ID, &profile); err != nil {
			return nil, fmt.Errorf("failed to create profile: %v", err)
		}
	} else {
		// Get existing user
		user, err = repositories.FindUserByIdentifier(userInfo.Email)
		if err != nil {
			return nil, fmt.Errorf("failed to get user: %v", err)
		}
	}

	// Get profile for the user
	var profile models.Profile
	if err := repositories.FindProfileByUserID(user.ID, &profile); err != nil {
		// If profile not found, create one with a ShortID
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
		// Save the new profile
		if err := repositories.UpdateProfile(user.ID, &profile); err != nil {
			return nil, fmt.Errorf("failed to create profile: %v", err)
		}
	}

	// Generate tokens
	token, refreshToken, err := helper.GenerateAllTokens(user.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to generate tokens: %v", err)
	}

	// Update tokens in the database
	helper.UpdateAllTokens(token, refreshToken, user.ID)

	return &models.LoginResponse{
		Email:        user.Email,
		Username:     user.Username,
		FirstName:    profile.FirstName,
		LastName:     profile.LastName,
		SID:          profile.ShortID,
		Avatar:       profile.AvatarURL,
		ID:           user.ID,
		Token:        token,
		RefreshToken: refreshToken,
	}, nil
}
