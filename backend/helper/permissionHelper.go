package helper

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

// Permission constants (bitwise flags)
const (
	PermissionView       = 1 << 0  // 1 - Can view resource
	PermissionEdit       = 1 << 1  // 2 - Can edit resource
	PermissionDelete     = 1 << 2  // 4 - Can delete resource
	PermissionShare      = 1 << 3  // 8 - Can share resource
	PermissionInvite     = 1 << 6  // 64 - Can invite members
	PermissionManageTeam = 1 << 7  // 128 - Can manage team members (change roles, permissions, workspaces)
	AdminPermissions     = 0xFFFF  // All permissions
)

// RoleToPermissions converts a role string to its corresponding permission bitmask
func RoleToPermissions(role string) int {
	switch role {
	case "owner", "admin":
		return AdminPermissions // All permissions
	case "editor":
		return PermissionView | PermissionEdit | PermissionShare // View, Edit, Share
	case "viewer":
		return PermissionView // View only
	default:
		return PermissionView // Default to view permission
	}
}

// ResourceType represents different types of resources that can be permission-checked
type ResourceType string

const (
	ResourceProject     ResourceType = "project"
	ResourceProjectPost ResourceType = "project_post"
	ResourcePost        ResourceType = "post"
	ResourceCourse      ResourceType = "course"
	ResourceResource    ResourceType = "resource"
)

// PermissionChecker interface for checking permissions on different resources
type PermissionChecker interface {
	// CanView checks if user has view permission
	CanView(userID int, resourceID interface{}) (bool, error)

	// CanEdit checks if user has edit permission
	CanEdit(userID int, resourceID interface{}) (bool, error)

	// CanDelete checks if user has delete permission
	CanDelete(userID int, resourceID interface{}) (bool, error)

	// IsOwner checks if user is the owner of the resource
	IsOwner(userID int, resourceID interface{}) (bool, error)

	// IsMember checks if user is a member with access
	IsMember(userID int, resourceID interface{}) (bool, error)
}

// CheckResourcePermission is a generic function to check if a user has permission to access a resource
// Returns:
// - bool: whether the user has permission
// - int: HTTP status code (401 for unauthorized, 403 for forbidden, 200 for success)
// - error: error message if any
func CheckResourcePermission(
	userID int,
	resourceID interface{},
	checker PermissionChecker,
	requireOwnership bool,
) (bool, int, error) {
	// First check if the user is the owner
	isOwner, err := checker.IsOwner(userID, resourceID)
	if err != nil {
		return false, http.StatusInternalServerError, err
	}

	if isOwner {
		return true, http.StatusOK, nil
	}

	// If ownership is required but user is not owner, deny access
	if requireOwnership {
		return false, http.StatusForbidden, errors.New("only the owner can perform this action")
	}

	// Check if the user is a member with view permission
	isMember, err := checker.IsMember(userID, resourceID)
	if err != nil {
		return false, http.StatusInternalServerError, err
	}

	if isMember {
		return true, http.StatusOK, nil
	}

	// User has no access
	return false, http.StatusForbidden, errors.New("you do not have permission to access this resource")
}

// GetUserIDFromContext extracts the user ID from the Gin context
// Returns the user ID and a boolean indicating if it was found
func GetUserIDFromContext(c *gin.Context) (int, bool) {
	userIDInterface, exists := c.Get("userID")
	if !exists {
		return 0, false
	}

	// Handle different types that might be stored
	switch v := userIDInterface.(type) {
	case int:
		return v, true
	case int64:
		return int(v), true
	case float64:
		return int(v), true
	case string:
		// If stored as string, you might need to convert it
		// This depends on how your middleware stores the userID
		return 0, false
	default:
		return 0, false
	}
}

// RequireAuthentication checks if a user is authenticated and returns appropriate errors
// If optional is true, it won't fail if no user is authenticated
func RequireAuthentication(c *gin.Context, optional bool) (int, error) {
	userID, exists := GetUserIDFromContext(c)

	if !exists || userID == 0 {
		if optional {
			return 0, nil
		}
		return 0, errors.New("authentication required")
	}

	return userID, nil
}

// HasPermission checks if a user has a specific permission flag
func HasPermission(userPermissions int, requiredPermission int) bool {
	return (userPermissions & requiredPermission) == requiredPermission
}

// IsPublicResource checks if a resource is publicly accessible
// This should be implemented based on your resource model
func IsPublicResource(resourceType ResourceType, resourceID interface{}) (bool, error) {
	// This is a placeholder - implement based on your database models
	// For example, check if a project/post/course has a "public" or "published" flag
	return false, errors.New("not implemented")
}

// SendPermissionError sends an appropriate error response based on the HTTP status code
func SendPermissionError(c *gin.Context, statusCode int, message string) {
	switch statusCode {
	case http.StatusUnauthorized:
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authentication required. Please log in to access this resource.",
		})
	case http.StatusForbidden:
		c.JSON(http.StatusForbidden, gin.H{
			"error": message,
		})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "An error occurred while checking permissions",
		})
	}
}
