package controllers

import (
	"projectup/database"

	"github.com/gin-gonic/gin"
)

// getUserIDFromContext retrieves the authenticated user's ID from the Gin context
func getUserIDFromContext(c *gin.Context) uint {
	userID, exists := c.Get("userID")
	if !exists {
		return 0
	}

	id, ok := userID.(uint)
	if !ok {
		return 0
	}

	return id
}

// resolveSIDToProjectID converts a project SID to its numeric ID
func resolveSIDToProjectID(sid string) (uint, error) {
	var projectID uint
	err := database.DB.Table("projects").
		Select("project_id").
		Where("sid = ?", sid).
		Scan(&projectID).Error
	if err != nil {
		return 0, err
	}
	return projectID, nil
}
