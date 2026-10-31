package controllers

import (
	"fmt"
	"net/http"
	"projectup/database"
	"projectup/models"

	"github.com/gin-gonic/gin"
)

// GetNotifications retrieves all notifications for a user
// @Summary Get notifications
// @Description Retrieves a list of notifications for the authenticated user
// @Tags Notifications
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string][]models.Notification "List of notifications"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 500 {object} map[string]string "Failed to fetch notifications"
// @Router /notifications [get]
func GetNotifications(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var notifications []models.Notification
	if err := database.DB.Where("user_id = ?", userID).Order("created_at DESC").Find(&notifications).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch notifications"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"notifications": notifications})
}

// MarkNotificationAsRead marks a notification as read
// @Summary Mark notification as read
// @Description Marks a notification as read by its ID
// @Tags Notifications
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Notification ID"
// @Success 200 {object} map[string]string "Notification marked as read"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 404 {object} map[string]string "Notification not found"
// @Failure 500 {object} map[string]string "Failed to mark notification as read"
// @Router /notifications/{id} [patch]
func MarkNotificationAsRead(c *gin.Context) {
	notificationID := c.Param("id")

	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	fmt.Printf("userID: %v, notificationID: %v", userID, notificationID)

	result := database.DB.Model(&models.Notification{}).
		Where("notification_id = ? AND user_id = ?", notificationID, userID).
		Update("is_read", true)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark notification as read"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found or already marked as read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification marked as read"})
}
