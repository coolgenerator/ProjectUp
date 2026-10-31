package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"io"
	"os"
)

// GetEncryptionKey retrieves the encryption key from environment variables
// In production, this should be a strong, randomly generated key stored securely
func GetEncryptionKey() []byte {
	key := os.Getenv("API_KEY_ENCRYPTION_KEY")
	if key == "" {
		// Default key for development only - should be replaced in production
		// 32 bytes for AES-256
		key = "your-32-byte-encryption-key!"
	}

	// Ensure key is exactly 32 bytes for AES-256
	keyBytes := []byte(key)
	if len(keyBytes) < 32 {
		// Pad with zeros if too short
		paddedKey := make([]byte, 32)
		copy(paddedKey, keyBytes)
		return paddedKey
	}

	// Truncate if too long
	return keyBytes[:32]
}

// EncryptAPIKey encrypts an API key using AES-256-GCM
func EncryptAPIKey(plaintext string) (string, error) {
	key := GetEncryptionKey()

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	// Use GCM mode for authenticated encryption
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	// Generate a random nonce
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	// Encrypt the data
	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)

	// Encode to base64 for storage
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// DecryptAPIKey decrypts an API key using AES-256-GCM
func DecryptAPIKey(encrypted string) (string, error) {
	key := GetEncryptionKey()

	// Decode from base64
	ciphertext, err := base64.StdEncoding.DecodeString(encrypted)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return "", errors.New("ciphertext too short")
	}

	// Extract nonce and ciphertext
	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]

	// Decrypt the data
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

// MaskAPIKey returns a masked version of the API key for display
// Shows first 8 and last 4 characters, masks the rest
func MaskAPIKey(apiKey string) string {
	if len(apiKey) <= 12 {
		// For short keys, just show first few characters
		if len(apiKey) <= 4 {
			return "****"
		}
		return apiKey[:4] + "****"
	}

	// Show first 8 and last 4 characters
	return apiKey[:8] + "..." + apiKey[len(apiKey)-4:]
}
