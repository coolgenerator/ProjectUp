package services

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"projectup/database"
	"projectup/helper"
	"projectup/models"

	"gorm.io/gorm"
)

type ShareLinkService struct {
	DB *gorm.DB
}

func NewShareLinkService() *ShareLinkService {
	return &ShareLinkService{DB: database.DB}
}

// GenerateShareToken creates a cryptographically secure random token
func (s *ShareLinkService) GenerateShareToken() (string, error) {
	bytes := make([]byte, 32) // 32 bytes = 64 hex characters
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// CreateShareLink creates a new share link for a project or workspace
func (s *ShareLinkService) CreateShareLink(projectID, createdBy uint, workspaceID *uint, accessLevel string, expiryDays int) (*models.ShareLink, error) {
	// Validate access level
	if accessLevel != "view" && accessLevel != "edit" {
		return nil, errors.New("access_level must be 'view' or 'edit'")
	}

	// Verify user has permission to create share link (must be project admin or workspace admin)
	canCreate, err := s.canUserCreateShareLink(createdBy, projectID, workspaceID)
	if err != nil {
		return nil, err
	}
	if !canCreate {
		return nil, errors.New("user does not have permission to create share links")
	}

	// Generate unique token
	token, err := s.GenerateShareToken()
	if err != nil {
		return nil, fmt.Errorf("failed to generate share token: %w", err)
	}

	// Calculate expiry date
	var expiresAt *time.Time
	if expiryDays > 0 {
		expiry := time.Now().AddDate(0, 0, expiryDays)
		expiresAt = &expiry
	}

	shareLink := &models.ShareLink{
		ProjectID:   projectID,
		WorkspaceID: workspaceID,
		ShareToken:  token,
		AccessLevel: accessLevel,
		CreatedBy:   createdBy,
		ExpiresAt:   expiresAt,
		IsActive:    true,
		UsageCount:  0,
	}

	if err := s.DB.Create(shareLink).Error; err != nil {
		return nil, fmt.Errorf("failed to create share link: %w", err)
	}

	// Preload relationships
	if err := s.DB.Preload("Creator").Preload("Workspace").First(shareLink, shareLink.ShareID).Error; err != nil {
		return nil, err
	}

	return shareLink, nil
}

// canUserCreateShareLink checks if user has permission to create share links
func (s *ShareLinkService) canUserCreateShareLink(userID, projectID uint, workspaceID *uint) (bool, error) {
	// Check if user is project owner
	var project models.Project
	if err := s.DB.First(&project, projectID).Error; err != nil {
		return false, err
	}

	if project.OwnerID == userID {
		return true, nil
	}

	// If workspace-specific, check if user is workspace admin
	if workspaceID != nil {
		var membership models.ProjectGroupMember
		err := s.DB.Where("user_id = ? AND group_id = ? AND role = ?", userID, *workspaceID, "admin").
			First(&membership).Error
		if err == nil {
			return true, nil
		}
	}

	// Check if user is Main workspace admin (can create links for any workspace)
	workspaceService := NewWorkspaceService()
	isInMain, mainWorkspace, err := workspaceService.IsUserInMainWorkspace(userID, projectID)
	if err != nil {
		return false, err
	}

	if isInMain {
		// Check if admin role in main workspace
		var membership models.ProjectGroupMember
		err := s.DB.Where("user_id = ? AND group_id = ? AND role = ?", userID, mainWorkspace.GroupID, "admin").
			First(&membership).Error
		return err == nil, nil
	}

	return false, nil
}

// GetProjectShareLinks retrieves all share links for a project
func (s *ShareLinkService) GetProjectShareLinks(projectID, userID uint) ([]*models.ShareLink, error) {
	// Verify user has access to project
	workspaceService := NewWorkspaceService()
	accessibleWorkspaces, err := workspaceService.GetUserAccessibleWorkspaces(userID, projectID)
	if err != nil {
		return nil, err
	}

	if len(accessibleWorkspaces) == 0 {
		return nil, errors.New("user does not have access to this project")
	}

	var shareLinks []*models.ShareLink
	query := s.DB.Where("project_id = ?", projectID)

	// If user is not in Main workspace, only show links for their workspaces
	isInMain, _, _ := workspaceService.IsUserInMainWorkspace(userID, projectID)
	if !isInMain {
		workspaceIDs := make([]uint, len(accessibleWorkspaces))
		for i, ws := range accessibleWorkspaces {
			workspaceIDs[i] = ws.GroupID
		}
		query = query.Where("workspace_id IN ? OR workspace_id IS NULL", workspaceIDs)
	}

	if err := query.
		Preload("Creator").
		Preload("Workspace").
		Order("created_at DESC").
		Find(&shareLinks).Error; err != nil {
		return nil, err
	}

	return shareLinks, nil
}

// GetShareLinkByToken retrieves a share link by its token
func (s *ShareLinkService) GetShareLinkByToken(token string) (*models.ShareLink, error) {
	var shareLink models.ShareLink
	if err := s.DB.Where("share_token = ?", token).
		Preload("Project").
		Preload("Workspace").
		Preload("Creator").
		First(&shareLink).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("share link not found")
		}
		return nil, err
	}

	return &shareLink, nil
}

// ValidateAndUseShareLink validates a share link and records usage
func (s *ShareLinkService) ValidateAndUseShareLink(token string, userID *uint, ipAddress, userAgent string) (*models.ShareLink, error) {
	shareLink, err := s.GetShareLinkByToken(token)
	if err != nil {
		return nil, err
	}

	// Check if valid
	if !shareLink.IsValid() {
		if shareLink.IsExpired() {
			return nil, errors.New("share link has expired")
		}
		return nil, errors.New("share link is not active")
	}

	// Record usage
	usage := &models.ShareLinkUsage{
		ShareID:     shareLink.ShareID,
		UserID:      userID,
		IPAddress:   ipAddress,
		UserAgent:   userAgent,
		ActionTaken: "viewed",
	}

	if err := s.DB.Create(usage).Error; err != nil {
		// Don't fail the request if usage tracking fails
		fmt.Printf("Warning: Failed to record share link usage: %v\n", err)
	}

	// Increment usage count
	if err := s.DB.Model(shareLink).UpdateColumn("usage_count", gorm.Expr("usage_count + 1")).Error; err != nil {
		fmt.Printf("Warning: Failed to increment usage count: %v\n", err)
	}

	return shareLink, nil
}

// DeactivateShareLink deactivates a share link
func (s *ShareLinkService) DeactivateShareLink(shareID, userID uint) error {
	var shareLink models.ShareLink
	if err := s.DB.First(&shareLink, shareID).Error; err != nil {
		return err
	}

	// Check permission
	canDelete, err := s.canUserCreateShareLink(userID, shareLink.ProjectID, shareLink.WorkspaceID)
	if err != nil {
		return err
	}
	if !canDelete {
		return errors.New("user does not have permission to deactivate this share link")
	}

	return s.DB.Model(&shareLink).Update("is_active", false).Error
}

// DeleteShareLink permanently deletes a share link
func (s *ShareLinkService) DeleteShareLink(shareID, userID uint) error {
	var shareLink models.ShareLink
	if err := s.DB.First(&shareLink, shareID).Error; err != nil {
		return err
	}

	// Check permission
	canDelete, err := s.canUserCreateShareLink(userID, shareLink.ProjectID, shareLink.WorkspaceID)
	if err != nil {
		return err
	}
	if !canDelete {
		return errors.New("user does not have permission to delete this share link")
	}

	return s.DB.Delete(&shareLink).Error
}

// GetShareLinkUsage retrieves usage statistics for a share link
func (s *ShareLinkService) GetShareLinkUsage(shareID, userID uint) ([]*models.ShareLinkUsage, error) {
	// Get share link to verify permission
	var shareLink models.ShareLink
	if err := s.DB.First(&shareLink, shareID).Error; err != nil {
		return nil, err
	}

	// Check permission
	canView, err := s.canUserCreateShareLink(userID, shareLink.ProjectID, shareLink.WorkspaceID)
	if err != nil {
		return nil, err
	}
	if !canView {
		return nil, errors.New("user does not have permission to view usage statistics")
	}

	var usage []*models.ShareLinkUsage
	if err := s.DB.Where("share_id = ?", shareID).
		Preload("User").
		Order("accessed_at DESC").
		Find(&usage).Error; err != nil {
		return nil, err
	}

	return usage, nil
}

// CleanupExpiredLinks deactivates expired share links
func (s *ShareLinkService) CleanupExpiredLinks() error {
	return s.DB.Model(&models.ShareLink{}).
		Where("expires_at < ? AND is_active = ?", time.Now(), true).
		Update("is_active", false).Error
}

// AcceptShareLink adds a user to a project/workspace via share link
func (s *ShareLinkService) AcceptShareLink(token string, userID uint, ipAddress, userAgent string) (*models.ShareLink, error) {
	// Validate the share link
	shareLink, err := s.ValidateAndUseShareLink(token, &userID, ipAddress, userAgent)
	if err != nil {
		return nil, err
	}

	// First, check if user is already a project member
	var existingProjectMember models.ProjectMember
	err = s.DB.Where("user_id = ? AND project_id = ?", userID, shareLink.ProjectID).First(&existingProjectMember).Error
	isAlreadyProjectMember := err == nil

	// Determine role based on access level
	var role string
	if shareLink.AccessLevel == "edit" {
		role = "editor" // Edit access → Editor role
	} else {
		role = "viewer" // View access → Viewer role (read-only)
	}

	// Add user to project_members table if not already a member
	if !isAlreadyProjectMember {
		projectMember := &models.ProjectMember{
			ProjectID:   shareLink.ProjectID,
			UserID:      userID,
			Role:        role,
			Permissions: helper.RoleToPermissions(role), // Set permissions based on role
		}
		if err := s.DB.Create(projectMember).Error; err != nil {
			return nil, fmt.Errorf("failed to add user to project members: %w", err)
		}
	}

	// Check if user is already a member of the workspace
	if shareLink.WorkspaceID != nil {
		// Workspace-specific link
		var existing models.ProjectGroupMember
		err := s.DB.Where("user_id = ? AND group_id = ? AND project_id = ?",
			userID, *shareLink.WorkspaceID, shareLink.ProjectID).First(&existing).Error
		if err == nil {
			return shareLink, nil // Already a workspace member
		}

		// Add user to workspace
		member := &models.ProjectGroupMember{
			ProjectID: shareLink.ProjectID,
			UserID:    userID,
			GroupID:   *shareLink.WorkspaceID,
			Role:      "member", // Share links always add as member
		}
		if err := s.DB.Create(member).Error; err != nil {
			return nil, fmt.Errorf("failed to add user to workspace: %w", err)
		}
	} else {
		// Project-wide link - add to Main workspace
		workspaceService := NewWorkspaceService()
		mainWorkspace, err := workspaceService.GetMainWorkspace(shareLink.ProjectID)
		if err != nil {
			return nil, fmt.Errorf("failed to get main workspace: %w", err)
		}

		// Check if user is already a member of Main workspace
		var existing models.ProjectGroupMember
		err = s.DB.Where("user_id = ? AND group_id = ? AND project_id = ?",
			userID, mainWorkspace.GroupID, shareLink.ProjectID).First(&existing).Error
		if err == nil {
			return shareLink, nil // Already a workspace member
		}

		// Add user to Main workspace
		member := &models.ProjectGroupMember{
			ProjectID: shareLink.ProjectID,
			UserID:    userID,
			GroupID:   mainWorkspace.GroupID,
			Role:      "member", // Share links always add as member
		}
		if err := s.DB.Create(member).Error; err != nil {
			return nil, fmt.Errorf("failed to add user to main workspace: %w", err)
		}
	}

	// Record the join action
	usage := &models.ShareLinkUsage{
		ShareID:     shareLink.ShareID,
		UserID:      &userID,
		IPAddress:   ipAddress,
		UserAgent:   userAgent,
		ActionTaken: "joined",
	}
	if err := s.DB.Create(usage).Error; err != nil {
		fmt.Printf("Warning: Failed to record share link join: %v\n", err)
	}

	return shareLink, nil
}
