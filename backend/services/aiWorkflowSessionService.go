package services

import (
	"projectup/models"
	"projectup/repositories"
)

// GetWorkflowSessionService retrieves the user's workflow session
func GetWorkflowSessionService(userID uint) (*models.AIWorkflowSession, error) {
	return repositories.GetWorkflowSession(userID)
}

// SaveWorkflowSessionService saves or updates the user's workflow session
func SaveWorkflowSessionService(userID uint, step string, stateData models.StateData) error {
	return repositories.UpdateWorkflowSession(userID, step, stateData)
}

// ClearWorkflowSessionService deletes the user's workflow session
func ClearWorkflowSessionService(userID uint) error {
	return repositories.DeleteWorkflowSession(userID)
}
