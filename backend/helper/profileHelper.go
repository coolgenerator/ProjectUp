package helper

import (
	"fmt"
	"net/http"
	"net/url"
	"os"
	"projectup/models"
	"time"

	"github.com/gin-gonic/gin"
)

func isValidURL(input string) bool {
	_, err := url.ParseRequestURI(input)
	return err == nil
}

// ProcessAvatar handles avatar processing for profiles
func ProcessAvatar(c *gin.Context, profile *models.Profile) error {
	avatar := c.PostForm("avatar")
	//
	if isValidURL(avatar) {
		// Avatar is a URL
		profile.AvatarURL = &avatar
	} else {
		// Avatar is an uploaded file
		file, err := c.FormFile("avatar")
		if err == nil {
			// Save the file locally
			filePath := "./" + file.Filename
			if saveErr := c.SaveUploadedFile(file, filePath); saveErr != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save avatar locally", "details": saveErr.Error()})
				return fmt.Errorf("failed to save avatar locally: %w", saveErr)
			}

			// Generate a unique filename
			fileHash, _ := GenerateFileHash(filePath)
			timestamp := time.Now().Format("20250102150405")
			uniqueFilename := fmt.Sprintf("avatar/%s_%s_%s", fileHash, timestamp, file.Filename)

			// Upload the file to S3
			bucketName := os.Getenv("AWS_BUCKET_NAME")
			if uploadErr := UploadFileIfUnique(bucketName, uniqueFilename, filePath, true); uploadErr != nil {
				os.Remove(filePath) // Remove local file if upload fails
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload avatar to S3", "details": uploadErr.Error()})
				return fmt.Errorf("failed to upload avatar to S3: %w", uploadErr)
			}

			// Remove the local file after successful upload
			os.Remove(filePath)

			// Set the S3 file URL in the profile model
			uploadedURL := PublicFileURL(bucketName, uniqueFilename)
			profile.AvatarURL = &uploadedURL
		}
	}
	return nil
}

func StringPtr(s string) *string {
	return &s
}

func GenerateUniqueFilename(filePath, originalFilename string) string {
	fileHash, _ := GenerateFileHash(filePath)
	timestamp := time.Now().Format("20060102150405")
	return fmt.Sprintf("avatar/%s_%s_%s", fileHash, timestamp, originalFilename)
}

// Helper function to handle optional string fields
func OptionalString(values map[string][]string, key string) *string {
	if v, ok := values[key]; ok && len(v) > 0 && v[0] != "" {
		return &v[0]
	}
	return nil
}

// Helper function to handle optional byte fields
func OptionalBytes(values map[string][]string, key string) []byte {
	if v, ok := values[key]; ok && len(v) > 0 && v[0] != "" {
		return []byte(v[0])
	}
	return nil
}
