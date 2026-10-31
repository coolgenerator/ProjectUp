package repositories

import (
	"log"
	"projectup/database"
	"projectup/models"
	"time"
)

func SaveNotification(userID uint, title string, description string, url string) error {
	return SaveTypedNotification(userID, models.NotificationTypeSystem, title, description, url)
}

// SaveTypedNotification saves a notification under a type the inbox groups by.
func SaveTypedNotification(userID uint, notificationType string, title string, description string, url string) error {
	notification := models.Notification{
		Type:        notificationType,
		UserID:      userID,
		Title:       title,
		Description: description,
		URL:         url,
		IsRead:      false,
		CreatedAt:   time.Now(),
	}

	result := database.DB.Create(&notification)
	if result.Error != nil {
		log.Printf("Failed to save notification: %v", result.Error)
		return result.Error
	}
	return nil
}

func MarkNotificationAsRead(notificationID uint, userID uint) error {
	result := database.DB.Model(&models.Notification{}).
		Where("notification_id = ? AND user_id = ?", notificationID, userID).
		Update("is_read", true)

	if result.Error != nil {
		log.Printf("Failed to mark notification as read: %v", result.Error)
		return result.Error
	}
	return nil
}
