package repositories

import (
	"projectup/database"
	"projectup/models"
)

// GetWorkflowSession retrieves the most recent workflow session for a user
func GetWorkflowSession(userID uint) (*models.AIWorkflowSession, error) {
	var session models.AIWorkflowSession
	err := database.DB.Where("user_id = ?", userID).
		Order("updated_at DESC").
		First(&session).Error
	if err != nil {
		return nil, err
	}
	return &session, nil
}

// CreateWorkflowSession creates a new workflow session
func CreateWorkflowSession(userID uint, step string, stateData models.StateData) (*models.AIWorkflowSession, error) {
	session := models.AIWorkflowSession{
		UserID:    userID,
		Step:      step,
		StateData: stateData,
	}
	err := database.DB.Create(&session).Error
	if err != nil {
		return nil, err
	}
	return &session, nil
}

// UpdateWorkflowSession updates an existing workflow session
func UpdateWorkflowSession(userID uint, step string, stateData models.StateData) error {
	// First, try to find the existing session
	var session models.AIWorkflowSession
	err := database.DB.Where("user_id = ?", userID).
		Order("updated_at DESC").
		First(&session).Error

	if err != nil {
		// If no session exists, create a new one
		_, err = CreateWorkflowSession(userID, step, stateData)
		return err
	}

	// Update the existing session
	return database.DB.Model(&session).Updates(map[string]interface{}{
		"step":       step,
		"state_data": stateData,
	}).Error
}

// DeleteWorkflowSession deletes a user's workflow session
func DeleteWorkflowSession(userID uint) error {
	return database.DB.Where("user_id = ?", userID).
		Delete(&models.AIWorkflowSession{}).Error
}
