package services

import (
	"errors"
	"fmt"

	"projectup/database"
	"projectup/helper"
	"projectup/models"
)

// CheckProjectAccess verifies if a user has access to a project
// Returns the member record and any error encountered
func CheckProjectAccess(projectID uint, userID uint, requiredPermission int) (*models.ProjectMember, error) {
	// Check if user is a member of the project
	var member models.ProjectMember
	err := database.DB.Where("project_id = ? AND user_id = ?", projectID, userID).First(&member).Error

	if err != nil {
		// User is not a member of the project
		return nil, errors.New("you don't have permission to access this project")
	}

	// Map role to permissions using role-based access control
	hasPermission := false
	switch member.Role {
	case "owner", "admin":
		// Owner and admin have all permissions
		hasPermission = true
	case "editor":
		// Editor can view and edit, but not delete or manage team
		hasPermission = requiredPermission == helper.PermissionView ||
			requiredPermission == helper.PermissionEdit ||
			requiredPermission == helper.PermissionShare
	case "viewer":
		// Viewer can only view
		hasPermission = requiredPermission == helper.PermissionView
	default:
		hasPermission = false
	}

	if !hasPermission {
		permissionName := getPermissionName(requiredPermission)
		return nil, fmt.Errorf("you don't have permission to %s this project", permissionName)
	}

	return &member, nil
}

// CheckProjectOwnership verifies if a user is the owner of a project
func CheckProjectOwnership(projectID uint, userID uint) error {
	var project models.Project
	err := database.DB.Where("project_id = ?", projectID).First(&project).Error

	if err != nil {
		return errors.New("project not found")
	}

	if project.GetUserID() != userID {
		return errors.New("only the project owner can perform this action")
	}

	return nil
}

// CheckProjectAccessOrOwnership checks if user is either the owner or has required permission
// Returns true if user is owner, member record if user is member with permission, or error
func CheckProjectAccessOrOwnership(projectID uint, userID uint, requiredPermission int) (bool, *models.ProjectMember, error) {
	// First check if user is the project owner
	var project models.Project
	err := database.DB.Where("project_id = ?", projectID).First(&project).Error

	if err != nil {
		return false, nil, errors.New("project not found")
	}

	// If user is the owner, grant full access
	if project.GetUserID() == userID {
		return true, nil, nil
	}

	// Otherwise, check if user is a member with required permission
	member, err := CheckProjectAccess(projectID, userID, requiredPermission)
	if err != nil {
		return false, nil, err
	}

	return false, member, nil
}

// GetUserProjectPermissions returns the user's permission bitmask for a project
// Returns 0 if user has no access
func GetUserProjectPermissions(projectID uint, userID uint) int {
	// Check if user is the owner first
	var project models.Project
	err := database.DB.Where("project_id = ?", projectID).First(&project).Error

	if err == nil && project.GetUserID() == userID {
		return helper.AdminPermissions // Owner has all permissions
	}

	// Check if user is a member
	var member models.ProjectMember
	err = database.DB.Where("project_id = ? AND user_id = ?", projectID, userID).First(&member).Error

	if err != nil {
		return 0 // No access
	}

	// Map role to permission bitmask
	switch member.Role {
	case "owner", "admin":
		return helper.AdminPermissions
	case "editor":
		return helper.PermissionView | helper.PermissionEdit | helper.PermissionShare
	case "viewer":
		return helper.PermissionView
	default:
		return 0
	}
}

// CheckAdminRole verifies if a user has admin role in a project
// Returns error if user is not a member or not an admin
func CheckAdminRole(projectID uint, userID uint) error {
	// First check if user is the project owner (owners have admin rights)
	var project models.Project
	err := database.DB.Where("project_id = ?", projectID).First(&project).Error

	if err != nil {
		return errors.New("project not found")
	}

	// If user is the owner, they have admin rights
	if project.GetUserID() == userID {
		return nil
	}

	// Check if user is a member with admin role
	var member models.ProjectMember
	err = database.DB.Where("project_id = ? AND user_id = ?", projectID, userID).First(&member).Error

	if err != nil {
		return errors.New("you are not a member of this project")
	}

	// Check if member has admin role
	if member.Role != "admin" {
		return errors.New("only admins can perform this action")
	}

	return nil
}

// Helper function to get human-readable permission name
func getPermissionName(permission int) string {
	switch permission {
	case helper.PermissionView:
		return "view"
	case helper.PermissionEdit:
		return "edit"
	case helper.PermissionDelete:
		return "delete"
	case helper.PermissionShare:
		return "share"
	case helper.PermissionInvite:
		return "invite to"
	default:
		return "access"
	}
}
