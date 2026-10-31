package services

import (
	"projectup/database"
	"projectup/models"
)

// HandleNotification stores and pushes notifications
func HandleNotification(notification models.Notification) {
	// Save notification in DB
	database.DB.Create(&notification)

	// Send notification if the user is online
	NotifyUser(notification.UserID, notification)
}
