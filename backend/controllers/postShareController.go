package controllers

import (
	"net/http"
	"strconv"
	"time"

	"projectup/repositories"
	"projectup/services"

	"github.com/gin-gonic/gin"
)

// CreatePostShare handles creating a new share link for a project post
func CreatePostShare() gin.HandlerFunc {
	return func(c *gin.Context) {
		postID, err := strconv.ParseUint(c.Param("postId"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid post ID"})
			return
		}

		var request struct {
			ExpiresAt   *time.Time `json:"expires_at"`
			AccessLevel uint       `json:"access_level" binding:"required"`
		}

		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		userID := getUserIDFromContext(c)
		if userID == 0 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		shareRepo := repositories.NewPostShareRepository()
		shareService := services.NewPostShareService(shareRepo)

		share, err := shareService.CreateShare(uint(postID), userID, request.ExpiresAt, request.AccessLevel)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create share link"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"share": share})
	}
}

// GetSharedPost handles retrieving a shared post using a token
func GetSharedPost() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.Param("token")
		if token == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid share token"})
			return
		}

		shareRepo := repositories.NewPostShareRepository()
		shareService := services.NewPostShareService(shareRepo)

		post, err := shareService.GetSharedPost(token)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Share link not found or expired"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"post": post})
	}
}

// DeletePostShare handles deleting a share link
func DeletePostShare() gin.HandlerFunc {
	return func(c *gin.Context) {
		shareID, err := strconv.ParseUint(c.Param("shareId"), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid share ID"})
			return
		}

		userID := getUserIDFromContext(c)
		if userID == 0 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		shareRepo := repositories.NewPostShareRepository()
		shareService := services.NewPostShareService(shareRepo)

		if err := shareService.DeleteShare(uint(shareID), userID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete share link"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Share link deleted successfully"})
	}
}
