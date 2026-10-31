package services

import (
	"fmt"
	"projectup/database"
	"projectup/helper"
	"projectup/models"
	"projectup/repositories"

	"gorm.io/gorm"
)

// ConceptResponse represents a concept response for client consumption
type ConceptResponse struct {
	ID         uint   `json:"id"`
	Name       string `json:"name"`
	CustomName string `json:"custom_name,omitempty"`
	Level      int    `json:"level,omitempty"`      // Proficiency or Interest level
	LevelText  string `json:"level_text,omitempty"` // Text description of the level
}

// UserProfileResponse represents the combined user and profile data
type UserProfileResponse struct {
	ID                    uint              `json:"id"`
	ShortID               string            `json:"sid"`
	Username              *string           `json:"username"`
	Email                 *string           `json:"email"`
	EmailVerified         bool              `json:"email_verified"`
	Verified              bool              `json:"verified"`
	UserType              *string           `json:"user_type"`
	FirstName             *string           `json:"first_name"`
	LastName              *string           `json:"last_name"`
	PreferredName         *string           `json:"preferred_name"`
	DisplayNamePreference *int              `json:"display_name_preference,omitempty"`
	AvatarURL             *string           `json:"avatar_url"`
	Website               *string           `json:"website"`
	SchoolEmail           *string           `json:"school_email"`
	SchoolEmailVerified   bool              `json:"school_email_verified"`
	Field                 *string           `json:"field"`
	Phone                 *string           `json:"phone"`
	School                *string           `json:"school"`
	Biography             *string           `json:"biography"`
	State                 *string           `json:"state"`
	City                  *string           `json:"city"`
	Country               *string           `json:"country"`
	ZipCode               *string           `json:"zip_code"`
	Language              string            `json:"language"`
	ResumeURL             *string           `json:"resume_url"`
	Skills                []ConceptResponse `json:"skills"`
	Interests             []ConceptResponse `json:"interests"`
}

// GetProfileService retrieves a profile using a ShortID
// requestingUserID is the ID of the user making the request (0 if not authenticated)
func GetProfileService(shortID string, requestingUserID uint) (*UserProfileResponse, error) {
	// Check if the shortID is a reserved route name
	reservedRoutes := []string{"my-posts", "my-profile", "edit-profile", "my-projects"}
	for _, route := range reservedRoutes {
		if shortID == route {
			return nil, fmt.Errorf("invalid profile ID: %s is a reserved route name", shortID)
		}
	}

	// First find the profile using ShortID
	profile, err := repositories.FindProfileByShortID(shortID)
	if err != nil {
		return nil, err
	}

	// Ensure profile has a ShortID (in case it was somehow lost)
	if profile.ShortID == "" {
		if err := repositories.GenerateProfileShortID(profile); err != nil {
			return nil, fmt.Errorf("failed to generate profile ShortID: %w", err)
		}
		// Update the profile in the database with the new ShortID
		if err := database.DB.Model(profile).Update("sid", profile.ShortID).Error; err != nil {
			return nil, fmt.Errorf("failed to update profile ShortID: %w", err)
		}
	}

	// Then get the user associated with this profile
	user, err := repositories.GetUserByID(profile.UserID)
	if err != nil {
		return nil, err
	}

	// Check profile visibility settings
	userPreferences, err := repositories.GetUserPreferences(profile.UserID)
	if err != nil {
		// If preferences don't exist, default to public
		userPreferences = &models.UserPreferences{
			ProfileVisibility: models.ProfileVisibilityPublic,
		}
	}

	// Enforce profile visibility rules
	isOwnProfile := requestingUserID == profile.UserID

	if !isOwnProfile {
		switch userPreferences.ProfileVisibility {
		case models.ProfileVisibilityPrivate:
			// Private: only the user themselves can view
			return nil, fmt.Errorf("this profile is private")
		case models.ProfileVisibilityFriendsOnly:
			// Friends only: check if users are connected
			if requestingUserID == 0 {
				return nil, fmt.Errorf("you must be logged in to view this profile")
			}

			areConnected, err := areUsersConnected(requestingUserID, profile.UserID)
			if err != nil {
				return nil, fmt.Errorf("failed to verify connection status")
			}
			if !areConnected {
				return nil, fmt.Errorf("this profile is only visible to friends")
			}
		// ProfileVisibilityPublic (0): accessible to everyone, no check needed
		}
	}

	// Load interests - using simplified model
	userInterests, err := repositories.GetUserInterests(profile.UserID)
	if err != nil {
		return nil, err
	}

	// Convert to ConceptResponse format
	var interests []ConceptResponse
	for _, interest := range userInterests {
		interests = append(interests, ConceptResponse{
			ID:        interest.ID,
			Name:      interest.Name,
			Level:     interest.Level,
			LevelText: GetInterestLevelDescription(interest.Level),
		})
	}

	// Load skills - using simplified model
	userSkills, err := repositories.GetUserSkills(profile.UserID)
	if err != nil {
		return nil, err
	}

	// Convert to ConceptResponse format
	var skills []ConceptResponse
	for _, skill := range userSkills {
		skills = append(skills, ConceptResponse{
			ID:        skill.ID,
			Name:      skill.Name,
			Level:     skill.Level,
			LevelText: GetSkillLevelDescription(skill.Level),
		})
	}

	// Retrieve display name preference
	var displayNamePreference *int
	if userPreferences != nil {
		displayNamePreference = &userPreferences.DisplayNamePreference
	}

	// Create the combined response DTO
	userProfile := &UserProfileResponse{
		ID:                    user.ID,
		ShortID:               profile.ShortID,
		Username:              user.Username,
		Email:                 user.Email,
		EmailVerified:         user.EmailVerified,
		Verified:              user.Verified,
		UserType:              user.UserType,
		FirstName:             profile.FirstName,
		LastName:              profile.LastName,
		PreferredName:         profile.PreferredName,
		DisplayNamePreference: displayNamePreference,
		AvatarURL:             profile.AvatarURL,
		Website:               profile.Website,
		SchoolEmail:           profile.SchoolEmail,
		SchoolEmailVerified:   profile.SchoolEmailVerified,
		Field:                 profile.Field,
		Phone:                 profile.Phone,
		School:                profile.School,
		Biography:             profile.Biography,
		State:                 profile.State,
		City:                  profile.City,
		Country:               profile.Country,
		ZipCode:               profile.ZipCode,
		Language:              profile.Language,
		ResumeURL:             profile.ResumeURL,
		Skills:                skills,
		Interests:             interests,
	}

	return userProfile, nil
}

// areUsersConnected checks if two users are connected (friends)
func areUsersConnected(userID1, userID2 uint) (bool, error) {
	var contact models.Contact
	err := database.DB.Where("user_id = ? AND contact_id = ? AND status = ?", userID1, userID2, 1).First(&contact).Error
	if err != nil {
		if err.Error() == "record not found" {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func MyProfileService(token string) (*UserProfileResponse, error) {
	claims, err := helper.ValidateToken(token)
	if err != nil {
		return nil, err
	}

	// First, get the user by ID from claims
	user, err := repositories.GetUserByID(claims.ID)
	if err != nil {
		return nil, err
	}

	// Then, get the profile by user ID
	var profile models.Profile
	if err := repositories.FindProfileByUserID(user.ID, &profile); err != nil {
		return nil, err
	}

	// Now that we have the profile, we can get its ShortID
	// Pass the user's own ID as the requesting user (they can always view their own profile)
	return GetProfileService(profile.ShortID, claims.ID)
}

type UserUpdateInput struct {
	UserID          uint
	Skills          []string // Deprecated: use SkillsData instead
	Interests       []string // Deprecated: use InterestsData instead
	SkillsData      []models.SkillData
	InterestsData   []models.InterestData
	UpdateSkills    bool // Flag to indicate if skills should be updated
	UpdateInterests bool // Flag to indicate if interests should be updated
	User            *models.User
	Profile         *models.Profile
}

func UpdateProfileService(input UserUpdateInput) error {
	// Use a database transaction to ensure atomicity
	// If any operation fails, all changes are rolled back
	return database.DB.Transaction(func(tx *gorm.DB) error {
		// Update user details
		if input.User != nil {
			if err := repositories.UpdateUserTx(tx, input.UserID, input.User); err != nil {
				return fmt.Errorf("failed to update user details: %w", err)
			}
		}

		// Update profile details
		if input.Profile != nil {
			input.Profile.UserID = input.UserID
			if err := repositories.UpdateProfileTx(tx, input.UserID, input.Profile); err != nil {
				return fmt.Errorf("failed to update profile details: %w", err)
			}
		}

		// Update skills with levels if the update flag is set
		if input.UpdateSkills {
			// Convert models.SkillData to anonymous struct format
			skills := make([]struct {
				Name  string
				Level int
			}, len(input.SkillsData))
			for i, skill := range input.SkillsData {
				skills[i] = struct {
					Name  string
					Level int
				}{Name: skill.Name, Level: skill.Level}
			}
			if err := repositories.SaveSkillsWithLevelsTx(tx, input.UserID, skills); err != nil {
				return fmt.Errorf("failed to save skills: %w", err)
			}
		} else if len(input.SkillsData) > 0 {
			// Legacy behavior: if skills data provided without flag, still save
			skills := make([]struct {
				Name  string
				Level int
			}, len(input.SkillsData))
			for i, skill := range input.SkillsData {
				skills[i] = struct {
					Name  string
					Level int
				}{Name: skill.Name, Level: skill.Level}
			}
			if err := repositories.SaveSkillsWithLevelsTx(tx, input.UserID, skills); err != nil {
				return fmt.Errorf("failed to save skills: %w", err)
			}
		} else if input.Skills != nil {
			// Backward compatibility: convert old format to new format
			skills := make([]struct {
				Name  string
				Level int
			}, len(input.Skills))
			for i, skill := range input.Skills {
				skills[i] = struct {
					Name  string
					Level int
				}{Name: skill, Level: 3}
			}
			if err := repositories.SaveSkillsWithLevelsTx(tx, input.UserID, skills); err != nil {
				return fmt.Errorf("failed to save skills: %w", err)
			}
		}

		// Update interests with levels if the update flag is set
		if input.UpdateInterests {
			// Convert models.InterestData to anonymous struct format
			interests := make([]struct {
				Name  string
				Level int
			}, len(input.InterestsData))
			for i, interest := range input.InterestsData {
				interests[i] = struct {
					Name  string
					Level int
				}{Name: interest.Name, Level: interest.Level}
			}
			if err := repositories.SaveInterestsWithLevelsTx(tx, input.UserID, interests); err != nil {
				return fmt.Errorf("failed to save interests: %w", err)
			}
		} else if len(input.InterestsData) > 0 {
			// Legacy behavior: if interests data provided without flag, still save
			interests := make([]struct {
				Name  string
				Level int
			}, len(input.InterestsData))
			for i, interest := range input.InterestsData {
				interests[i] = struct {
					Name  string
					Level int
				}{Name: interest.Name, Level: interest.Level}
			}
			if err := repositories.SaveInterestsWithLevelsTx(tx, input.UserID, interests); err != nil {
				return fmt.Errorf("failed to save interests: %w", err)
			}
		} else if input.Interests != nil {
			// Backward compatibility: convert old format to new format
			interests := make([]struct {
				Name  string
				Level int
			}, len(input.Interests))
			for i, interest := range input.Interests {
				interests[i] = struct {
					Name  string
					Level int
				}{Name: interest, Level: 3}
			}
			if err := repositories.SaveInterestsWithLevelsTx(tx, input.UserID, interests); err != nil {
				return fmt.Errorf("failed to save interests: %w", err)
			}
		}

		// If we reach here, all operations succeeded
		return nil
	})
}

// GetUserProfile fetches a user's profile and related data
func GetUserProfile(userID uint) (*UserProfileResponse, error) {
	// Retrieve user info
	user, err := repositories.GetUserByID(userID)
	if err != nil {
		return nil, err
	}

	// Retrieve profile
	var profile models.Profile
	if err := repositories.GetProfileByUserID(userID, &profile); err != nil {
		return nil, err
	}

	// Ensure profile has a ShortID - generate one if missing
	if profile.ShortID == "" {
		if err := repositories.GenerateProfileShortID(&profile); err != nil {
			return nil, fmt.Errorf("failed to generate profile ShortID: %w", err)
		}
		// Update the profile in the database with the new ShortID
		if err := database.DB.Model(&profile).Update("sid", profile.ShortID).Error; err != nil {
			return nil, fmt.Errorf("failed to update profile ShortID: %w", err)
		}
	}

	// Retrieve skills using simplified model
	userSkills, err := repositories.GetUserSkills(userID)
	if err != nil {
		return nil, err
	}

	// Convert skills to ConceptResponse
	var skillResponses []ConceptResponse
	for _, skill := range userSkills {
		skillResponses = append(skillResponses, ConceptResponse{
			ID:        skill.ID,
			Name:      skill.Name,
			Level:     skill.Level,
			LevelText: GetSkillLevelDescription(skill.Level),
		})
	}

	// Retrieve interests using simplified model
	userInterests, err := repositories.GetUserInterests(userID)
	if err != nil {
		return nil, err
	}

	// Convert interests to ConceptResponse
	var interestResponses []ConceptResponse
	for _, interest := range userInterests {
		interestResponses = append(interestResponses, ConceptResponse{
			ID:        interest.ID,
			Name:      interest.Name,
			Level:     interest.Level,
			LevelText: GetInterestLevelDescription(interest.Level),
		})
	}

	// Retrieve user preferences (including display_name_preference)
	var userPreferences models.UserPreferences
	var displayNamePreference *int
	if err := database.DB.Where("user_id = ?", userID).First(&userPreferences).Error; err == nil {
		displayNamePreference = &userPreferences.DisplayNamePreference
	}

	// Create the combined response
	return &UserProfileResponse{
		ID:                    user.ID,
		ShortID:               profile.ShortID,
		Username:              user.Username,
		Email:                 user.Email,
		EmailVerified:         user.EmailVerified,
		Verified:              user.Verified,
		UserType:              user.UserType,
		FirstName:             profile.FirstName,
		LastName:              profile.LastName,
		PreferredName:         profile.PreferredName,
		DisplayNamePreference: displayNamePreference,
		AvatarURL:             profile.AvatarURL,
		Website:               profile.Website,
		SchoolEmail:           profile.SchoolEmail,
		SchoolEmailVerified:   profile.SchoolEmailVerified,
		Field:                 profile.Field,
		Phone:                 profile.Phone,
		School:                profile.School,
		Biography:             profile.Biography,
		State:                 profile.State,
		City:                  profile.City,
		Country:               profile.Country,
		ZipCode:               profile.ZipCode,
		Language:              profile.Language,
		ResumeURL:             profile.ResumeURL,
		Skills:                skillResponses,
		Interests:             interestResponses,
	}, nil
}

func UpdateUserSkills(userID uint, skills []string) error {
	return repositories.UpdateUserSkills(userID, skills)
}

func UpdateUserInterests(userID uint, interests []string) error {
	return repositories.UpdateUserInterests(userID, interests)
}

// GetSkillLevelDescription returns a text description for a skill proficiency level
func GetSkillLevelDescription(level int) string {
	switch level {
	case 1:
		return "Beginner"
	case 2:
		return "Basic"
	case 3:
		return "Intermediate"
	case 4:
		return "Advanced"
	case 5:
		return "Expert"
	default:
		return "Intermediate"
	}
}

// GetInterestLevelDescription returns a text description for an interest level
func GetInterestLevelDescription(level int) string {
	switch level {
	case 1:
		return "Curious"
	case 2:
		return "Interested"
	case 3:
		return "Engaged"
	case 4:
		return "Passionate"
	case 5:
		return "Obsessed"
	default:
		return "Interested"
	}
}

// DUPLICATE FUNCTIONS REMOVED - Now using preferencesService.go
// Use these instead:
// - GetAllPreferences
// - UpdateAllPreferences
