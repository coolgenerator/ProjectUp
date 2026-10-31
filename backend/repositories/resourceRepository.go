package repositories

import (
	"errors"
	"projectup/models"
	"time"

	"gorm.io/gorm"
)

type ResourceRepository struct {
	db *gorm.DB
}

func NewResourceRepository(db *gorm.DB) *ResourceRepository {
	return &ResourceRepository{db: db}
}

// GetDB returns the database instance
func (r *ResourceRepository) GetDB() *gorm.DB {
	return r.db
}

// CreateResource creates a new resource
func (r *ResourceRepository) CreateResource(resource *models.Resource) error {
	return r.db.Create(resource).Error
}

// GetResourceByID retrieves a resource by its ID
func (r *ResourceRepository) GetResourceByID(resourceID string) (*models.Resource, error) {
	var resource models.Resource
	err := r.db.Preload("User").Preload("Project").Where("id = ?", resourceID).First(&resource).Error
	if err != nil {
		return nil, err
	}
	return &resource, nil
}

// GetUserResources retrieves all non-trashed resources for a user with pagination
func (r *ResourceRepository) GetUserResources(userID uint, limit, offset int, resourceType string) ([]*models.Resource, int64, error) {
	var resources []*models.Resource
	var totalCount int64

	query := r.db.Model(&models.Resource{}).Where("user_id = ? AND is_trashed = ?", userID, false)

	if resourceType != "" {
		query = query.Where("type = ?", resourceType)
	}

	// Get total count
	if err := query.Count(&totalCount).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.
		Preload("Project").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&resources).Error

	if err != nil {
		return nil, 0, err
	}

	return resources, totalCount, nil
}

// GetProjectResources retrieves all resources for a project
func (r *ResourceRepository) GetProjectResources(projectID uint) ([]*models.Resource, error) {
	var resources []*models.Resource
	err := r.db.Where("project_id = ?", projectID).
		Preload("User").
		Order("created_at DESC").
		Find(&resources).Error
	if err != nil {
		return nil, err
	}
	return resources, nil
}

// UpdateResource updates an existing resource
func (r *ResourceRepository) UpdateResource(resource *models.Resource) error {
	return r.db.Save(resource).Error
}

// DeleteResource deletes a resource by ID
func (r *ResourceRepository) DeleteResource(resourceID string) error {
	return r.db.Where("id = ?", resourceID).Delete(&models.Resource{}).Error
}

// GetResourceByUserAndID retrieves a resource by ID ensuring it belongs to the user
func (r *ResourceRepository) GetResourceByUserAndID(userID uint, resourceID string) (*models.Resource, error) {
	var resource models.Resource
	err := r.db.Where("id = ? AND user_id = ?", resourceID, userID).First(&resource).Error
	if err != nil {
		return nil, err
	}
	return &resource, nil
}

// SearchUserResources searches resources by title or description
func (r *ResourceRepository) SearchUserResources(userID uint, query string) ([]*models.Resource, error) {
	var resources []*models.Resource
	searchQuery := "%" + query + "%"
	err := r.db.Where("user_id = ? AND (title ILIKE ? OR description ILIKE ?)", userID, searchQuery, searchQuery).
		Preload("Project").
		Order("created_at DESC").
		Find(&resources).Error
	if err != nil {
		return nil, err
	}
	return resources, nil
}

// GetResourcesByTags retrieves resources by tags
func (r *ResourceRepository) GetResourcesByTags(userID uint, tags []string) ([]*models.Resource, error) {
	var resources []*models.Resource
	err := r.db.Where("user_id = ? AND tags && ?", userID, tags).
		Preload("Project").
		Order("created_at DESC").
		Find(&resources).Error
	if err != nil {
		return nil, err
	}
	return resources, nil
}

// GetOrCreateResourceQuota gets or creates a resource quota for a user
func (r *ResourceRepository) GetOrCreateResourceQuota(userID uint) (*models.ResourceQuota, error) {
	var quota models.ResourceQuota
	err := r.db.Where("user_id = ?", userID).First(&quota).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		// Create new quota with default values
		quota = models.ResourceQuota{
			UserID:       userID,
			UserTier:     models.UserTierFree,
			FileCount:    0,
			MaxFileCount: models.GetMaxFileCount(models.UserTierFree),
			MaxFileSize:  models.GetMaxFileSize(models.UserTierFree),
			TotalStorage: 0,
			MaxStorage:   models.GetMaxStorage(models.UserTierFree),
		}
		if err := r.db.Create(&quota).Error; err != nil {
			return nil, err
		}
	} else if err != nil {
		return nil, err
	}

	return &quota, nil
}

// UpdateResourceQuota updates the resource quota
func (r *ResourceRepository) UpdateResourceQuota(quota *models.ResourceQuota) error {
	return r.db.Save(quota).Error
}

// IncrementResourceUsage increments the file count and storage usage
func (r *ResourceRepository) IncrementResourceUsage(userID uint, fileSize int64) error {
	return r.db.Model(&models.ResourceQuota{}).
		Where("user_id = ?", userID).
		Updates(map[string]interface{}{
			"file_count":    gorm.Expr("file_count + ?", 1),
			"total_storage": gorm.Expr("total_storage + ?", fileSize),
		}).Error
}

// DecrementResourceUsage decrements the file count and storage usage
func (r *ResourceRepository) DecrementResourceUsage(userID uint, fileSize int64) error {
	return r.db.Model(&models.ResourceQuota{}).
		Where("user_id = ?", userID).
		Updates(map[string]interface{}{
			"file_count":    gorm.Expr("file_count - ?", 1),
			"total_storage": gorm.Expr("total_storage - ?", fileSize),
		}).Error
}

// MoveToTrash soft deletes a resource by setting is_trashed to true
func (r *ResourceRepository) MoveToTrash(resourceID string) error {
	now := time.Now()
	return r.db.Model(&models.Resource{}).
		Where("id = ?", resourceID).
		Updates(map[string]interface{}{
			"is_trashed": true,
			"trashed_at": now,
		}).Error
}

// RestoreFromTrash restores a resource from trash
func (r *ResourceRepository) RestoreFromTrash(resourceID string) error {
	return r.db.Model(&models.Resource{}).
		Where("id = ?", resourceID).
		Updates(map[string]interface{}{
			"is_trashed": false,
			"trashed_at": nil,
		}).Error
}

// GetTrashedResources retrieves all trashed resources for a user
func (r *ResourceRepository) GetTrashedResources(userID uint, limit, offset int) ([]*models.Resource, int64, error) {
	var resources []*models.Resource
	var totalCount int64

	query := r.db.Model(&models.Resource{}).Where("user_id = ? AND is_trashed = ?", userID, true)

	// Get total count
	if err := query.Count(&totalCount).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.
		Preload("Project").
		Order("trashed_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&resources).Error

	if err != nil {
		return nil, 0, err
	}

	return resources, totalCount, nil
}

// EmptyTrash permanently deletes all trashed resources for a user
func (r *ResourceRepository) EmptyTrash(userID uint) error {
	// Get all trashed resources to delete from S3
	var resources []*models.Resource
	if err := r.db.Where("user_id = ? AND is_trashed = ?", userID, true).Find(&resources).Error; err != nil {
		return err
	}

	// Delete the records
	return r.db.Where("user_id = ? AND is_trashed = ?", userID, true).Delete(&models.Resource{}).Error
}
