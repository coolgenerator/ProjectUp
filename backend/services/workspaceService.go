package services

import (
	"errors"
	"fmt"
	"projectup/database"
	"projectup/models"

	"gorm.io/gorm"
)

// WorkspaceService handles workspace hierarchy operations
type WorkspaceService struct {
	db *gorm.DB
}

// NewWorkspaceService creates a new workspace service instance
func NewWorkspaceService() *WorkspaceService {
	return &WorkspaceService{
		db: database.DB,
	}
}

// GetUserWorkspaces returns all workspaces user is a direct member of
func (s *WorkspaceService) GetUserWorkspaces(userID, projectID uint) ([]*models.ProjectGroup, error) {
	var workspaces []*models.ProjectGroup

	err := s.db.Joins("JOIN project_group_members ON project_groups.group_id = project_group_members.group_id").
		Where("project_group_members.user_id = ? AND project_groups.project_id = ?", userID, projectID).
		Preload("Parent").
		Preload("Children").
		Find(&workspaces).Error

	return workspaces, err
}

// GetUserAccessibleWorkspaces returns all workspaces user can access (direct + children if in main)
func (s *WorkspaceService) GetUserAccessibleWorkspaces(userID, projectID uint) ([]*models.ProjectGroup, error) {
	// Get workspaces user is directly a member of
	directWorkspaces, err := s.GetUserWorkspaces(userID, projectID)
	if err != nil {
		return nil, err
	}

	// Check if user is in main workspace
	inMain, mainWorkspace, err := s.IsUserInMainWorkspace(userID, projectID)
	if err != nil {
		return nil, err
	}

	if inMain && mainWorkspace != nil {
		// Add all child workspaces
		var children []*models.ProjectGroup
		err := s.db.Where("project_id = ? AND parent_id = ?", projectID, mainWorkspace.GroupID).
			Preload("Parent").
			Find(&children).Error
		if err != nil {
			return nil, err
		}

		// Combine direct workspaces with children (avoid duplicates)
		workspaceMap := make(map[uint]*models.ProjectGroup)
		for _, ws := range directWorkspaces {
			workspaceMap[ws.GroupID] = ws
		}
		for _, ws := range children {
			if _, exists := workspaceMap[ws.GroupID]; !exists {
				workspaceMap[ws.GroupID] = ws
			}
		}

		// Convert map back to slice
		result := make([]*models.ProjectGroup, 0, len(workspaceMap))
		for _, ws := range workspaceMap {
			result = append(result, ws)
		}
		return result, nil
	}

	return directWorkspaces, nil
}

// IsUserInMainWorkspace checks if user is a member of the main workspace
func (s *WorkspaceService) IsUserInMainWorkspace(userID, projectID uint) (bool, *models.ProjectGroup, error) {
	var mainWorkspace models.ProjectGroup

	// Find main workspace for this project
	err := s.db.Where("project_id = ? AND is_main = ?", projectID, true).
		First(&mainWorkspace).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil, nil
		}
		return false, nil, err
	}

	// Check if user is a member of main workspace
	var count int64
	err = s.db.Model(&models.ProjectGroupMember{}).
		Where("user_id = ? AND group_id = ?", userID, mainWorkspace.GroupID).
		Count(&count).Error

	if err != nil {
		return false, nil, err
	}

	return count > 0, &mainWorkspace, nil
}

// GetVisibleWorkspaceIDs returns workspace IDs user can see content from
func (s *WorkspaceService) GetVisibleWorkspaceIDs(userID, projectID uint) ([]uint, error) {
	// Check if user is in main workspace
	inMain, mainWorkspace, err := s.IsUserInMainWorkspace(userID, projectID)
	if err != nil {
		return nil, err
	}

	var workspaceIDs []uint

	if inMain && mainWorkspace != nil {
		// Main workspace members can see ALL workspaces in the project
		err := s.db.Model(&models.ProjectGroup{}).
			Where("project_id = ?", projectID).
			Pluck("group_id", &workspaceIDs).Error
		return workspaceIDs, err
	}

	// Regular members only see their own workspaces
	err = s.db.Table("project_group_members").
		Select("group_id").
		Where("user_id = ? AND project_id = ?", userID, projectID).
		Pluck("group_id", &workspaceIDs).Error

	return workspaceIDs, err
}

// GetMainWorkspace returns the main workspace for a project
func (s *WorkspaceService) GetMainWorkspace(projectID uint) (*models.ProjectGroup, error) {
	var mainWorkspace models.ProjectGroup
	err := s.db.Where("project_id = ? AND is_main = ?", projectID, true).
		Preload("Children").
		First(&mainWorkspace).Error

	if err != nil {
		return nil, err
	}

	return &mainWorkspace, nil
}

// GetChildWorkspaces returns all child workspaces of a parent
func (s *WorkspaceService) GetChildWorkspaces(parentID uint) ([]*models.ProjectGroup, error) {
	var children []*models.ProjectGroup
	err := s.db.Where("parent_id = ?", parentID).
		Order("sort_order ASC").
		Find(&children).Error

	return children, err
}

// CreateWorkspace creates a new workspace
func (s *WorkspaceService) CreateWorkspace(workspace *models.ProjectGroup) error {
	// Validate parent exists if parentID is provided
	if workspace.ParentID != nil {
		var parent models.ProjectGroup
		if err := s.db.First(&parent, *workspace.ParentID).Error; err != nil {
			return fmt.Errorf("parent workspace not found: %w", err)
		}

		// Set level based on parent
		workspace.Level = parent.Level + 1
	}

	return s.db.Create(workspace).Error
}

// AddWorkspaceMember adds a user to a workspace
func (s *WorkspaceService) AddWorkspaceMember(projectID, userID, groupID uint, role string) error {
	// Check if already a member
	var existing models.ProjectGroupMember
	err := s.db.Where("project_id = ? AND user_id = ? AND group_id = ?", projectID, userID, groupID).
		First(&existing).Error

	if err == nil {
		return errors.New("user is already a member of this workspace")
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	member := models.ProjectGroupMember{
		ProjectID: projectID,
		UserID:    userID,
		GroupID:   groupID,
		Role:      role,
	}

	return s.db.Create(&member).Error
}

// RemoveWorkspaceMember removes a user from a workspace
func (s *WorkspaceService) RemoveWorkspaceMember(projectID, userID, groupID uint) error {
	result := s.db.Where("project_id = ? AND user_id = ? AND group_id = ?", projectID, userID, groupID).
		Delete(&models.ProjectGroupMember{})

	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return errors.New("member not found in workspace")
	}

	return nil
}

// GetWorkspaceMembers returns all members of a workspace
func (s *WorkspaceService) GetWorkspaceMembers(groupID uint) ([]*models.User, error) {
	var users []*models.User

	err := s.db.Joins("JOIN project_group_members ON users.id = project_group_members.user_id").
		Where("project_group_members.group_id = ?", groupID).
		Find(&users).Error

	return users, err
}

// GetUserRole returns a user's role in a specific workspace
func (s *WorkspaceService) GetUserRole(userID, groupID uint) (string, error) {
	var member models.ProjectGroupMember
	err := s.db.Where("user_id = ? AND group_id = ?", userID, groupID).
		First(&member).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil // Not a member
		}
		return "", err
	}

	return member.Role, nil
}

// IsUserInWorkspace checks if user is a member of a workspace
func (s *WorkspaceService) IsUserInWorkspace(userID, groupID uint) (bool, error) {
	var count int64
	err := s.db.Model(&models.ProjectGroupMember{}).
		Where("user_id = ? AND group_id = ?", userID, groupID).
		Count(&count).Error

	return count > 0, err
}

// CanUserAccessWorkspace checks if user can access a workspace (direct member or via main workspace)
func (s *WorkspaceService) CanUserAccessWorkspace(userID, projectID, groupID uint) (bool, string, error) {
	// Check direct membership
	isMember, err := s.IsUserInWorkspace(userID, groupID)
	if err != nil {
		return false, "", err
	}

	if isMember {
		role, err := s.GetUserRole(userID, groupID)
		return true, role, err
	}

	// Check if user is in main workspace
	inMain, _, err := s.IsUserInMainWorkspace(userID, projectID)
	if err != nil {
		return false, "", err
	}

	if inMain {
		// User can access via main workspace, but as viewer
		return true, "viewer", nil
	}

	return false, "", nil
}

// UpdateWorkspace updates workspace details
func (s *WorkspaceService) UpdateWorkspace(workspace *models.ProjectGroup) error {
	return s.db.Save(workspace).Error
}

// DeleteWorkspace deletes a workspace (only child workspaces can be deleted)
func (s *WorkspaceService) DeleteWorkspace(groupID uint) error {
	var workspace models.ProjectGroup
	if err := s.db.First(&workspace, groupID).Error; err != nil {
		return err
	}

	// Cannot delete main workspace
	if workspace.IsMain {
		return errors.New("cannot delete main workspace")
	}

	// Check if workspace has content
	var milestoneCount, resourceCount, ideaCount int64

	s.db.Model(&models.Milestone{}).Where("workspace_id = ?", groupID).Count(&milestoneCount)
	s.db.Model(&models.ProjectResource{}).Where("workspace_id = ?", groupID).Count(&resourceCount)
	s.db.Model(&models.IdeaNode{}).Where("workspace_id = ?", groupID).Count(&ideaCount)

	if milestoneCount > 0 || resourceCount > 0 || ideaCount > 0 {
		return errors.New("cannot delete workspace with existing content")
	}

	return s.db.Delete(&workspace).Error
}

// CountMembers returns the number of members in a workspace
func (s *WorkspaceService) CountMembers(groupID uint) (int64, error) {
	var count int64
	err := s.db.Model(&models.ProjectGroupMember{}).
		Where("group_id = ?", groupID).
		Count(&count).Error

	return count, err
}

// GetWorkspaceByID retrieves a workspace by its ID
func (s *WorkspaceService) GetWorkspaceByID(groupID uint, workspace *models.ProjectGroup) error {
	return s.db.Where("group_id = ?", groupID).
		Preload("Parent").
		Preload("Children").
		First(workspace).Error
}

// GetWorkspaceMembersWithRoles returns members with their roles
func (s *WorkspaceService) GetWorkspaceMembersWithRoles(groupID uint) ([]map[string]interface{}, error) {
	type MemberWithRole struct {
		UserID    uint   `json:"user_id"`
		Email     string `json:"email"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Avatar    string `json:"avatar"`
		Role      string `json:"role"`
		JoinedAt  string `json:"joined_at"`
	}

	var members []MemberWithRole
	err := s.db.Table("project_group_members").
		Select("users.id as user_id, users.email, users.first_name, users.last_name, users.avatar, project_group_members.role, project_group_members.joined_at").
		Joins("JOIN users ON users.id = project_group_members.user_id").
		Where("project_group_members.group_id = ?", groupID).
		Scan(&members).Error

	if err != nil {
		return nil, err
	}

	result := make([]map[string]interface{}, len(members))
	for i, m := range members {
		result[i] = map[string]interface{}{
			"user_id":    m.UserID,
			"email":      m.Email,
			"first_name": m.FirstName,
			"last_name":  m.LastName,
			"avatar":     m.Avatar,
			"role":       m.Role,
			"joined_at":  m.JoinedAt,
		}
	}

	return result, nil
}

// UpdateMemberRole updates a member's role in a workspace
func (s *WorkspaceService) UpdateMemberRole(userID, groupID uint, role string) error {
	return s.db.Model(&models.ProjectGroupMember{}).
		Where("user_id = ? AND group_id = ?", userID, groupID).
		Update("role", role).Error
}
