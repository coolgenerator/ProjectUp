package config

import (
	"os"
	"strconv"
	"time"
)

// Config Application configuration structure
type Config struct {
	ServerPort        string
	DatabaseURL       string
	ClientURL         string
	JWTSecret         string
	TokenExpiration   time.Duration
	RefreshSecret     string
	RefreshExpiration time.Duration
	Environment       string
	// OAuth2 Configuration
	GoogleClientID       string
	GoogleClientSecret   string
	FacebookClientID     string
	FacebookClientSecret string
	DiscordClientID      string
	DiscordClientSecret  string
}

// LoadConfig Load configuration from environment variables
func LoadConfig() (*Config, error) {
	tokenExpStr := os.Getenv("TOKEN_EXPIRATION")
	tokenExp := 24 * time.Hour // Default 24 hours
	if tokenExpStr != "" {
		exp, err := strconv.Atoi(tokenExpStr)
		if err == nil {
			tokenExp = time.Duration(exp) * time.Hour
		}
	}

	refreshExpStr := os.Getenv("REFRESH_EXPIRATION")
	refreshExp := 7 * 24 * time.Hour // Default 7 days
	if refreshExpStr != "" {
		exp, err := strconv.Atoi(refreshExpStr)
		if err == nil {
			refreshExp = time.Duration(exp) * time.Hour
		}
	}

	// Get database URL, use default value if not set
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/projectup?sslmode=disable"
	}

	// Get client URL from BASE_URL environment variable
	clientURL := os.Getenv("BASE_URL")
	if clientURL == "" {
		clientURL = "http://localhost:5173"
	}

	// JWT secret, use default value if not set (should always be set in production)
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "ProjectUp_2024_Secure_JWT_Secret_Key_Change_In_Production"
	}

	// Refresh secret, use default value if not set
	refreshSecret := os.Getenv("REFRESH_SECRET")
	if refreshSecret == "" {
		refreshSecret = "ProjectUp_2024_Secure_Refresh_Secret_Key_Change_In_Production"
	}

	// Server port
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Environment (development/production)
	env := os.Getenv("ENV")
	if env == "" {
		env = "development"
	}

	// OAuth2 credentials
	googleClientID := os.Getenv("GOOGLE_CLIENT_ID")
	googleClientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")
	facebookClientID := os.Getenv("FACEBOOK_CLIENT_ID")
	facebookClientSecret := os.Getenv("FACEBOOK_CLIENT_SECRET")
	discordClientID := os.Getenv("DISCORD_CLIENT_ID")
	discordClientSecret := os.Getenv("DISCORD_CLIENT_SECRET")

	return &Config{
		ServerPort:           port,
		DatabaseURL:          dbURL,
		ClientURL:            clientURL,
		JWTSecret:            jwtSecret,
		TokenExpiration:      tokenExp,
		RefreshSecret:        refreshSecret,
		RefreshExpiration:    refreshExp,
		Environment:          env,
		GoogleClientID:       googleClientID,
		GoogleClientSecret:   googleClientSecret,
		FacebookClientID:     facebookClientID,
		FacebookClientSecret: facebookClientSecret,
		DiscordClientID:      discordClientID,
		DiscordClientSecret:  discordClientSecret,
	}, nil
}
