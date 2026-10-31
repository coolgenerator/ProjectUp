package repositories

import (
	"errors"
	"projectup/database"
	"projectup/models"

	"gorm.io/gorm"
)

// GetContacts retrieves all accepted contacts for a given user.
func GetContacts(userID uint) ([]models.Contact, error) {
	var contacts []models.Contact
	err := database.DB.Where("user_id = ? AND status = ?", userID, 1).Find(&contacts).Error
	if err != nil {
		return nil, err
	}
	return contacts, nil
}

// MakeContactRequest creates a new contact request.
func MakeContactRequest(userID, contactID uint) error {
	contactRequest := models.ContactRequest{
		UserID:    userID,
		ContactID: contactID,
		Status:    0, // Pending status
	}
	return database.DB.Create(&contactRequest).Error
}

// SaveContactRequest saves a new contact request in the database.
func SaveContactRequest(request models.ContactRequest) error {
	err := database.DB.Create(&request).Error
	if err != nil {
		return err
	}
	return nil
}

// GetContactRequest checks if a request exists and returns it.
func GetContactRequest(userID, contactID uint) (*models.ContactRequest, error) {
	var request models.ContactRequest
	err := database.DB.Where("user_id = ? AND contact_id = ?", userID, contactID).First(&request).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &request, nil
}

// AcceptContactRequest converts a contact request into a real contact.
func AcceptContactRequest(userID, contactID uint) error {
	// Find the existing contact request
	request, err := GetContactRequest(contactID, userID)
	if err != nil {
		return err
	}
	if request == nil || request.Status != 0 {
		return errors.New("contact request not found or already processed")
	}

	// Mark the request as accepted
	request.Status = 1
	if err := database.DB.Save(&request).Error; err != nil {
		return err
	}

	// Create a bi-directional contact relationship
	contact1 := models.Contact{UserID: userID, ContactID: contactID, Status: 1}
	contact2 := models.Contact{UserID: contactID, ContactID: userID, Status: 1}

	if err := database.DB.Create(&contact1).Error; err != nil {
		return err
	}
	if err := database.DB.Create(&contact2).Error; err != nil {
		return err
	}

	return nil
}

// DeclineContactRequest removes a contact request from the database.
func DeclineContactRequest(userID, contactID uint) error {
	// Find and delete the pending request
	err := database.DB.Where("user_id = ? AND contact_id = ? AND status = 0", contactID, userID).
		Delete(&models.ContactRequest{}).Error
	if err != nil {
		return err
	}

	return nil
}

// DeleteContact removes the contact relationship between two users (both directions).
func DeleteContact(userID, contactID uint) error {
	// Check if the contact relationship exists first
	var count int64
	database.DB.Model(&models.Contact{}).
		Where("(user_id = ? AND contact_id = ?) OR (user_id = ? AND contact_id = ?)",
			userID, contactID, contactID, userID).
		Count(&count)

	if count == 0 {
		return errors.New("contact not found")
	}

	// Delete both directions of the contact relationship
	err := database.DB.Where("(user_id = ? AND contact_id = ?) OR (user_id = ? AND contact_id = ?)",
		userID, contactID, contactID, userID).
		Delete(&models.Contact{}).Error

	if err != nil {
		return err
	}

	return nil
}

// GetContactRequestsWithUsers retrieves all pending contact requests with user details for a given user.
func GetContactRequestsWithUsers(userID uint) ([]map[string]interface{}, error) {
	// Define a result struct to hold the joined data
	type RequestWithUserDetails struct {
		models.ContactRequest
		SenderID  uint    `gorm:"column:sender_id"`
		Username  *string `gorm:"column:username"`
		FirstName *string `gorm:"column:first_name"`
		LastName  *string `gorm:"column:last_name"`
		AvatarURL *string `gorm:"column:avatar_url"`
	}

	var results []RequestWithUserDetails

	// Use GORM's joins and selects
	err := database.DB.Table("contact_requests").
		Select("contact_requests.*, users.id as sender_id, users.username, profiles.first_name, profiles.last_name, profiles.avatar_url").
		Joins("JOIN users ON contact_requests.user_id = users.id").
		Joins("LEFT JOIN profiles ON users.id = profiles.user_id").
		Where("contact_requests.contact_id = ? AND contact_requests.status = ?", userID, 0).
		Find(&results).Error

	if err != nil {
		return nil, err
	}

	// Convert to map[string]interface{} to maintain API compatibility
	var resultMaps []map[string]interface{}
	for _, r := range results {
		m := map[string]interface{}{
			"id":         r.ID,
			"user_id":    r.UserID,
			"contact_id": r.ContactID,
			"status":     r.Status,
			"created_at": r.CreatedAt,
			"sender_id":  r.SenderID,
			"username":   r.Username,
			"first_name": r.FirstName,
			"last_name":  r.LastName,
			"avatar_url": r.AvatarURL,
		}
		resultMaps = append(resultMaps, m)
	}

	return resultMaps, nil
}

// GetSentContactRequests retrieves all pending contact requests sent by a given user.
func GetSentContactRequests(userID uint) ([]models.ContactRequest, error) {
	var requests []models.ContactRequest
	err := database.DB.Where("user_id = ? AND status = 0", userID).Find(&requests).Error
	if err != nil {
		return nil, err
	}
	return requests, nil
}

// GetSentContactRequestsWithUsers retrieves all pending contact requests sent by a given user with recipient details.
func GetSentContactRequestsWithUsers(userID uint) ([]map[string]interface{}, error) {
	// Define a result struct to hold the joined data
	type SentRequestWithUserDetails struct {
		models.ContactRequest
		RecipientID uint    `gorm:"column:recipient_id"`
		Username    *string `gorm:"column:username"`
		FirstName   *string `gorm:"column:first_name"`
		LastName    *string `gorm:"column:last_name"`
		AvatarURL   *string `gorm:"column:avatar_url"`
	}

	var results []SentRequestWithUserDetails

	// Use GORM's joins and selects
	err := database.DB.Table("contact_requests").
		Select("contact_requests.*, users.id as recipient_id, users.username, profiles.first_name, profiles.last_name, profiles.avatar_url").
		Joins("JOIN users ON contact_requests.contact_id = users.id").
		Joins("LEFT JOIN profiles ON users.id = profiles.user_id").
		Where("contact_requests.user_id = ? AND contact_requests.status = ?", userID, 0).
		Find(&results).Error

	if err != nil {
		return nil, err
	}

	// Convert to map[string]interface{} to maintain API compatibility
	var resultMaps []map[string]interface{}
	for _, r := range results {
		m := map[string]interface{}{
			"id":           r.ID,
			"user_id":      r.UserID,
			"contact_id":   r.ContactID,
			"status":       r.Status,
			"created_at":   r.CreatedAt,
			"recipient_id": r.RecipientID,
			"username":     r.Username,
			"first_name":   r.FirstName,
			"last_name":    r.LastName,
			"avatar_url":   r.AvatarURL,
		}
		resultMaps = append(resultMaps, m)
	}

	return resultMaps, nil
}
