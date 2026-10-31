package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"mime/multipart"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"projectup/helper"
	"projectup/models"
	"projectup/repositories"
)

type ResourceService struct {
	repo       *repositories.ResourceRepository
	fileHelper *helper.FileHelper
}

func NewResourceService(repo *repositories.ResourceRepository, fileHelper *helper.FileHelper) *ResourceService {
	return &ResourceService{
		repo:       repo,
		fileHelper: fileHelper,
	}
}

// CreateWebLink creates a new web link resource
func (s *ResourceService) CreateWebLink(userID uint, title, url, description string, tags []string, projectID *uint) (*models.Resource, error) {
	// Check user quota (ensure it exists)
	_, err := s.repo.GetOrCreateResourceQuota(userID)
	if err != nil {
		return nil, err
	}

	resource := &models.Resource{
		ID:          uuid.New().String(),
		UserID:      userID,
		Type:        models.ResourceTypeLink,
		Title:       title,
		URL:         &url,
		Description: &description,
		Tags:        pq.StringArray(tags),
		ProjectID:   projectID,
		IsPublic:    false,
	}

	if err := s.repo.CreateResource(resource); err != nil {
		return nil, err
	}

	return resource, nil
}

// UploadPaper uploads a paper as a special type of resource
func (s *ResourceService) UploadPaper(userID uint, file multipart.File, header *multipart.FileHeader, 
	title, description string, tags []string, projectID *uint,
	authors []string, venue string, year int, abstract, category, doi, arxivID string) (*models.Resource, error) {
	
	// Check user quota
	quota, err := s.repo.GetOrCreateResourceQuota(userID)
	if err != nil {
		return nil, err
	}

	// Check file size limit
	if header.Size > quota.MaxFileSize {
		return nil, fmt.Errorf("paper size exceeds limit of %d MB", quota.MaxFileSize/1048576)
	}

	// Check file count limit
	if quota.FileCount >= quota.MaxFileCount {
		return nil, fmt.Errorf("file count exceeds limit of %d files", quota.MaxFileCount)
	}

	// Check total storage limit
	if quota.TotalStorage+header.Size > quota.MaxStorage {
		return nil, fmt.Errorf("total storage would exceed limit of %d MB", quota.MaxStorage/1048576)
	}

	// Generate S3 key for papers
	fileExt := filepath.Ext(header.Filename)
	s3Key := fmt.Sprintf("papers/user-%d/%s%s", userID, helper.GenerateShortID(12), fileExt)

	// Upload to S3
	fileURL, err := s.fileHelper.UploadToS3(file, s3Key, header.Header.Get("Content-Type"))
	if err != nil {
		return nil, fmt.Errorf("failed to upload paper: %w", err)
	}

	// Get actual file size from S3 for accuracy
	actualFileSize, err := s.fileHelper.GetObjectSize(s3Key)
	if err != nil {
		// Log error but use header size as fallback
		fmt.Printf("Failed to get S3 object size, using header size: %v\n", err)
		actualFileSize = header.Size
	}

	// Prepare paper-specific fields
	var authorsJSON *string
	if len(authors) > 0 {
		authorsBytes, _ := json.Marshal(authors)
		authorsStr := string(authorsBytes)
		authorsJSON = &authorsStr
	}

	// Create resource record with paper type
	fileSize := actualFileSize
	fileType := header.Header.Get("Content-Type")
	if fileType == "" {
		fileType = "application/pdf"
	}

	resource := &models.Resource{
		UserID:      userID,
		Type:        models.ResourceTypePaper,
		Title:       title,
		Description: &description,
		FileName:    &header.Filename,
		FileSize:    &fileSize,
		FileType:    &fileType,
		S3Key:       &s3Key,
		URL:         &fileURL,
		Tags:        pq.StringArray(tags),
		ProjectID:   projectID,
		IsPublic:    false,
		// Paper-specific fields
		Authors:     authorsJSON,
		Venue:       &venue,
		Year:        &year,
		Abstract:    &abstract,
		Category:    &category,
		DOI:         &doi,
		ArxivID:     &arxivID,
	}

	if err := s.repo.CreateResource(resource); err != nil {
		// Clean up S3 file if database save fails
		s.fileHelper.DeleteFromS3(s3Key)
		return nil, err
	}

	// Update quota
	if err := s.repo.IncrementResourceUsage(userID, fileSize); err != nil {
		// Log error but don't fail the operation
		fmt.Printf("Failed to update resource quota: %v\n", err)
	}

	return resource, nil
}

// UploadFile uploads a file resource
func (s *ResourceService) UploadFile(userID uint, file multipart.File, header *multipart.FileHeader, title, description string, tags []string, projectID *uint) (*models.Resource, error) {
	// Check user quota
	quota, err := s.repo.GetOrCreateResourceQuota(userID)
	if err != nil {
		return nil, err
	}

	// Check file size limit
	if header.Size > quota.MaxFileSize {
		return nil, fmt.Errorf("file size exceeds limit of %d MB", quota.MaxFileSize/1048576)
	}

	// Check file count limit
	if quota.FileCount >= quota.MaxFileCount {
		return nil, fmt.Errorf("file count exceeds limit of %d files", quota.MaxFileCount)
	}

	// Check total storage limit
	if quota.TotalStorage+header.Size > quota.MaxStorage {
		return nil, fmt.Errorf("total storage would exceed limit of %d MB", quota.MaxStorage/1048576)
	}

	// Generate S3 key
	fileExt := filepath.Ext(header.Filename)
	s3Key := fmt.Sprintf("resources/user-%d/%s%s", userID, helper.GenerateShortID(12), fileExt)

	// Upload to S3
	fileURL, err := s.fileHelper.UploadToS3(file, s3Key, header.Header.Get("Content-Type"))
	if err != nil {
		return nil, fmt.Errorf("failed to upload file: %w", err)
	}

	// Get actual file size from S3 for accuracy
	actualFileSize, err := s.fileHelper.GetObjectSize(s3Key)
	if err != nil {
		// Log error but use header size as fallback
		fmt.Printf("Failed to get S3 object size, using header size: %v\n", err)
		actualFileSize = header.Size
	}

	// Create resource record
	fileSize := actualFileSize
	fileType := header.Header.Get("Content-Type")
	if fileType == "" {
		fileType = "application/octet-stream"
	}

	resource := &models.Resource{
		ID:          uuid.New().String(),
		UserID:      userID,
		Type:        models.ResourceTypeFile,
		Title:       title,
		Description: &description,
		FileName:    &header.Filename,
		FileSize:    &fileSize,
		FileType:    &fileType,
		S3Key:       &s3Key,
		URL:         &fileURL,
		Tags:        pq.StringArray(tags),
		ProjectID:   projectID,
		IsPublic:    false,
	}

	if err := s.repo.CreateResource(resource); err != nil {
		// Clean up S3 file if database save fails
		s.fileHelper.DeleteFromS3(s3Key)
		return nil, err
	}

	// Update quota
	if err := s.repo.IncrementResourceUsage(userID, fileSize); err != nil {
		// Log error but don't fail the operation
		fmt.Printf("Failed to update resource quota: %v\n", err)
	}

	return resource, nil
}

// GetUserResources retrieves all non-trashed resources for a user
func (s *ResourceService) GetUserResources(userID uint, page, limit int, resourceType string) ([]*models.Resource, int64, error) {
	offset := (page - 1) * limit
	resources, total, err := s.repo.GetUserResources(userID, limit, offset, resourceType)
	if err != nil {
		return nil, 0, err
	}
	
	// Auto-fix any resources with null file sizes
	s.fixNullFileSizes(resources)
	
	return resources, total, nil
}

// GetUserPapers retrieves all papers (paper-type resources) for a user
func (s *ResourceService) GetUserPapers(userID uint, page, limit int) ([]*models.Resource, int64, error) {
	offset := (page - 1) * limit
	// Use "paper" as the resource type filter
	resources, total, err := s.repo.GetUserResources(userID, limit, offset, "paper")
	if err != nil {
		return nil, 0, err
	}
	
	// Auto-fix any resources with null file sizes
	s.fixNullFileSizes(resources)
	
	// Generate pre-signed URLs for papers
	for _, resource := range resources {
		if resource.S3Key != nil {
			presignedURL, err := s.fileHelper.GeneratePresignedURL(*resource.S3Key, 3600) // 1 hour expiry
			if err == nil {
				resource.URL = &presignedURL
			}
		}
	}
	
	return resources, total, nil
}

// GetResource retrieves a single resource
func (s *ResourceService) GetResource(userID uint, resourceID string) (*models.Resource, error) {
	resource, err := s.repo.GetResourceByUserAndID(userID, resourceID)
	if err != nil {
		return nil, err
	}

	// Fix null file size if needed
	if resource.Type == models.ResourceTypeFile && resource.S3Key != nil && resource.FileSize == nil {
		actualSize, err := s.fileHelper.GetObjectSize(*resource.S3Key)
		if err == nil {
			resource.FileSize = &actualSize
			// Update in database
			s.repo.UpdateResource(resource)
		}
	}

	// Generate pre-signed URL for file resources
	if resource.Type == models.ResourceTypeFile && resource.S3Key != nil {
		presignedURL, err := s.fileHelper.GeneratePresignedURL(*resource.S3Key, 3600) // 1 hour expiry
		if err == nil {
			resource.URL = &presignedURL
		}
	}

	return resource, nil
}

// UpdateResource updates a resource
func (s *ResourceService) UpdateResource(userID uint, resourceID string, title, description string, tags []string, projectID *uint) (*models.Resource, error) {
	resource, err := s.repo.GetResourceByUserAndID(userID, resourceID)
	if err != nil {
		return nil, err
	}

	// Update fields
	resource.Title = title
	resource.Description = &description
	resource.Tags = pq.StringArray(tags)
	resource.ProjectID = projectID

	if err := s.repo.UpdateResource(resource); err != nil {
		return nil, err
	}

	return resource, nil
}

// DeleteResource permanently deletes a resource
func (s *ResourceService) DeleteResource(userID uint, resourceID string) error {
	resource, err := s.repo.GetResourceByUserAndID(userID, resourceID)
	if err != nil {
		return err
	}

	// Delete from S3 if it's a file
	if resource.Type == models.ResourceTypeFile && resource.S3Key != nil {
		if err := s.fileHelper.DeleteFromS3(*resource.S3Key); err != nil {
			// Log error but continue with deletion
			fmt.Printf("Failed to delete S3 file: %v\n", err)
		}

		// Update quota only if the resource is not trashed
		// (trashed files are already excluded from quota)
		if resource.FileSize != nil && !resource.IsTrashed {
			if err := s.repo.DecrementResourceUsage(userID, *resource.FileSize); err != nil {
				fmt.Printf("Failed to update resource quota: %v\n", err)
			}
		}
	}

	return s.repo.DeleteResource(resourceID)
}

// SearchResources searches user resources
func (s *ResourceService) SearchResources(userID uint, query string) ([]*models.Resource, error) {
	return s.repo.SearchUserResources(userID, query)
}

// GetResourcesByTags retrieves resources by tags
func (s *ResourceService) GetResourcesByTags(userID uint, tags []string) ([]*models.Resource, error) {
	return s.repo.GetResourcesByTags(userID, tags)
}

// GetProjectResources retrieves all resources for a project
func (s *ResourceService) GetProjectResources(userID, projectID uint) ([]*models.Resource, error) {
	// TODO: Add project membership verification
	resources, err := s.repo.GetProjectResources(projectID)
	if err != nil {
		return nil, err
	}

	// Auto-fix any resources with null file sizes
	s.fixNullFileSizes(resources)

	// Generate pre-signed URLs for file resources
	for _, resource := range resources {
		if resource.Type == models.ResourceTypeFile && resource.S3Key != nil {
			presignedURL, err := s.fileHelper.GeneratePresignedURL(*resource.S3Key, 3600)
			if err == nil {
				resource.URL = &presignedURL
			}
		}
	}

	return resources, nil
}

// GetResourceQuota retrieves the user's resource quota
func (s *ResourceService) GetResourceQuota(userID uint) (*models.ResourceQuota, error) {
	quota, err := s.repo.GetOrCreateResourceQuota(userID)
	if err != nil {
		return nil, err
	}
	
	// Always recalculate quota from actual resources to ensure accuracy
	// Get ALL non-trashed file resources
	resources, _, err := s.repo.GetUserResources(userID, 1000, 0, "file")
	if err == nil {
		// First, fix any null file sizes
		s.fixNullFileSizes(resources)
		
		var totalStorage int64
		fileCount := 0
		
		// Count non-trashed file and paper resources in quota, excluding system-generated files
		for _, resource := range resources {
			if (resource.Type == models.ResourceTypeFile || resource.Type == models.ResourceTypePaper) &&
			   resource.FileSize != nil && !resource.IsTrashed && !isSystemGenerated(resource) {
				totalStorage += *resource.FileSize
				fileCount++
				// Log for debugging
				fileName := "<no filename>"
				if resource.FileName != nil {
					fileName = *resource.FileName
				} else if resource.Type == models.ResourceTypePaper {
					fileName = resource.Title
				}
				fmt.Printf("Resource %s (%s): %s, Size: %d bytes, Trashed: %v\n",
					resource.ID, resource.Type, fileName, *resource.FileSize, resource.IsTrashed)
			}
		}

		// No need to separately count papers as they are now resources

		// Update quota with calculated values if different
		if quota.FileCount != fileCount || quota.TotalStorage != totalStorage {
			fmt.Printf("Updating quota - Old: files=%d, storage=%d | New: files=%d, storage=%d\n", 
				quota.FileCount, quota.TotalStorage, fileCount, totalStorage)
			quota.FileCount = fileCount
			quota.TotalStorage = totalStorage
			if err := s.repo.UpdateResourceQuota(quota); err != nil {
				fmt.Printf("Failed to update quota: %v\n", err)
			}
		}
	} else {
		fmt.Printf("Failed to get resources for quota calculation: %v\n", err)
	}
	
	fmt.Printf("Returning quota for user %d: files=%d, storage=%d bytes\n", userID, quota.FileCount, quota.TotalStorage)
	return quota, nil
}

// RecalculateQuota forces a recalculation of the user's resource quota
func (s *ResourceService) RecalculateQuota(userID uint) (*models.ResourceQuota, error) {
	quota, err := s.repo.GetOrCreateResourceQuota(userID)
	if err != nil {
		return nil, err
	}
	
	// Get ALL non-trashed resources for this user
	resources, _, err := s.repo.GetUserResources(userID, 10000, 0, "")
	if err != nil {
		return nil, fmt.Errorf("failed to get resources: %w", err)
	}
	
	var totalStorage int64
	fileCount := 0
	
	// Count non-trashed file and paper resources, excluding system-generated files
	for _, resource := range resources {
		if (resource.Type == models.ResourceTypeFile || resource.Type == models.ResourceTypePaper) &&
		   resource.FileSize != nil && !resource.IsTrashed && !isSystemGenerated(resource) {
			totalStorage += *resource.FileSize
			fileCount++
			fileName := "<no filename>"
			if resource.FileName != nil {
				fileName = *resource.FileName
			} else if resource.Type == models.ResourceTypePaper {
				fileName = resource.Title
			}
			fmt.Printf("Counting resource %s (%s): %s, Size: %d bytes, Trashed: %v\n",
				resource.ID, resource.Type, fileName, *resource.FileSize, resource.IsTrashed)
		}
	}

	// No need to separately count papers as they are now resources

	fmt.Printf("Recalculated quota for user %d: files=%d, storage=%d bytes\n", userID, fileCount, totalStorage)
	
	// Update quota with recalculated values
	quota.FileCount = fileCount
	quota.TotalStorage = totalStorage
	
	if err := s.repo.UpdateResourceQuota(quota); err != nil {
		return nil, fmt.Errorf("failed to update quota: %w", err)
	}
	
	return quota, nil
}

// UpdateUserTier updates the user's subscription tier
func (s *ResourceService) UpdateUserTier(userID uint, tier models.UserTier) error {
	quota, err := s.repo.GetOrCreateResourceQuota(userID)
	if err != nil {
		return err
	}

	quota.UserTier = tier
	quota.MaxFileCount = models.GetMaxFileCount(tier)
	quota.MaxFileSize = models.GetMaxFileSize(tier)
	quota.MaxStorage = models.GetMaxStorage(tier)

	return s.repo.UpdateResourceQuota(quota)
}

// isSystemGenerated checks if a resource is system-generated (e.g., cropped images)
// System-generated files should not count toward user storage quotas
func isSystemGenerated(resource *models.Resource) bool {
	title := strings.ToLower(resource.Title)
	var fileName string
	if resource.FileName != nil {
		fileName = strings.ToLower(*resource.FileName)
	}

	// System-generated file patterns
	return strings.HasPrefix(title, "cropped image") ||
	       strings.HasPrefix(fileName, "crop-page") ||
	       strings.Contains(title, "system-generated")
}

// fixNullFileSizes fixes resources with null file sizes by fetching from S3
func (s *ResourceService) fixNullFileSizes(resources []*models.Resource) {
	for _, resource := range resources {
		// Only fix file resources with S3 key and null file size
		if resource.Type == models.ResourceTypeFile && 
		   resource.S3Key != nil && 
		   resource.FileSize == nil {
			
			// Get actual size from S3
			actualSize, err := s.fileHelper.GetObjectSize(*resource.S3Key)
			if err != nil {
				fmt.Printf("Failed to get S3 size for resource %s (key: %s): %v\n",
					resource.ID, *resource.S3Key, err)
				continue
			}

			fmt.Printf("Auto-fixing null size for resource %s: size=%d\n",
				resource.ID, actualSize)

			resource.FileSize = &actualSize

			// Update in database
			if err := s.repo.UpdateResource(resource); err != nil {
				fmt.Printf("Failed to update resource %s: %v\n", resource.ID, err)
			}
		}
	}
}


// MoveToTrash moves a resource to trash
func (s *ResourceService) MoveToTrash(userID uint, resourceID string) error {
	// Verify the resource belongs to the user
	resource, err := s.repo.GetResourceByUserAndID(userID, resourceID)
	if err != nil {
		return err
	}

	if resource == nil {
		return errors.New("resource not found")
	}

	// If it's a file resource and not already trashed, update quota
	if resource.Type == models.ResourceTypeFile && resource.FileSize != nil && !resource.IsTrashed {
		// Decrement quota since we're moving to trash
		if err := s.repo.DecrementResourceUsage(userID, *resource.FileSize); err != nil {
			fmt.Printf("Failed to update resource quota on trash: %v\n", err)
		}
	}

	return s.repo.MoveToTrash(resourceID)
}

// RestoreFromTrash restores a resource from trash
func (s *ResourceService) RestoreFromTrash(userID uint, resourceID string) error {
	// Verify the resource belongs to the user
	resource, err := s.repo.GetResourceByUserAndID(userID, resourceID)
	if err != nil {
		return err
	}

	if resource == nil {
		return errors.New("resource not found")
	}

	if !resource.IsTrashed {
		return errors.New("resource is not in trash")
	}

	// Check quota before restoring file resources
	if resource.Type == models.ResourceTypeFile && resource.FileSize != nil {
		quota, err := s.repo.GetOrCreateResourceQuota(userID)
		if err != nil {
			return err
		}

		// Check if restoring would exceed limits
		if quota.FileCount >= quota.MaxFileCount {
			return fmt.Errorf("cannot restore: file count would exceed limit of %d files", quota.MaxFileCount)
		}
		if quota.TotalStorage + *resource.FileSize > quota.MaxStorage {
			return fmt.Errorf("cannot restore: total storage would exceed limit of %d MB", quota.MaxStorage/1048576)
		}

		// Increment quota since we're restoring from trash
		if err := s.repo.IncrementResourceUsage(userID, *resource.FileSize); err != nil {
			fmt.Printf("Failed to update resource quota on restore: %v\n", err)
		}
	}

	return s.repo.RestoreFromTrash(resourceID)
}

// GetTrashedResources retrieves all trashed resources for a user
func (s *ResourceService) GetTrashedResources(userID uint) ([]*models.Resource, error) {
	// Get all trashed resources (using large limit)
	resources, _, err := s.repo.GetTrashedResources(userID, 1000, 0)
	if err != nil {
		return nil, err
	}

	// Auto-fix any resources with null file sizes
	s.fixNullFileSizes(resources)

	// Generate pre-signed URLs for file resources
	for _, resource := range resources {
		if resource.Type == models.ResourceTypeFile && resource.S3Key != nil {
			presignedURL, err := s.fileHelper.GeneratePresignedURL(*resource.S3Key, 3600)
			if err == nil {
				resource.URL = &presignedURL
			}
		}
	}

	return resources, nil
}

// EmptyTrash permanently deletes all trashed resources for a user
func (s *ResourceService) EmptyTrash(userID uint) error {
	// Get trashed resources first to delete S3 files
	resources, _, err := s.repo.GetTrashedResources(userID, 1000, 0)
	if err != nil {
		return err
	}

	// Delete S3 files for file resources
	for _, resource := range resources {
		if resource.Type == models.ResourceTypeFile && resource.S3Key != nil {
			if err := s.fileHelper.DeleteFromS3(*resource.S3Key); err != nil {
				// Log error but continue
				fmt.Printf("Failed to delete S3 file: %v\n", err)
			}
			// Note: No need to update quota for trashed files as they're already excluded from quota
		}
	}

	// Delete all trashed resources from database
	return s.repo.EmptyTrash(userID)
}

// ValidateFileType validates if the file type is allowed
func ValidateFileType(filename string) error {
	allowedExtensions := []string{
		// Documents and papers
		".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
		".tex", ".bib", ".epub", ".mobi", ".rtf", ".odt",
		// Text and data
		".txt", ".md", ".json", ".xml", ".csv",
		// Images
		".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".bmp", ".tiff",
		// Videos
		".mp4", ".webm", ".avi", ".mov", ".mkv",
		// Audio
		".mp3", ".wav", ".ogg", ".m4a", ".flac",
		// Archives
		".zip", ".rar", ".tar", ".gz", ".7z", ".bz2",
		// Code
		".html", ".css", ".js", ".ts", ".jsx", ".tsx",
		".py", ".java", ".cpp", ".c", ".go", ".rs", ".r", ".m", ".ipynb",
	}

	ext := strings.ToLower(filepath.Ext(filename))
	for _, allowed := range allowedExtensions {
		if ext == allowed {
			return nil
		}
	}

	return errors.New("file type not allowed")
}