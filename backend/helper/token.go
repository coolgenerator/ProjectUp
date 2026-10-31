package helper

import (
	"crypto/rand"
	"encoding/base64"
)

// GenerateRandomToken generates a random token of specified length
func GenerateRandomToken(length int) string {
	b := make([]byte, length)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)[:length]
}
