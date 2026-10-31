package services

import (
	"errors"
	"time"

	"projectup/database"
	"projectup/models"
	"projectup/repositories"
)

const (
	AdminPermissions   = 0b111111111 // All permissions
	ManagerPermissions = 0b011111110 // All except assigning roles
	MemberPermissions  = 0b000111100 // Basic permissions
)

// Default group types and their permissions
var DefaultGroups = map[string]uint{
	"Admin":   AdminPermissions,
	"Manager": ManagerPermissions,
	"Member":  MemberPermissions,
}

type GroupService struct {
	repo *repositories.GroupRepository
}

func NewGroupService(repo *repositories.GroupRepository) *GroupService {
	return &GroupService{repo: repo}
}

// CreateGroup creates a new group with specified permissions
func (s *GroupService) CreateGroup(projectID uint, name string, description string) (*models.ProjectGroup, error) {
	group := &models.ProjectGroup{
		ProjectID: projectID,
		Name:      name,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := s.repo.CreateGroup(group); err != nil {
		return nil, err
	}

	return group, nil
}

// UpdateGroup updates an existing group's name
func (s *GroupService) UpdateGroup(groupID uint, name string) (*models.ProjectGroup, error) {
	group, err := s.repo.GetGroupByID(groupID)
	if err != nil {
		return nil, err
	}

	group.Name = name
	group.UpdatedAt = time.Now()

	if err := s.repo.UpdateGroup(group); err != nil {
		return nil, err
	}

	return group, nil
}

// DeleteGroup deletes a group
func (s *GroupService) DeleteGroup(groupID uint) error {
	group, err := s.repo.GetGroupByID(groupID)
	if err != nil {
		return err
	}

	// Check if group is the default admin group (ID 1)
	if group.GroupID == 1 {
		return errors.New("cannot delete admin group")
	}

	return s.repo.DeleteGroup(groupID)
}

// GetProjectGroups retrieves all groups for a project
func (s *GroupService) GetProjectGroups(projectID uint) ([]models.ProjectGroup, error) {
	return s.repo.GetProjectGroups(projectID)
}

// EnsureDefaultGroups creates default groups for a project if they don't exist
func (s *GroupService) EnsureDefaultGroups(projectID uint) error {
	existingGroups, err := s.repo.GetGroupsByProjectID(projectID)
	if err != nil {
		return err
	}

	existingTypes := make(map[string]bool)
	for _, group := range existingGroups {
		existingTypes[group.Name] = true
	}

	// Create default groups if they don't exist
	defaultGroupNames := []string{"Admin", "Member"}

	for _, groupName := range defaultGroupNames {
		if !existingTypes[groupName] {
			group := &models.ProjectGroup{
				ProjectID: projectID,
				Name:      groupName,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}
			if err := s.repo.CreateGroup(group); err != nil {
				return err
			}
		}
	}

	return nil
}

// UpdateMemberGroup updates a member's group
func (s *GroupService) UpdateMemberGroup(projectID, userID, groupID uint) error {
	// Verify the group exists and belongs to the project
	group, err := s.repo.GetGroupByID(groupID)
	if err != nil {
		return err
	}
	if group.ProjectID != projectID {
		return errors.New("group does not belong to project")
	}

	return s.repo.UpdateMemberGroup(projectID, userID, groupID)
}

// GetUserGroups retrieves all groups a user belongs to in a project
func GetUserGroups(userID uint, projectID uint) ([]models.ProjectGroup, error) {
	var groups []models.ProjectGroup
	err := database.DB.Table("project_groups").
		Joins("JOIN project_group_members ON project_groups.group_id = project_group_members.group_id").
		Where("project_group_members.user_id = ? AND project_group_members.project_id = ?", userID, projectID).
		Find(&groups).Error
	return groups, err
}

// AddUserToGroup adds a user to a group
func AddUserToGroup(userID uint, projectID uint, groupID uint) error {
	member := models.ProjectGroupMember{
		UserID:    userID,
		ProjectID: projectID,
		GroupID:   groupID,
	}
	return database.DB.Create(&member).Error
}

// RemoveUserFromGroup removes a user from a group
func RemoveUserFromGroup(userID uint, projectID uint, groupID uint) error {
	return database.DB.Where("user_id = ? AND project_id = ? AND group_id = ?",
		userID, projectID, groupID).Delete(&models.ProjectGroupMember{}).Error
}

// FilterBlocksByGroup filters blocks based on group visibility
func FilterBlocksByGroup(userID uint, projectID uint, blocks []models.Block) ([]models.Block, error) {
	// Get all user's groups in this project
	userGroups, err := GetUserGroups(userID, projectID)
	if err != nil {
		return nil, err
	}

	// If user is not in any groups, return empty slice
	if len(userGroups) == 0 {
		return []models.Block{}, nil
	}

	// Extract group IDs
	userGroupIDs := make([]uint, len(userGroups))
	for i, group := range userGroups {
		userGroupIDs[i] = group.GroupID
	}

	// Filter blocks based on permissions in block_permissions table
	var filteredBlocks []models.Block
	for _, block := range blocks {
		// Check if there are any permissions for this block
		var count int64
		err := database.DB.Model(&models.BlockPermission{}).
			Where("block_id = ? AND ((user_id = ? AND can_view = true) OR "+
				"(group_id IN ? AND can_view = true))",
				block.BlockID, userID, userGroupIDs).
			Count(&count).Error
		if err != nil {
			return nil, err
		}

		// If user has permission, include the block
		if count > 0 {
			filteredBlocks = append(filteredBlocks, block)
		}
	}

	return filteredBlocks, nil
}

// UpdateGroupBlockPermissions updates block permissions for a group
func UpdateGroupBlockPermissions(blockID uint, groupID uint, canView, canEdit, canComment, canShare bool) error {
	// Check if permission already exists
	var permission models.BlockPermission
	err := database.DB.Where("block_id = ? AND group_id = ?", blockID, groupID).
		First(&permission).Error

	// If permission doesn't exist, create it
	if err != nil {
		permission = models.BlockPermission{
			BlockID:    blockID,
			GroupID:    &groupID,
			CanView:    canView,
			CanEdit:    canEdit,
			CanComment: canComment,
			CanShare:   canShare,
		}
		return database.DB.Create(&permission).Error
	}

	// Update existing permission
	permission.CanView = canView
	permission.CanEdit = canEdit
	permission.CanComment = canComment
	permission.CanShare = canShare

	return database.DB.Save(&permission).Error
}

// RemoveBlockPermissions removes all permissions for a block and group
func RemoveBlockPermissions(blockID uint, groupID uint) error {
	return database.DB.Where("block_id = ? AND group_id = ?", blockID, groupID).
		Delete(&models.BlockPermission{}).Error
}

// CheckBlockAccess checks if a user has a specific access level to a block
func CheckBlockAccess(userID uint, projectID uint, blockID uint, accessType string) (bool, error) {
	// Get user's groups
	var userGroupIDs []uint
	err := database.DB.Model(&models.ProjectGroupMember{}).
		Where("user_id = ? AND project_id = ?", userID, projectID).
		Pluck("group_id", &userGroupIDs).Error
	if err != nil {
		return false, err
	}

	// Build the query based on access type
	query := database.DB.Model(&models.BlockPermission{}).
		Where("block_id = ? AND ((user_id = ?)", blockID, userID)

	if len(userGroupIDs) > 0 {
		query = query.Or("group_id IN ?", userGroupIDs)
	}

	switch accessType {
	case "view":
		query = query.Where("can_view = true")
	case "edit":
		query = query.Where("can_edit = true")
	case "comment":
		query = query.Where("can_comment = true")
	case "share":
		query = query.Where("can_share = true")
	default:
		return false, errors.New("invalid access type")
	}

	query = query.Where(")")

	var count int64
	err = query.Count(&count).Error
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

// AssignBlockToGroup grants permissions to a group for a block
func AssignBlockToGroup(blockID uint, projectID uint, groupID uint, permissions map[string]bool) error {
	// Create the permission entry
	permission := models.BlockPermission{
		BlockID:    blockID,
		GroupID:    &groupID,
		CanView:    permissions["view"],
		CanEdit:    permissions["edit"],
		CanComment: permissions["comment"],
		CanShare:   permissions["share"],
	}

	// Check if the permission already exists
	var count int64
	err := database.DB.Model(&models.BlockPermission{}).
		Where("block_id = ? AND group_id = ?", blockID, groupID).
		Count(&count).Error
	if err != nil {
		return err
	}

	// If permission exists, update it
	if count > 0 {
		return database.DB.Model(&models.BlockPermission{}).
			Where("block_id = ? AND group_id = ?", blockID, groupID).
			Updates(map[string]interface{}{
				"can_view":    permissions["view"],
				"can_edit":    permissions["edit"],
				"can_comment": permissions["comment"],
				"can_share":   permissions["share"],
			}).Error
	}

	// Otherwise create a new permission
	return database.DB.Create(&permission).Error
}

// GetBlocksWithGroupAccess gets all blocks that a group has access to
func GetBlocksWithGroupAccess(projectID uint, groupID uint, accessType string) ([]models.Block, error) {
	query := database.DB.Model(&models.Block{}).
		Joins("JOIN block_permissions ON blocks.block_id = block_permissions.block_id").
		Where("blocks.project_id = ? AND block_permissions.group_id = ?", projectID, groupID)

	switch accessType {
	case "view":
		query = query.Where("block_permissions.can_view = true")
	case "edit":
		query = query.Where("block_permissions.can_edit = true")
	case "comment":
		query = query.Where("block_permissions.can_comment = true")
	case "share":
		query = query.Where("block_permissions.can_share = true")
	default:
		return nil, errors.New("invalid access type")
	}

	var blocks []models.Block
	err := query.Find(&blocks).Error
	return blocks, err
}

// GetBlockPermissions gets all permissions for a block
func GetBlockPermissions(blockID uint) ([]models.BlockPermission, error) {
	var permissions []models.BlockPermission
	err := database.DB.Where("block_id = ?", blockID).
		Preload("Group").
		Preload("User").
		Find(&permissions).Error
	return permissions, err
}

// UpdateBlockGroupVisibility sets which groups can view a block
func (s *GroupService) UpdateBlockGroupVisibility(blockID uint, groupIDs []uint) error {
	// Start a transaction
	tx := database.DB.Begin()

	// Clear existing visibility settings for this block
	if err := tx.Where("block_id = ?", blockID).Delete(&models.BlockVisibleGroup{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Add new visibility settings
	for _, groupID := range groupIDs {
		visibility := models.BlockVisibleGroup{
			BlockID: blockID,
			GroupID: groupID,
		}
		if err := tx.Create(&visibility).Error; err != nil {
			tx.Rollback()
			return err
		}
	}

	// Commit transaction
	return tx.Commit().Error
}

// GetBlockVisibleGroups gets all groups that can view a block
func (s *GroupService) GetBlockVisibleGroups(blockID uint) ([]models.ProjectGroup, error) {
	var groups []models.ProjectGroup

	err := database.DB.Table("project_groups").
		Joins("JOIN block_visible_groups ON project_groups.group_id = block_visible_groups.group_id").
		Where("block_visible_groups.block_id = ?", blockID).
		Find(&groups).Error

	return groups, err
}

// GetBlocksByVisibleGroup gets all blocks visible to a specific group
func (s *GroupService) GetBlocksByVisibleGroup(groupID uint, projectID uint) ([]models.Block, error) {
	var blocks []models.Block

	err := database.DB.Table("blocks").
		Joins("JOIN block_visible_groups ON blocks.block_id = block_visible_groups.block_id").
		Where("block_visible_groups.group_id = ? AND blocks.project_id = ? AND blocks.archived = false",
			groupID, projectID).
		Find(&blocks).Error

	return blocks, err
}

// FilterBlocksByUserGroups filters blocks based on the user's group memberships
func (s *GroupService) FilterBlocksByUserGroups(userID uint, projectID uint, blocks []models.Block) ([]models.Block, error) {
	// Get user's groups
	userGroups, err := GetUserGroups(userID, projectID)
	if err != nil {
		return nil, err
	}

	if len(userGroups) == 0 {
		return []models.Block{}, nil
	}

	// Extract group IDs
	userGroupIDs := make([]uint, len(userGroups))
	for i, group := range userGroups {
		userGroupIDs[i] = group.GroupID
	}

	// Filter blocks based on visibility
	var visibleBlocks []models.Block
	blockIDs := make([]uint, len(blocks))
	blockMap := make(map[uint]models.Block)

	for i, block := range blocks {
		blockIDs[i] = block.BlockID
		blockMap[block.BlockID] = block
	}

	var visibleBlockIDs []uint
	err = database.DB.Table("block_visible_groups").
		Where("group_id IN ? AND block_id IN ?", userGroupIDs, blockIDs).
		Pluck("DISTINCT block_id", &visibleBlockIDs).Error

	if err != nil {
		return nil, err
	}

	for _, blockID := range visibleBlockIDs {
		if block, exists := blockMap[blockID]; exists {
			visibleBlocks = append(visibleBlocks, block)
		}
	}

	return visibleBlocks, nil
}
