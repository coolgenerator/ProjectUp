package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"projectup/helper"
)

// CheckResourceAccess creates a middleware for checking access to shared resources
// It checks if the user is authenticated, and if not, returns 401 (Unauthorized)
// This allows the frontend to redirect to login with the current path
func CheckResourceAccess(resourceType helper.ResourceType, optional bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Try to get user ID from context (set by Authenticate middleware)
		userID, err := helper.RequireAuthentication(c, optional)

		if err != nil {
			// User is not authenticated - return 401 to trigger frontend redirect
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "Authentication required",
				"message": "Please log in to access this resource",
			})
			c.Abort()
			return
		}

		// If authentication is optional and no user is present, continue
		if optional && userID == 0 {
			c.Next()
			return
		}

		// Store the resource type in context for later use
		c.Set("resourceType", resourceType)
		c.Next()
	}
}

// RequireOwnership creates a middleware that ensures the user is the owner of a resource
// This should be used after CheckResourceAccess and requires the resourceID to be in the URL
func RequireOwnership(getResourceOwnerID func(*gin.Context) (int, error)) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := helper.GetUserIDFromContext(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Authentication required",
			})
			c.Abort()
			return
		}

		// Get the owner ID of the resource
		ownerID, err := getResourceOwnerID(c)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to check resource ownership",
			})
			c.Abort()
			return
		}

		// Check if the user is the owner
		if userID != ownerID {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Only the owner can perform this action",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequirePermission creates a middleware that checks if the user has specific permissions
// This is useful for resources with granular permission controls
func RequirePermission(
	requiredPermission int,
	getUserPermissions func(*gin.Context, int) (int, error),
) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := helper.GetUserIDFromContext(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Authentication required",
			})
			c.Abort()
			return
		}

		// Get user's permissions for this resource
		userPermissions, err := getUserPermissions(c, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to check permissions",
			})
			c.Abort()
			return
		}

		// Check if user has the required permission
		if !helper.HasPermission(userPermissions, requiredPermission) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "You do not have permission to perform this action",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
