package repositories

import (
	"errors"
	"projectup/database"
	"projectup/models"

	"gorm.io/gorm"
)

type GroupRepository struct {
	db *gorm.DB
}

func NewGroupRepository() *GroupRepository {
	return &GroupRepository{
		db: database.DB,
	}
}

// CreateGroup creates a new project group
func (r *GroupRepository) CreateGroup(group *models.ProjectGroup) error {
	return r.db.Create(group).Error
}

// GetGroupByID retrieves a group by its ID
func (r *GroupRepository) GetGroupByID(groupID uint) (*models.ProjectGroup, error) {
	var group models.ProjectGroup
	err := r.db.First(&group, groupID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("group not found")
		}
		return nil, err
	}
	return &group, nil
}

// UpdateGroup updates an existing group
func (r *GroupRepository) UpdateGroup(group *models.ProjectGroup) error {
	return r.db.Save(group).Error
}

// DeleteGroup deletes a group
func (r *GroupRepository) DeleteGroup(groupID uint) error {
	return r.db.Delete(&models.ProjectGroup{}, groupID).Error
}

// GetGroupsByProjectID retrieves all groups for a project
func (r *GroupRepository) GetGroupsByProjectID(projectID uint) ([]models.ProjectGroup, error) {
	var groups []models.ProjectGroup
	err := r.db.Where("project_id = ?", projectID).Find(&groups).Error
	return groups, err
}

// GetProjectMember retrieves a project member
func (r *GroupRepository) GetProjectMember(projectID, userID uint) (*models.ProjectMember, error) {
	var member models.ProjectMember
	err := r.db.Where("project_id = ? AND user_id = ?", projectID, userID).First(&member).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("member not found")
		}
		return nil, err
	}
	return &member, nil
}

// UpdateProjectMember updates a project member
func (r *GroupRepository) UpdateProjectMember(member *models.ProjectMember) error {
	return r.db.Save(member).Error
}

// GetMembersByGroupID retrieves all members in a group
func (r *GroupRepository) GetMembersByGroupID(groupID uint) ([]models.ProjectMember, error) {
	var members []models.ProjectMember
	err := r.db.Where("group_id = ?", groupID).Find(&members).Error
	return members, err
}

func (r *GroupRepository) GetProjectGroups(projectID uint) ([]models.ProjectGroup, error) {
	var groups []models.ProjectGroup
	err := r.db.Where("project_id = ?", projectID).Find(&groups).Error
	return groups, err
}

func (r *GroupRepository) UpdateMemberGroup(projectID, userID, groupID uint) error {
	return r.db.Model(&models.ProjectMember{}).
		Where("project_id = ? AND user_id = ?", projectID, userID).
		Update("group_id", groupID).Error
}
