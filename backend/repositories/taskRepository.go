package repositories

import (
	"projectup/models"

	"gorm.io/gorm"
)

// TaskRepository handles database operations for tasks
type TaskRepository struct {
	db *gorm.DB
}

// NewTaskRepository creates a new TaskRepository
func NewTaskRepository(db *gorm.DB) *TaskRepository {
	return &TaskRepository{db: db}
}

// CreateTask creates a new task
func (r *TaskRepository) CreateTask(task *models.Task) error {
	return r.db.Create(task).Error
}

// GetTaskByID retrieves a task by ID
func (r *TaskRepository) GetTaskByID(id string, preload bool) (*models.Task, error) {
	var task models.Task
	query := r.db.Where("id = ?", id)

	if preload {
		query = query.Preload("Subtasks").Preload("LearningResources")
	}

	err := query.First(&task).Error
	if err != nil {
		return nil, err
	}
	return &task, nil
}

// GetTasksByProjectID retrieves all tasks for a project with optional filters
func (r *TaskRepository) GetTasksByProjectID(projectID string, filters map[string]interface{}, limit, offset int) ([]models.Task, error) {
	var tasks []models.Task
	query := r.db.Where("project_id = ?", projectID)

	// Apply filters
	if status, ok := filters["status"].(string); ok && status != "" {
		query = query.Where("status = ?", status)
	}
	if taskType, ok := filters["task_type"].(string); ok && taskType != "" {
		query = query.Where("task_type = ?", taskType)
	}
	if assignedTo, ok := filters["assigned_to"].(string); ok && assignedTo != "" {
		query = query.Where("assigned_to = ?", assignedTo)
	}
	if priority, ok := filters["priority"].(int); ok && priority > 0 {
		query = query.Where("priority = ?", priority)
	}
	if milestoneID, ok := filters["milestone_id"].(int); ok && milestoneID > 0 {
		query = query.Where("milestone_id = ?", milestoneID)
	}

	err := query.Limit(limit).Offset(offset).Order("created_at DESC").Find(&tasks).Error
	return tasks, err
}

// GetTasksByIdeaNodeID retrieves all tasks linked to an idea node
func (r *TaskRepository) GetTasksByIdeaNodeID(ideaNodeID string) ([]models.Task, error) {
	var tasks []models.Task
	err := r.db.Where("idea_node_id = ?", ideaNodeID).Order("created_at DESC").Find(&tasks).Error
	return tasks, err
}

// UpdateTask updates a task
func (r *TaskRepository) UpdateTask(id string, updates map[string]interface{}) error {
	return r.db.Model(&models.Task{}).Where("id = ?", id).Updates(updates).Error
}

// DeleteTask soft deletes a task
func (r *TaskRepository) DeleteTask(id string) error {
	return r.db.Where("id = ?", id).Delete(&models.Task{}).Error
}

// GetTaskStats retrieves task statistics for a project
func (r *TaskRepository) GetTaskStats(projectID string) (map[string]interface{}, error) {
	var stats struct {
		Total      int64
		Todo       int64
		InProgress int64
		Blocked    int64
		Done       int64
	}

	// Get total count
	r.db.Model(&models.Task{}).Where("project_id = ?", projectID).Count(&stats.Total)

	// Get count by status
	r.db.Model(&models.Task{}).Where("project_id = ? AND status = ?", projectID, "todo").Count(&stats.Todo)
	r.db.Model(&models.Task{}).Where("project_id = ? AND status = ?", projectID, "in_progress").Count(&stats.InProgress)
	r.db.Model(&models.Task{}).Where("project_id = ? AND status = ?", projectID, "blocked").Count(&stats.Blocked)
	r.db.Model(&models.Task{}).Where("project_id = ? AND status = ?", projectID, "done").Count(&stats.Done)

	// Calculate completion rate
	completionRate := 0
	if stats.Total > 0 {
		completionRate = int((float64(stats.Done) / float64(stats.Total)) * 100)
	}

	return map[string]interface{}{
		"total":           stats.Total,
		"todo":            stats.Todo,
		"in_progress":     stats.InProgress,
		"blocked":         stats.Blocked,
		"done":            stats.Done,
		"completion_rate": completionRate,
	}, nil
}

// ========== Subtask Operations ==========

// CreateSubtask creates a new subtask
func (r *TaskRepository) CreateSubtask(subtask *models.Subtask) error {
	return r.db.Create(subtask).Error
}

// GetSubtaskByID retrieves a subtask by ID
func (r *TaskRepository) GetSubtaskByID(id string) (*models.Subtask, error) {
	var subtask models.Subtask
	err := r.db.Where("id = ?", id).First(&subtask).Error
	if err != nil {
		return nil, err
	}
	return &subtask, nil
}

// GetSubtasksByTaskID retrieves all subtasks for a task
func (r *TaskRepository) GetSubtasksByTaskID(taskID string) ([]models.Subtask, error) {
	var subtasks []models.Subtask
	err := r.db.Where("parent_task_id = ?", taskID).Order("created_at ASC").Find(&subtasks).Error
	return subtasks, err
}

// UpdateSubtask updates a subtask
func (r *TaskRepository) UpdateSubtask(id string, updates map[string]interface{}) error {
	return r.db.Model(&models.Subtask{}).Where("id = ?", id).Updates(updates).Error
}

// DeleteSubtask soft deletes a subtask
func (r *TaskRepository) DeleteSubtask(id string) error {
	return r.db.Where("id = ?", id).Delete(&models.Subtask{}).Error
}

// ========== Learning Resource Operations ==========

// CreateLearningResource creates a new learning resource
func (r *TaskRepository) CreateLearningResource(resource *models.LearningResource) error {
	return r.db.Create(resource).Error
}

// GetLearningResourceByID retrieves a learning resource by ID
func (r *TaskRepository) GetLearningResourceByID(id string) (*models.LearningResource, error) {
	var resource models.LearningResource
	err := r.db.Where("id = ?", id).First(&resource).Error
	if err != nil {
		return nil, err
	}
	return &resource, nil
}

// GetLearningResourcesByTaskID retrieves all learning resources for a task
func (r *TaskRepository) GetLearningResourcesByTaskID(taskID string) ([]models.LearningResource, error) {
	var resources []models.LearningResource
	err := r.db.Where("task_id = ?", taskID).Order("created_at ASC").Find(&resources).Error
	return resources, err
}

// UpdateLearningResource updates a learning resource
func (r *TaskRepository) UpdateLearningResource(id string, updates map[string]interface{}) error {
	return r.db.Model(&models.LearningResource{}).Where("id = ?", id).Updates(updates).Error
}

// DeleteLearningResource soft deletes a learning resource
func (r *TaskRepository) DeleteLearningResource(id string) error {
	return r.db.Where("id = ?", id).Delete(&models.LearningResource{}).Error
}

// ========== Task Dependency Operations ==========

// CreateTaskDependency creates a new task dependency
func (r *TaskRepository) CreateTaskDependency(dependency *models.TaskDependency) error {
	return r.db.Create(dependency).Error
}

// GetTaskDependencies retrieves all dependencies for a task
func (r *TaskRepository) GetTaskDependencies(taskID string) ([]models.TaskDependency, error) {
	var dependencies []models.TaskDependency
	err := r.db.Where("task_id = ?", taskID).Find(&dependencies).Error
	return dependencies, err
}

// GetDependentTasks retrieves all tasks that depend on this task
func (r *TaskRepository) GetDependentTasks(taskID string) ([]models.TaskDependency, error) {
	var dependencies []models.TaskDependency
	err := r.db.Where("depends_on_task_id = ?", taskID).Find(&dependencies).Error
	return dependencies, err
}

// DeleteTaskDependency deletes a task dependency
func (r *TaskRepository) DeleteTaskDependency(id int) error {
	return r.db.Where("id = ?", id).Delete(&models.TaskDependency{}).Error
}

// GetProjectDependencies retrieves all dependencies for tasks in a project
func (r *TaskRepository) GetProjectDependencies(projectID string) ([]models.TaskDependency, error) {
	var dependencies []models.TaskDependency
	// Join with tasks table to filter by project_id
	err := r.db.
		Joins("JOIN tasks ON task_dependencies.task_id = tasks.id").
		Where("tasks.project_id = ?", projectID).
		Find(&dependencies).Error
	return dependencies, err
}

// BulkUpdateTasks updates multiple tasks with the same updates
func (r *TaskRepository) BulkUpdateTasks(taskIDs []string, updates map[string]interface{}) (int, error) {
	result := r.db.Model(&models.Task{}).Where("id IN ?", taskIDs).Updates(updates)
	return int(result.RowsAffected), result.Error
}

// BulkDeleteTasks soft deletes multiple tasks
func (r *TaskRepository) BulkDeleteTasks(taskIDs []string) (int, error) {
	result := r.db.Where("id IN ?", taskIDs).Delete(&models.Task{})
	return int(result.RowsAffected), result.Error
}

// CheckCircularDependency checks if adding a dependency would create a circular dependency
func (r *TaskRepository) CheckCircularDependency(taskID, dependsOnTaskID string) bool {
	// Simple check: see if dependsOnTaskID depends on taskID (direct or indirect)
	visited := make(map[string]bool)
	return r.hasCircularDependency(dependsOnTaskID, taskID, visited)
}

func (r *TaskRepository) hasCircularDependency(currentTaskID, targetTaskID string, visited map[string]bool) bool {
	if currentTaskID == targetTaskID {
		return true
	}

	if visited[currentTaskID] {
		return false
	}

	visited[currentTaskID] = true

	dependencies, _ := r.GetTaskDependencies(currentTaskID)
	for _, dep := range dependencies {
		if r.hasCircularDependency(dep.DependsOnTaskID, targetTaskID, visited) {
			return true
		}
	}

	return false
}

// ========== Milestone Methods ==========

// CreateMilestone creates a new milestone
func (r *TaskRepository) CreateMilestone(milestone *models.Milestone) error {
	return r.db.Create(milestone).Error
}

// GetMilestoneByID gets a milestone by ID
func (r *TaskRepository) GetMilestoneByID(id uint) (*models.Milestone, error) {
	var milestone models.Milestone
	err := r.db.Where("milestone_id = ?", id).First(&milestone).Error
	return &milestone, err
}

// DeleteMilestone deletes a milestone
func (r *TaskRepository) DeleteMilestone(id uint) error {
	return r.db.Where("milestone_id = ?", id).Delete(&models.Milestone{}).Error
}

// GetTasksByMilestoneID gets all tasks belonging to a milestone
func (r *TaskRepository) GetTasksByMilestoneID(milestoneID uint) ([]models.Task, error) {
	var tasks []models.Task
	err := r.db.Where("milestone_id = ?", milestoneID).Find(&tasks).Error
	return tasks, err
}

// GetSubtasksByParentID gets all subtasks by parent task ID
func (r *TaskRepository) GetSubtasksByParentID(parentTaskID string) ([]models.Subtask, error) {
	return r.GetSubtasksByTaskID(parentTaskID)
}
