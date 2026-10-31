package repositories

import (
	"errors"
	"projectup/database"
	"projectup/models"
	"strings"
	"time"

	"gorm.io/gorm"
)

func VerifyEmail(email, token string) error {
	var verifiedUser models.VerifiedUser
	err := database.DB.Where("email = ?", email).First(&verifiedUser).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		newUser := models.VerifiedUser{
			Email:             email,
			VerificationToken: token,
			CreatedAt:         time.Now(),
		}
		if err := database.DB.Create(&newUser).Error; err != nil {
			return err
		}
	} else if err == nil {
		if err := database.DB.Model(&verifiedUser).
			Where("email = ?", email).
			Updates(map[string]interface{}{
				"verification_token": token,
				"created_at":         time.Now(),
			}).Error; err != nil {
			return err
		}
	} else {
		return err
	}

	// Check if this is a school email
	if strings.Contains(email, ".edu") || strings.Contains(email, "ac.") {
		// Update profile table for school email
		var profile models.Profile
		err := database.DB.Where("school_email = ?", email).First(&profile).Error
		if err == nil {
			// Update the SchoolEmailVerified flag
			return database.DB.Model(&profile).
				Where("school_email = ?", email).
				Update("school_email_verified", true).Error
		}
	} else {
		// Update user table for regular email
		var user models.User
		err := database.DB.Where("email = ?", &email).First(&user).Error
		if err == nil {
			// Update the EmailVerified flag
			return database.DB.Model(&user).
				Where("email = ?", &email).
				Update("email_verified", true).Error
		}
	}

	return nil
}

func IsEmailVerified(email string) bool {
	// Check in VerifiedUser table
	var verifiedUser models.VerifiedUser
	err := database.DB.Where("email = ?", email).First(&verifiedUser).Error
	if err == nil {
		// Email exists in VerifiedUser table, now update the appropriate model
		if strings.Contains(email, ".edu") || strings.Contains(email, "ac.") {
			// Update profile table for school email (if not already verified)
			var profile models.Profile
			err := database.DB.Where("school_email = ?", email).First(&profile).Error
			if err == nil && !profile.SchoolEmailVerified {
				database.DB.Model(&profile).
					Where("school_email = ?", email).
					Update("school_email_verified", true)
			}
		} else {
			// Update user table for regular email (if not already verified)
			var user models.User
			err := database.DB.Where("email = ?", &email).First(&user).Error
			if err == nil && !user.EmailVerified {
				database.DB.Model(&user).
					Where("email = ?", &email).
					Update("email_verified", true)
			}
		}
		return true
	}
	return false
}

func UpdatePassword(email, hashedPassword string) error {
	result := database.DB.Model(&models.User{}).Where("email = ?", email).Update("password", hashedPassword)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("no user found with the provided email")
	}
	return nil
}
