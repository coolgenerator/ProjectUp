package services

import (
	"errors"
	"projectup/database"
	"projectup/models"

	"gorm.io/gorm"
)

// ContentService handles content operations with workspace-based permissions
type ContentService struct {
	db               *gorm.DB
	workspaceService *WorkspaceService
}

// NewContentService creates a new content service instance
func NewContentService() *ContentService {
	return &ContentService{
		db:               database.DB,
		workspaceService: NewWorkspaceService(),
	}
}

// ====== Milestone Methods ======

// GetVisibleMilestones returns milestones visible to the user based on workspace access
func (s *ContentService) GetVisibleMilestones(userID, projectID uint) ([]*models.Milestone, error) {
	visibleWorkspaceIDs, err := s.workspaceService.GetVisibleWorkspaceIDs(userID, projectID)
	if err != nil {
		return nil, err
	}

	if len(visibleWorkspaceIDs) == 0 {
		return []*models.Milestone{}, nil
	}

	var milestones []*models.Milestone
	err = s.db.Where("project_id = ? AND workspace_id IN ?", projectID, visibleWorkspaceIDs).
		Preload("Workspace").
		Order("due_date ASC").
		Find(&milestones).Error

	return milestones, err
}

// GetWorkspaceMilestones returns milestones for a specific workspace
func (s *ContentService) GetWorkspaceMilestones(userID, projectID, workspaceID uint) ([]*models.Milestone, error) {
	// Check if user can access this workspace
	canAccess, _, err := s.workspaceService.CanUserAccessWorkspace(userID, projectID, workspaceID)
	if err != nil {
		return nil, err
	}

	if !canAccess {
		return nil, errors.New("no access to this workspace")
	}

	var milestones []*models.Milestone
	err = s.db.Where("project_id = ? AND workspace_id = ?", projectID, workspaceID).
		Order("due_date ASC").
		Find(&milestones).Error

	return milestones, err
}

// CreateMilestone creates a new milestone in a workspace
func (s *ContentService) CreateMilestone(userID, projectID, workspaceID uint, milestone *models.Milestone) error {
	// Check if user can edit in this workspace
	canAccess, role, err := s.workspaceService.CanUserAccessWorkspace(userID, projectID, workspaceID)
	if err != nil {
		return err
	}

	if !canAccess || role == "viewer" {
		return errors.New("no edit permission in this workspace")
	}

	milestone.ProjectID = projectID
	milestone.WorkspaceID = &workspaceID

	return s.db.Create(milestone).Error
}

// ====== IdeaTree Methods ======

// GetVisibleIdeaTrees returns idea trees visible to the user based on workspace access
func (s *ContentService) GetVisibleIdeaTrees(userID, projectID uint) ([]*models.IdeaNode, error) {
	visibleWorkspaceIDs, err := s.workspaceService.GetVisibleWorkspaceIDs(userID, projectID)
	if err != nil {
		return nil, err
	}

	if len(visibleWorkspaceIDs) == 0 {
		return []*models.IdeaNode{}, nil
	}

	var trees []*models.IdeaNode
	err = s.db.Where("project_id = ? AND workspace_id IN ? AND parent_id IS NULL", projectID, visibleWorkspaceIDs).
		Preload("Workspace").
		Preload("CreatedBy").
		Preload("Children").
		Order("created_at DESC").
		Find(&trees).Error

	return trees, err
}

// GetWorkspaceIdeaTrees returns idea trees for a specific workspace
func (s *ContentService) GetWorkspaceIdeaTrees(userID, projectID, workspaceID uint) ([]*models.IdeaNode, error) {
	// Check if user can access this workspace
	canAccess, _, err := s.workspaceService.CanUserAccessWorkspace(userID, projectID, workspaceID)
	if err != nil {
		return nil, err
	}

	if !canAccess {
		return nil, errors.New("no access to this workspace")
	}

	var trees []*models.IdeaNode
	err = s.db.Where("project_id = ? AND workspace_id = ? AND parent_id IS NULL", projectID, workspaceID).
		Preload("CreatedBy").
		Preload("Children").
		Order("created_at DESC").
		Find(&trees).Error

	return trees, err
}

// CreateIdeaNode creates a new idea node in a workspace
func (s *ContentService) CreateIdeaNode(userID, projectID, workspaceID uint, node *models.IdeaNode) error {
	// Check if user can edit in this workspace
	canAccess, role, err := s.workspaceService.CanUserAccessWorkspace(userID, projectID, workspaceID)
	if err != nil {
		return err
	}

	if !canAccess || role == "viewer" {
		return errors.New("no edit permission in this workspace")
	}

	node.ProjectID = projectID
	node.WorkspaceID = &workspaceID
	node.CreatedByID = userID
	node.LastEditedBy = userID

	return s.db.Create(node).Error
}

// ====== Resource Methods ======

// GetVisibleResources returns resources visible to the user based on workspace access
func (s *ContentService) GetVisibleResources(userID, projectID uint) ([]*models.ProjectResource, error) {
	visibleWorkspaceIDs, err := s.workspaceService.GetVisibleWorkspaceIDs(userID, projectID)
	if err != nil {
		return nil, err
	}

	if len(visibleWorkspaceIDs) == 0 {
		return []*models.ProjectResource{}, nil
	}

	var resources []*models.ProjectResource
	err = s.db.Where("project_id = ? AND workspace_id IN ?", projectID, visibleWorkspaceIDs).
		Preload("Workspace").
		Order("created_at DESC").
		Find(&resources).Error

	return resources, err
}

// GetWorkspaceResources returns resources for a specific workspace
func (s *ContentService) GetWorkspaceResources(userID, projectID, workspaceID uint) ([]*models.ProjectResource, error) {
	// Check if user can access this workspace
	canAccess, _, err := s.workspaceService.CanUserAccessWorkspace(userID, projectID, workspaceID)
	if err != nil {
		return nil, err
	}

	if !canAccess {
		return nil, errors.New("no access to this workspace")
	}

	var resources []*models.ProjectResource
	err = s.db.Where("project_id = ? AND workspace_id = ?", projectID, workspaceID).
		Order("created_at DESC").
		Find(&resources).Error

	return resources, err
}

// CreateResource creates a new resource in a workspace
func (s *ContentService) CreateResource(userID, projectID, workspaceID uint, resource *models.ProjectResource) error {
	// Check if user can edit in this workspace
	canAccess, role, err := s.workspaceService.CanUserAccessWorkspace(userID, projectID, workspaceID)
	if err != nil {
		return err
	}

	if !canAccess || role == "viewer" {
		return errors.New("no edit permission in this workspace")
	}

	resource.ProjectID = projectID
	resource.WorkspaceID = &workspaceID

	return s.db.Create(resource).Error
}

// ====== Permission Check Methods ======

// CanUserEditContent checks if user can edit content in a workspace
func (s *ContentService) CanUserEditContent(userID, projectID, workspaceID uint) (bool, error) {
	canAccess, role, err := s.workspaceService.CanUserAccessWorkspace(userID, projectID, workspaceID)
	if err != nil {
		return false, err
	}

	// Viewer role cannot edit
	return canAccess && role != "viewer", nil
}

// CanUserViewContent checks if user can view content in a workspace
func (s *ContentService) CanUserViewContent(userID, projectID, workspaceID uint) (bool, error) {
	canAccess, _, err := s.workspaceService.CanUserAccessWorkspace(userID, projectID, workspaceID)
	return canAccess, err
}

// ====== Count Methods for Dashboard ======

// CountWorkspaceMilestones counts milestones in a workspace
func (s *ContentService) CountWorkspaceMilestones(workspaceID uint) (int64, error) {
	var count int64
	err := s.db.Model(&models.Milestone{}).
		Where("workspace_id = ?", workspaceID).
		Count(&count).Error
	return count, err
}

// CountWorkspaceIdeaTrees counts idea trees in a workspace
func (s *ContentService) CountWorkspaceIdeaTrees(workspaceID uint) (int64, error) {
	var count int64
	err := s.db.Model(&models.IdeaNode{}).
		Where("workspace_id = ? AND parent_id IS NULL", workspaceID).
		Count(&count).Error
	return count, err
}

// CountWorkspaceResources counts resources in a workspace
func (s *ContentService) CountWorkspaceResources(workspaceID uint) (int64, error) {
	var count int64
	err := s.db.Model(&models.ProjectResource{}).
		Where("workspace_id = ?", workspaceID).
		Count(&count).Error
	return count, err
}
