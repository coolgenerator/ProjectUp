package services

import (
	"fmt"
	"projectup/models"
	"projectup/repositories"
)

// HandleContactRequest saves a contact request and notifies the receiver
func HandleContactRequest(request models.ContactRequest) {
	repositories.SaveContactRequest(request)
	NotifyUser(request.ContactID, request)
}

// AcceptContactRequest handles the acceptance of a contact request
func AcceptContactRequest(contactRequestID uint, userID uint) error {
	err := repositories.AcceptContactRequest(contactRequestID, userID)
	if err != nil {
		fmt.Printf("Error accepting contact request: %v\n", err)
		return err
	}
	return nil
}
