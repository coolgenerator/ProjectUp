package repositories

import (
	"errors"
	"fmt"
	"projectup/database"
	"projectup/models"
	"strings"
	"time"

	"gorm.io/gorm"
)

func FindUserByEmail(email *string) (bool, error) {
	var user models.User
	err := database.DB.Where("email = ?", email).First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return false, nil
	}
	return err == nil, err
}

func FindUserByUsername(username string) (bool, error) {
	var user models.User
	err := database.DB.Where("username = ?", username).First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return false, nil
	}
	return err == nil, err
}

func FindUserByIdentifier(identifier string) (*models.User, error) {
	var user models.User
	// Trim whitespace and convert to lowercase for case-insensitive comparison
	identifier = strings.TrimSpace(identifier)
	err := database.DB.Where("LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)", identifier, identifier).First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, errors.New("user not found")
	}
	return &user, err
}

// CheckShortIDExists is now checking for ShortID in the Profile table
func CheckShortIDExists(shortID string) bool {
	var profile models.Profile
	err := database.DB.Where("sid = ?", shortID).First(&profile).Error
	return err == nil
}

func CreateUser(user *models.User) error {
	return database.DB.Create(user).Error
}

func GetUserByID(userID uint) (*models.User, error) {
	var user models.User
	if err := database.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func UpdateRefreshToken(userID uint, refreshToken string) error {
	updates := map[string]interface{}{
		"refresh_token": refreshToken,
		"updated_at":    time.Now(),
	}

	result := database.DB.Model(&models.User{}).Where("id = ?", userID).Updates(updates)
	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("no rows updated for userID: %d", userID)
	}

	return nil
}
