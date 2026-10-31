package repositories

import (
	"projectup/database"
	"projectup/helper"
	"projectup/models"
	"time"

	"gorm.io/gorm"
)

type LearningRepository struct {
	db *gorm.DB
}

func NewLearningRepository() *LearningRepository {
	return &LearningRepository{
		db: database.DB,
	}
}

func (r *LearningRepository) CreateLearningPath(path *models.LearningPath) error {
	now := time.Now()
	path.StartedAt = &now

	return r.db.Create(path).Error
}

func (r *LearningRepository) GetUserLearningPaths(userID uint, page, limit int) ([]models.LearningPath, int64, error) {
	var paths []models.LearningPath
	var total int64

	offset := (page - 1) * limit

	// Count total
	r.db.Model(&models.LearningPath{}).Where("user_id = ?", userID).Count(&total)

	// Fetch paginated results
	err := r.db.Preload("Modules.Tasks").
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&paths).Error

	return paths, total, err
}

func (r *LearningRepository) GetLearningPathByShortID(shortID string) (*models.LearningPath, error) {
	var path models.LearningPath
	err := r.db.Preload("Modules.Tasks").
		Preload("User").
		Where("short_id = ?", shortID).
		First(&path).Error

	if err != nil {
		return nil, err
	}

	return &path, nil
}

// GetLearningPathByTopicID retrieves a learning path by its topicId (AI service UUID)
func (r *LearningRepository) GetLearningPathByTopicID(topicID string) (*models.LearningPath, error) {
	var path models.LearningPath
	err := r.db.Preload("Modules.Tasks").
		Preload("User").
		Where("topic_id = ?", topicID).
		First(&path).Error

	if err != nil {
		return nil, err
	}

	return &path, nil
}

func (r *LearningRepository) GetLearningPathByID(id uint) (*models.LearningPath, error) {
	var path models.LearningPath
	err := r.db.Preload("Modules.Tasks").
		Where("id = ?", id).
		First(&path).Error
	
	if err != nil {
		return nil, err
	}
	
	return &path, nil
}

func (r *LearningRepository) IsTaskOwnedByUser(taskID, userID uint) bool {
	var count int64
	r.db.Table("learning_tasks").
		Joins("JOIN learning_modules ON learning_modules.id = learning_tasks.module_id").
		Joins("JOIN learning_paths ON learning_paths.id = learning_modules.learning_path_id").
		Where("learning_tasks.id = ? AND learning_paths.user_id = ?", taskID, userID).
		Count(&count)
	
	return count > 0
}

func (r *LearningRepository) ToggleTaskCompletion(taskID uint) error {
	var task models.LearningTask
	if err := r.db.First(&task, taskID).Error; err != nil {
		return err
	}

	task.Completed = !task.Completed
	if task.Completed {
		now := time.Now()
		task.CompletedAt = &now
	} else {
		task.CompletedAt = nil
	}

	return r.db.Save(&task).Error
}

func (r *LearningRepository) UpdateModuleCompletion(taskID uint) error {
	// Get the module ID from the task
	var task models.LearningTask
	if err := r.db.First(&task, taskID).Error; err != nil {
		return err
	}

	// Check if all tasks in the module are completed
	var incompleteTasks int64
	r.db.Model(&models.LearningTask{}).
		Where("module_id = ? AND completed = false", task.ModuleID).
		Count(&incompleteTasks)

	// Update module completion status
	var module models.LearningModule
	if err := r.db.First(&module, task.ModuleID).Error; err != nil {
		return err
	}

	if incompleteTasks == 0 {
		module.Completed = true
		now := time.Now()
		module.CompletedAt = &now
	} else {
		module.Completed = false
		module.CompletedAt = nil
	}

	if err := r.db.Save(&module).Error; err != nil {
		return err
	}

	// Update learning path progress
	return r.updatePathProgress(module.LearningPathID)
}

func (r *LearningRepository) updatePathProgress(pathID uint) error {
	var totalModules, completedModules int64
	
	r.db.Model(&models.LearningModule{}).
		Where("learning_path_id = ?", pathID).
		Count(&totalModules)
	
	r.db.Model(&models.LearningModule{}).
		Where("learning_path_id = ? AND completed = true", pathID).
		Count(&completedModules)
	
	progress := float32(0)
	if totalModules > 0 {
		progress = float32(completedModules) / float32(totalModules) * 100
	}

	var path models.LearningPath
	if err := r.db.First(&path, pathID).Error; err != nil {
		return err
	}

	path.Progress = progress
	if progress >= 100 {
		now := time.Now()
		path.CompletedAt = &now
	}

	return r.db.Save(&path).Error
}

func (r *LearningRepository) UpdateProgress(shortID string, userID uint, progress float32) error {
	return r.db.Model(&models.LearningPath{}).
		Where("short_id = ? AND user_id = ?", shortID, userID).
		Update("progress", progress).Error
}

func (r *LearningRepository) DeleteLearningPath(shortID string, userID uint) error {
	return r.db.Where("short_id = ? AND user_id = ?", shortID, userID).
		Delete(&models.LearningPath{}).Error
}

// DeleteLearningPathByTopicID deletes a learning path by topicId
func (r *LearningRepository) DeleteLearningPathByTopicID(topicID string, userID uint) error {
	return r.db.Where("topic_id = ? AND user_id = ?", topicID, userID).
		Delete(&models.LearningPath{}).Error
}

func (r *LearningRepository) UpdateLearningPathStatus(pathID uint, status string) error {
	return r.db.Model(&models.LearningPath{}).
		Where("id = ?", pathID).
		Update("status", status).Error
}

func (r *LearningRepository) UpdateLearningPath(path *models.LearningPath) error {
	// Update the entire learning path with generated content
	return r.db.Session(&gorm.Session{FullSaveAssociations: true}).
		Where("id = ?", path.ID).
		Updates(path).Error
}

// UpdateLearningPathVisibility updates the public/private status of a learning path
func (r *LearningRepository) UpdateLearningPathVisibility(shortID string, userID uint, isPublic bool) error {
	return r.db.Model(&models.LearningPath{}).
		Where("short_id = ? AND user_id = ?", shortID, userID).
		Update("is_public", isPublic).Error
}

// UpdateLearningPathVisibilityByTopicID updates the visibility by topicId
func (r *LearningRepository) UpdateLearningPathVisibilityByTopicID(topicID string, userID uint, isPublic bool) error {
	return r.db.Model(&models.LearningPath{}).
		Where("topic_id = ? AND user_id = ?", topicID, userID).
		Update("is_public", isPublic).Error
}

// GetPublicLearningPaths fetches all public courses with optional filtering
func (r *LearningRepository) GetPublicLearningPaths(page, limit int, category, search string) ([]models.LearningPath, int64, error) {
	var paths []models.LearningPath
	var total int64

	offset := (page - 1) * limit

	// Build query
	query := r.db.Model(&models.LearningPath{}).
		Where("is_public = ? AND status = ?", true, "ready")

	// Add category filter if provided
	if category != "" {
		query = query.Where("category = ?", category)
	}

	// Add search filter if provided
	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where("title ILIKE ? OR description ILIKE ? OR topic_name ILIKE ?",
			searchPattern, searchPattern, searchPattern)
	}

	// Count total
	query.Count(&total)

	// Fetch paginated results with user info
	err := query.Preload("User").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&paths).Error

	return paths, total, err
}

// GetCourseCategories fetches unique categories from public courses
func (r *LearningRepository) GetCourseCategories() ([]string, error) {
	var categories []string
	err := r.db.Model(&models.LearningPath{}).
		Where("is_public = ? AND category != ? AND status = ?", true, "", "ready").
		Distinct("category").
		Pluck("category", &categories).Error

	return categories, err
}

// CopyCourseToUser creates a copy of a public course for a user
func (r *LearningRepository) CopyCourseToUser(originalID uint, userID uint) (*models.LearningPath, error) {
	// Get the original course
	var original models.LearningPath
	if err := r.db.First(&original, originalID).Error; err != nil {
		return nil, err
	}

	// Generate a unique short_id for the copy
	shortID := helper.GenerateShortID(8)

	// Create a copy with user's ownership
	copy := models.LearningPath{
		ShortID:          shortID,
		UserID:           userID,
		TopicID:          original.TopicID, // Share the same topic_id to access same AI content
		TopicName:        original.TopicName,
		Title:            original.Title,
		Description:      original.Description,
		Category:         original.Category,
		IsPublic:         false, // User's copy is private by default
		Duration:         original.Duration,
		Difficulty:       original.Difficulty,
		LearningGoals:    original.LearningGoals,
		EstimatedWeeks:   original.EstimatedWeeks,
		Prerequisites:    original.Prerequisites,
		Progress:         0, // Reset progress for new user
		Status:           original.Status,
		OriginalCourseID: &originalID, // Reference to original
		ViewCount:        0,
		CopyCount:        0,
		LikeCount:        0,
	}

	now := time.Now()
	copy.StartedAt = &now

	// Create the copy
	if err := r.db.Create(&copy).Error; err != nil {
		return nil, err
	}

	// Increment copy count on original
	r.db.Model(&models.LearningPath{}).
		Where("id = ?", originalID).
		UpdateColumn("copy_count", gorm.Expr("copy_count + ?", 1))

	return &copy, nil
}

// IncrementViewCount increments the view count for a course
func (r *LearningRepository) IncrementViewCount(courseID uint) error {
	return r.db.Model(&models.LearningPath{}).
		Where("id = ?", courseID).
		UpdateColumn("view_count", gorm.Expr("view_count + ?", 1)).Error
}

// IncrementLikeCount increments the like count for a course
func (r *LearningRepository) IncrementLikeCount(courseID uint) error {
	return r.db.Model(&models.LearningPath{}).
		Where("id = ?", courseID).
		UpdateColumn("like_count", gorm.Expr("like_count + ?", 1)).Error
}

// DecrementLikeCount decrements the like count for a course
func (r *LearningRepository) DecrementLikeCount(courseID uint) error {
	return r.db.Model(&models.LearningPath{}).
		Where("id = ? AND like_count > 0", courseID).
		UpdateColumn("like_count", gorm.Expr("like_count - ?", 1)).Error
}

// ToggleLike toggles a like for a course by a user
func (r *LearningRepository) ToggleLike(courseID, userID uint) (bool, error) {
	// Check if like already exists
	var count int64
	r.db.Table("user_course_likes").
		Where("user_id = ? AND course_id = ?", userID, courseID).
		Count(&count)

	if count > 0 {
		// Unlike: Delete the like record
		err := r.db.Exec("DELETE FROM user_course_likes WHERE user_id = ? AND course_id = ?", userID, courseID).Error
		if err != nil {
			return false, err
		}
		// Decrement like count
		r.DecrementLikeCount(courseID)
		return false, nil // Returns false meaning unliked
	} else {
		// Like: Insert like record
		err := r.db.Exec("INSERT INTO user_course_likes (user_id, course_id) VALUES (?, ?)", userID, courseID).Error
		if err != nil {
			return false, err
		}
		// Increment like count
		r.IncrementLikeCount(courseID)
		return true, nil // Returns true meaning liked
	}
}

// IsCourseLikedByUser checks if a user has liked a course
func (r *LearningRepository) IsCourseLikedByUser(courseID, userID uint) bool {
	var count int64
	r.db.Table("user_course_likes").
		Where("user_id = ? AND course_id = ?", userID, courseID).
		Count(&count)
	return count > 0
}