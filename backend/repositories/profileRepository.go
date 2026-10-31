package repositories

import (
	"errors"
	"projectup/database"
	"projectup/helper"
	"projectup/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func FindUserByID(userId string) (*models.User, error) {
	var user models.User
	if err := database.DB.Where("id = ?", userId).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &user, nil
}

func FindUserByShortID(shortID string) (*models.User, error) {
	var user models.User
	if err := database.DB.Where("sid = ?", shortID).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &user, nil
}

// GetProfileByUserID retrieves a profile by user ID
func GetProfileByUserID(userID uint, profile *models.Profile) error {
	result := database.DB.Where("user_id = ?", userID).First(profile)

	// If profile doesn't exist, create a new one
	if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		newProfile := models.Profile{
			UserID: userID,
		}
		// Generate a unique ShortID before creating the profile
		if err := GenerateProfileShortID(&newProfile); err != nil {
			return err
		}
		if err := database.DB.Create(&newProfile).Error; err != nil {
			return err
		}
		*profile = newProfile
		return nil
	}

	return result.Error
}

// FindProfileByUserID retrieves a profile based on user ID
func FindProfileByUserID(userID uint, profile *models.Profile) error {
	return database.DB.Where("user_id = ?", userID).First(profile).Error
}

// FindProfileByShortID retrieves a profile based on its ShortID
func FindProfileByShortID(shortID string) (*models.Profile, error) {
	var profile models.Profile
	if err := database.DB.Where("sid = ?", shortID).First(&profile).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("profile not found")
		}
		return nil, err
	}
	return &profile, nil
}

// CheckProfileShortIDExists checks if a profile with the given ShortID exists
func CheckProfileShortIDExists(shortID string) bool {
	var profile models.Profile
	err := database.DB.Where("sid = ?", shortID).First(&profile).Error
	return err == nil
}

// GenerateProfileShortID generates a unique short ID for a profile
func GenerateProfileShortID(profile *models.Profile) error {
	for {
		shortID := helper.GenerateShortID(8)
		var conflictProfile models.Profile
		if err := database.DB.Where("sid = ?", shortID).First(&conflictProfile).Error; errors.Is(err, gorm.ErrRecordNotFound) {
			profile.ShortID = shortID
			return nil
		} else if err != nil {
			return err
		}
		// If we get here, there was a conflict, so loop and try again
	}
}

// UpdateUser updates user information
func UpdateUser(userID uint, user *models.User) error {
	return UpdateUserTx(database.DB, userID, user)
}

// UpdateUserTx updates user information within a transaction
func UpdateUserTx(tx *gorm.DB, userID uint, user *models.User) error {
	return tx.Model(&models.User{}).Where("id = ?", userID).Updates(user).Error
}

// UpdateProfile updates profile information
func UpdateProfile(userID uint, profile *models.Profile) error {
	return UpdateProfileTx(database.DB, userID, profile)
}

// UpdateProfileTx updates profile information within a transaction
func UpdateProfileTx(tx *gorm.DB, userID uint, profile *models.Profile) error {
	// Check if profile exists
	var count int64
	if err := tx.Model(&models.Profile{}).Where("user_id = ?", userID).Count(&count).Error; err != nil {
		return err
	}

	// If profile doesn't exist, create it
	if count == 0 {
		profile.UserID = userID
		// Generate a unique ShortID before creating the profile
		if err := GenerateProfileShortID(profile); err != nil {
			return err
		}
		return tx.Create(profile).Error
	}

	// Otherwise update it - Omit ShortID, UserID, and timestamps from updates
	// ShortID should never be changed after creation
	// UserID is the primary key and shouldn't be updated
	// Timestamps are handled automatically by GORM
	return tx.Model(&models.Profile{}).Where("user_id = ?", userID).Omit("sid", "user_id", "created_at", "updated_at").Updates(profile).Error
}

// Deprecated: Use UpdateUser and UpdateProfile instead
func UpdateUserRepository(user *models.User, userID uint) error {
	return database.DB.Model(&models.User{}).Where("id = ?", userID).Updates(user).Error
}

// SaveSkills saves a user's skills with default proficiency level - simplified version
func SaveSkills(userID uint, skills []string) error {
	// Convert to struct format and use SaveSkillsWithLevels
	skillsWithLevels := make([]struct {
		Name  string
		Level int
	}, len(skills))

	for i, skill := range skills {
		skillsWithLevels[i] = struct {
			Name  string
			Level int
		}{Name: skill, Level: 3} // Default level
	}

	return SaveSkillsWithLevels(userID, skillsWithLevels)
}

// SaveInterests saves a user's interests with default interest level - simplified version
func SaveInterests(userID uint, interests []string) error {
	// Convert to struct format and use SaveInterestsWithLevels
	interestsWithLevels := make([]struct {
		Name  string
		Level int
	}, len(interests))

	for i, interest := range interests {
		interestsWithLevels[i] = struct {
			Name  string
			Level int
		}{Name: interest, Level: 3} // Default level
	}

	return SaveInterestsWithLevels(userID, interestsWithLevels)
}

// GetUserSkills retrieves a user's skills with their proficiency levels - simplified version
func GetUserSkills(userID uint) ([]models.UserSkill, error) {
	var skills []models.UserSkill
	if err := database.DB.Where("user_id = ?", userID).Find(&skills).Error; err != nil {
		return nil, err
	}
	return skills, nil
}

// GetUserInterests retrieves a user's interests with their interest levels - simplified version
func GetUserInterests(userID uint) ([]models.UserInterest, error) {
	var interests []models.UserInterest
	if err := database.DB.Where("user_id = ?", userID).Find(&interests).Error; err != nil {
		return nil, err
	}
	return interests, nil
}

// UpdateUserSkills replaces user's skills - simplified version
func UpdateUserSkills(userID uint, skills []string) error {
	// Just use SaveSkills which replaces all skills
	return SaveSkills(userID, skills)
}

// UpdateUserInterests replaces user's interests - simplified version
func UpdateUserInterests(userID uint, interests []string) error {
	// Start a transaction
	tx := database.DB.Begin()
	if tx.Error != nil {
		return tx.Error
	}

	// Get existing interests
	var existingInterests []models.UserInterest
	if err := tx.Where("user_id = ?", userID).Find(&existingInterests).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Map of existing interest names for quick lookup
	existingInterestMap := make(map[string]bool)

	// Process existing interests
	for _, interest := range existingInterests {
		// Store the interest name directly (no concept table needed)
		existingInterestMap[interest.Name] = true
	}

	// Check which interests should be removed (not in the new interests list)
	interestsToKeep := make(map[string]bool)
	for _, interestName := range interests {
		interestsToKeep[interestName] = true
	}

	// Remove interests that are not in the new list
	for _, interest := range existingInterests {
		if !interestsToKeep[interest.Name] {
			if err := tx.Where("user_id = ? AND name = ?", userID, interest.Name).Delete(&models.UserInterest{}).Error; err != nil {
				tx.Rollback()
				return err
			}
		}
	}

	// Add new interests that don't exist yet
	for _, interestName := range interests {
		// Skip if already exists
		if existingInterestMap[interestName] {
			continue
		}

		// Create user_interest with default interest level
		defaultInterestLevel := 3 // Default middle level
		userInterest := models.UserInterest{
			UserID: userID,
			Name:   interestName,
			Level:  defaultInterestLevel,
		}
		if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&userInterest).Error; err != nil {
			tx.Rollback()
			return err
		}
	}

	return tx.Commit().Error
}

// FindUserSkillByUserAndConceptID finds a specific UserSkill record
func FindUserSkillByUserAndConceptID(userID uint, conceptID uint, userSkill *models.UserSkill) error {
	return database.DB.Where("user_id = ? AND concept_id = ?", userID, conceptID).First(userSkill).Error
}

// FindUserInterestByUserAndConceptID finds a specific UserInterest record
func FindUserInterestByUserAndConceptID(userID uint, conceptID uint, userInterest *models.UserInterest) error {
	return database.DB.Where("user_id = ? AND concept_id = ?", userID, conceptID).First(userInterest).Error
}

// UpdateLanguagePreference updates the user's language preference
func UpdateLanguagePreference(userID uint, language string) error {
	return database.DB.Model(&models.Profile{}).Where("user_id = ?", userID).Update("language", language).Error
}

// UpdateDisplayNamePreference updates the user's display name preference
// DEPRECATED: Use UpdateDisplayNamePreferenceNew from preferencesRepository instead
// This function is kept for backward compatibility but now uses the UserPreferences table
func UpdateDisplayNamePreference(userID uint, preference int) error {
	// Use the new preferences table instead of profile table
	return UpdateDisplayNamePreferenceNew(userID, preference)
}

// SaveSkillsWithLevels saves user skills with proficiency levels - simplified version
func SaveSkillsWithLevels(userID uint, skills []struct {
	Name  string
	Level int
}) error {
	// Start a transaction
	tx := database.DB.Begin()
	if tx.Error != nil {
		return tx.Error
	}

	// Use the transaction-aware version
	if err := SaveSkillsWithLevelsTx(tx, userID, skills); err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit().Error
}

// SaveSkillsWithLevelsTx saves user skills with proficiency levels within a transaction
func SaveSkillsWithLevelsTx(tx *gorm.DB, userID uint, skills []struct {
	Name  string
	Level int
}) error {
	// Delete existing user skills
	if err := tx.Where("user_id = ?", userID).Delete(&models.UserSkill{}).Error; err != nil {
		return err
	}

	// Create new skills
	for _, skillData := range skills {
		userSkill := models.UserSkill{
			UserID: userID,
			Name:   skillData.Name,
			Level:  skillData.Level,
		}
		if err := tx.Create(&userSkill).Error; err != nil {
			return err
		}
	}

	return nil
}

// SaveInterestsWithLevels saves user interests with interest levels - simplified version
func SaveInterestsWithLevels(userID uint, interests []struct {
	Name  string
	Level int
}) error {
	// Start a transaction
	tx := database.DB.Begin()
	if tx.Error != nil {
		return tx.Error
	}

	// Use the transaction-aware version
	if err := SaveInterestsWithLevelsTx(tx, userID, interests); err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit().Error
}

// SaveInterestsWithLevelsTx saves user interests with interest levels within a transaction
func SaveInterestsWithLevelsTx(tx *gorm.DB, userID uint, interests []struct {
	Name  string
	Level int
}) error {
	// Delete existing user interests
	if err := tx.Where("user_id = ?", userID).Delete(&models.UserInterest{}).Error; err != nil {
		return err
	}

	// Create new interests
	for _, interestData := range interests {
		userInterest := models.UserInterest{
			UserID: userID,
			Name:   interestData.Name,
			Level:  interestData.Level,
		}
		if err := tx.Create(&userInterest).Error; err != nil {
			return err
		}
	}

	return nil
}
