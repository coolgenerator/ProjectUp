package services

import (
	"projectup/database"
	"projectup/models"

	"gorm.io/gorm"
)

type AIServicePreferenceService struct {
	db *gorm.DB
}

func NewAIServicePreferenceService(db *gorm.DB) *AIServicePreferenceService {
	return &AIServicePreferenceService{db: db}
}

// GetAllPreferences returns all AI service preferences for a user
func (s *AIServicePreferenceService) GetAllPreferences(userID uint) ([]models.AIServicePreferenceResponse, error) {
	var dbPreferences []models.UserAIServicePreference

	// Get user's saved preferences
	if err := s.db.Where("user_id = ?", userID).Find(&dbPreferences).Error; err != nil {
		return nil, err
	}

	// Create a map for quick lookup
	preferenceMap := make(map[string]models.UserAIServicePreference)
	for _, pref := range dbPreferences {
		preferenceMap[pref.ServiceType] = pref
	}

	// Get defaults
	defaults := models.GetDefaultServicePreferences()

	// Build response for all services
	responses := make([]models.AIServicePreferenceResponse, 0, len(models.AIServices))

	for _, service := range models.AIServices {
		response := models.AIServicePreferenceResponse{
			ServiceType: service.ServiceType,
			Name:        service.Name,
			Description: service.Description,
			Category:    service.Category,
			Icon:        service.Icon,
		}

		// Check if user has saved preference
		if pref, exists := preferenceMap[service.ServiceType]; exists {
			response.Provider = pref.Provider
			response.Model = pref.Model
			response.IsEnabled = pref.IsEnabled
		} else {
			// Use default
			if defaultPref, hasDefault := defaults[service.ServiceType]; hasDefault {
				response.Provider = defaultPref.Provider
				response.Model = defaultPref.Model
			} else {
				// Fallback to openai/gpt-4o if no default
				response.Provider = "openai"
				response.Model = "gpt-4o"
			}
			// Default to enabled if no preference saved
			response.IsEnabled = true
		}

		responses = append(responses, response)
	}

	return responses, nil
}

// GetPreferenceForService returns preference for a specific service
func (s *AIServicePreferenceService) GetPreferenceForService(userID uint, serviceType string) (*models.AIServicePreferenceResponse, error) {
	var pref models.UserAIServicePreference

	// Try to get user's saved preference
	err := s.db.Where("user_id = ? AND service_type = ?", userID, serviceType).First(&pref).Error

	if err == gorm.ErrRecordNotFound {
		// No saved preference, use default
		defaults := models.GetDefaultServicePreferences()
		serviceDef := models.GetServiceDefinition(serviceType)

		if serviceDef == nil {
			return nil, gorm.ErrRecordNotFound
		}

		response := &models.AIServicePreferenceResponse{
			ServiceType: serviceType,
			Name:        serviceDef.Name,
			Description: serviceDef.Description,
			Category:    serviceDef.Category,
			Icon:        serviceDef.Icon,
			IsEnabled:   true, // Default to enabled
		}

		if defaultPref, hasDefault := defaults[serviceType]; hasDefault {
			response.Provider = defaultPref.Provider
			response.Model = defaultPref.Model
		} else {
			response.Provider = "openai"
			response.Model = "gpt-4o"
		}

		return response, nil

	} else if err != nil {
		return nil, err
	}

	// Found saved preference
	serviceDef := models.GetServiceDefinition(serviceType)
	response := &models.AIServicePreferenceResponse{
		ServiceType: pref.ServiceType,
		Provider:    pref.Provider,
		Model:       pref.Model,
		IsEnabled:   pref.IsEnabled,
	}

	if serviceDef != nil {
		response.Name = serviceDef.Name
		response.Description = serviceDef.Description
		response.Category = serviceDef.Category
		response.Icon = serviceDef.Icon
	}

	return response, nil
}

// UpdatePreferences updates multiple AI service preferences at once
func (s *AIServicePreferenceService) UpdatePreferences(userID uint, preferences []models.AIServicePreferenceItem) error {
	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	for _, item := range preferences {
		// Validate service type exists
		if models.GetServiceDefinition(item.ServiceType) == nil {
			tx.Rollback()
			return gorm.ErrRecordNotFound
		}

		// Check if preference already exists
		var existingPref models.UserAIServicePreference
		err := tx.Where("user_id = ? AND service_type = ?", userID, item.ServiceType).
			First(&existingPref).Error

		if err == gorm.ErrRecordNotFound {
			// Create new preference
			newPref := models.UserAIServicePreference{
				UserID:      userID,
				ServiceType: item.ServiceType,
				Provider:    item.Provider,
				Model:       item.Model,
				IsEnabled:   item.IsEnabled, // Use provided value or default true
			}

			if err := tx.Create(&newPref).Error; err != nil {
				tx.Rollback()
				return err
			}

		} else if err != nil {
			tx.Rollback()
			return err

		} else {
			// Update existing preference
			existingPref.Provider = item.Provider
			existingPref.Model = item.Model
			existingPref.IsEnabled = item.IsEnabled

			if err := tx.Save(&existingPref).Error; err != nil {
				tx.Rollback()
				return err
			}
		}
	}

	return tx.Commit().Error
}

// UpdateSinglePreference updates preference for a single service
func (s *AIServicePreferenceService) UpdateSinglePreference(userID uint, serviceType, provider, model string, isEnabled bool) error {
	// Validate service type exists
	if models.GetServiceDefinition(serviceType) == nil {
		return gorm.ErrRecordNotFound
	}

	// Check if preference already exists
	var existingPref models.UserAIServicePreference
	err := s.db.Where("user_id = ? AND service_type = ?", userID, serviceType).
		First(&existingPref).Error

	if err == gorm.ErrRecordNotFound {
		// Create new preference
		newPref := models.UserAIServicePreference{
			UserID:      userID,
			ServiceType: serviceType,
			Provider:    provider,
			Model:       model,
			IsEnabled:   isEnabled,
		}

		return s.db.Create(&newPref).Error

	} else if err != nil {
		return err

	} else {
		// Update existing preference
		existingPref.Provider = provider
		existingPref.Model = model
		existingPref.IsEnabled = isEnabled

		return s.db.Save(&existingPref).Error
	}
}

// DeletePreference deletes a preference (reverts to default)
func (s *AIServicePreferenceService) DeletePreference(userID uint, serviceType string) error {
	return s.db.Where("user_id = ? AND service_type = ?", userID, serviceType).
		Delete(&models.UserAIServicePreference{}).Error
}

// GetAvailableServices returns list of all available AI services
func (s *AIServicePreferenceService) GetAvailableServices() []models.AIServiceDefinition {
	return models.AIServices
}

// GetAvailableProviders returns available providers based on user tier
func (s *AIServicePreferenceService) GetAvailableProviders(userID uint) ([]ProviderInfo, error) {
	return GetAvailableProvidersForUser(userID)
}

// Helper function for AI service to use
func GetUserPreferenceForService(userID uint, serviceType string) (*models.AIServicePreferenceResponse, error) {
	service := NewAIServicePreferenceService(database.DB)
	return service.GetPreferenceForService(userID, serviceType)
}
