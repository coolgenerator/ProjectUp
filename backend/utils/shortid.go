package utils

import (
	"crypto/rand"
	"encoding/base64"
)

// GenerateShortID creates a new unique short ID
func GenerateShortID() (string, error) {
	// Generate 6 random bytes
	b := make([]byte, 6)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}

	// Encode to base64 URL-safe string
	return base64.URLEncoding.EncodeToString(b), nil
}
