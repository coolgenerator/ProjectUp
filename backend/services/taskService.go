package services

import (
	"encoding/json"
	"errors"
	"projectup/models"
	"projectup/repositories"
	"strconv"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

// TaskService handles business logic for tasks
type TaskService struct {
	repo *repositories.TaskRepository
}

// NewTaskService creates a new TaskService
func NewTaskService(repo *repositories.TaskRepository) *TaskService {
	return &TaskService{repo: repo}
}

// CreateTask creates a new task
func (s *TaskService) CreateTask(task *models.Task) error {
	// Generate ID if not provided
	if task.ID == "" {
		task.ID = generateTaskID()
	}

	// Validate required fields
	if task.ProjectID == "" || task.Title == "" || task.CreatedBy == "" {
		return errors.New("project_id, title, and created_by are required")
	}

	// Set default status if not provided
	if task.Status == "" {
		task.Status = "todo"
	}

	// Set default priority if not provided
	if task.Priority == 0 {
		task.Priority = 3
	}

	// Handle empty string pointers - convert to nil
	if task.IdeaNodeID != nil && *task.IdeaNodeID == "" {
		task.IdeaNodeID = nil
	}
	if task.ParentTaskID != nil && *task.ParentTaskID == "" {
		task.ParentTaskID = nil
	}
	if task.AssignedTo != nil && len(task.AssignedTo) == 0 {
		task.AssignedTo = nil
	}

	return s.repo.CreateTask(task)
}

// GetTask retrieves a task by ID
func (s *TaskService) GetTask(id string, includeRelations bool) (*models.Task, error) {
	return s.repo.GetTaskByID(id, includeRelations)
}

// GetTasksByProject retrieves all tasks for a project with filters
func (s *TaskService) GetTasksByProject(projectID string, filters map[string]interface{}, limit, offset int) ([]models.Task, error) {
	if limit <= 0 {
		limit = 100
	}
	if limit > 500 {
		limit = 500
	}

	return s.repo.GetTasksByProjectID(projectID, filters, limit, offset)
}

// GetTasksByIdeaNode retrieves all tasks linked to an idea node
func (s *TaskService) GetTasksByIdeaNode(ideaNodeID string) ([]models.Task, error) {
	return s.repo.GetTasksByIdeaNodeID(ideaNodeID)
}

// UpdateTask updates a task
func (s *TaskService) UpdateTask(id string, updates map[string]interface{}) error {
	// Check if task exists
	_, err := s.repo.GetTaskByID(id, false)
	if err != nil {
		return errors.New("task not found")
	}

	// Handle status change to "done" - set completed_at
	if status, ok := updates["status"].(string); ok && status == "done" {
		if _, exists := updates["completed_at"]; !exists {
			updates["completed_at"] = time.Now()
		}
		// Set progress to 100 when done
		updates["progress"] = 100
	}

	// Handle status change from "done" to something else - clear completed_at
	if status, ok := updates["status"].(string); ok && status != "done" {
		updates["completed_at"] = nil
	}

	return s.repo.UpdateTask(id, updates)
}

// UpdateTaskStatus is a quick helper to update only the status
func (s *TaskService) UpdateTaskStatus(id string, status string) error {
	updates := map[string]interface{}{"status": status}
	return s.UpdateTask(id, updates)
}

// UpdateTaskProgress is a quick helper to update only the progress
func (s *TaskService) UpdateTaskProgress(id string, progress int) error {
	if progress < 0 {
		progress = 0
	}
	if progress > 100 {
		progress = 100
	}

	updates := map[string]interface{}{"progress": progress}

	// If progress is 100, also set status to done
	if progress == 100 {
		updates["status"] = "done"
		updates["completed_at"] = time.Now()
	}

	return s.UpdateTask(id, updates)
}

// DeleteTask soft deletes a task
func (s *TaskService) DeleteTask(id string) error {
	// Check if task exists
	_, err := s.repo.GetTaskByID(id, false)
	if err != nil {
		return errors.New("task not found")
	}

	return s.repo.DeleteTask(id)
}

// GetTaskStats retrieves task statistics for a project
func (s *TaskService) GetTaskStats(projectID string) (map[string]interface{}, error) {
	return s.repo.GetTaskStats(projectID)
}

// ConvertIdeaToTask converts an idea node to a task (legacy - simple conversion)
func (s *TaskService) ConvertIdeaToTask(ideaNodeID, projectID, createdBy, title, description string, tags []string) (*models.Task, error) {
	task := &models.Task{
		ID:          generateTaskID(),
		ProjectID:   projectID,
		Title:       title,
		Description: description,
		Status:      "todo",
		Priority:    3,
		IdeaNodeID:  &ideaNodeID,
		CreatedBy:   createdBy,
	}

	// Set tags if provided
	if len(tags) > 0 {
		// Convert tags to JSON-compatible format
		// This would need proper JSON marshaling in actual implementation
	}

	err := s.repo.CreateTask(task)
	if err != nil {
		return nil, err
	}

	return task, nil
}

// AIGeneratedTaskBreakdown represents the AI-generated project structure
type AIGeneratedTaskBreakdown struct {
	Milestones []struct {
		Title        string   `json:"title"`
		Description  string   `json:"description"`
		Deliverables []string `json:"deliverables"`
		Order        int      `json:"order"`
	} `json:"milestones"`
	Sections []struct {
		Name           string `json:"name"`
		Description    string `json:"description"`
		MilestoneIndex int    `json:"milestone_index"`
		Order          int    `json:"order"`
	} `json:"sections"`
	Tasks []struct {
		Title          string   `json:"title"`
		Description    string   `json:"description"`
		SectionIndex   int      `json:"section_index"`
		Priority       int      `json:"priority"`
		EstimatedHours float64  `json:"estimated_hours"`
		Dependencies   []int    `json:"dependencies"`
		Tags           []string `json:"tags"`
		SkillsRequired []string `json:"skills_required"`
	} `json:"tasks"`
}

// ConvertAIBreakdownToTasks creates milestones, sections, tasks, and dependencies from AI-generated breakdown
func (s *TaskService) ConvertAIBreakdownToTasks(breakdown AIGeneratedTaskBreakdown, ideaNodeID, projectIDStr string, projectIDUint uint, createdBy string, sectionRepo *repositories.SectionRepository) error {
	// Step 1: Create Milestones
	milestoneIDs := make([]uint, len(breakdown.Milestones))
	for i, m := range breakdown.Milestones {
		descPtr := &m.Description
		milestone := &models.Milestone{
			ProjectID:   projectIDUint,
			Title:       m.Title,
			Description: descPtr,
			Status:      "pending",
			SortOrder:   m.Order,
		}

		// Create milestone
		err := s.repo.CreateMilestone(milestone)
		if err != nil {
			return err
		}

		milestoneIDs[i] = milestone.MilestoneID
	}

	// Step 2: Create Sections
	sectionIDs := make([]int, len(breakdown.Sections))
	for i, sec := range breakdown.Sections {
		descPtr := &sec.Description
		section := &models.Section{
			ProjectID:   projectIDStr,
			Name:        sec.Name,
			Description: descPtr,
			Order:       sec.Order,
		}

		// Assign to milestone if valid index
		if sec.MilestoneIndex >= 0 && sec.MilestoneIndex < len(milestoneIDs) {
			section.MilestoneID = &milestoneIDs[sec.MilestoneIndex]
		}

		// Create section
		err := sectionRepo.CreateSection(section)
		if err != nil {
			return err
		}

		sectionIDs[i] = section.ID
	}

	// Step 3: Create Tasks
	taskIDs := make([]string, len(breakdown.Tasks))
	for i, t := range breakdown.Tasks {
		task := &models.Task{
			ID:             generateTaskID(),
			ProjectID:      projectIDStr,
			Title:          t.Title,
			Description:    t.Description,
			Status:         "todo",
			Priority:       t.Priority,
			EstimatedHours: &t.EstimatedHours,
			IdeaNodeID:     &ideaNodeID,
			CreatedBy:      createdBy,
		}

		// Convert tags to JSON
		if len(t.Tags) > 0 {
			tagsJSON, _ := json.Marshal(t.Tags)
			task.Tags = datatypes.JSON(tagsJSON)
		}

		// Assign to section if valid index
		if t.SectionIndex >= 0 && t.SectionIndex < len(sectionIDs) {
			sectionID := int(sectionIDs[t.SectionIndex])
			task.SectionID = &sectionID
		}

		// Create task
		err := s.repo.CreateTask(task)
		if err != nil {
			return err
		}

		taskIDs[i] = task.ID
	}

	// Step 4: Create Dependencies
	for i, t := range breakdown.Tasks {
		for _, depIndex := range t.Dependencies {
			// Only create dependency if it references an earlier task (prevent circular dependencies)
			if depIndex >= 0 && depIndex < len(taskIDs) && depIndex < i {
				dependency := &models.TaskDependency{
					TaskID:          taskIDs[i],
					DependsOnTaskID: taskIDs[depIndex],
				}

				// Create dependency
				err := s.repo.CreateTaskDependency(dependency)
				if err != nil {
					return err
				}
			}
		}
	}

	return nil
}

// ========== Subtask Operations ==========

// CreateSubtask creates a new subtask
func (s *TaskService) CreateSubtask(subtask *models.Subtask) error {
	// Generate ID if not provided
	if subtask.ID == "" {
		subtask.ID = generateTaskID()
	}

	// Validate parent task exists
	_, err := s.repo.GetTaskByID(subtask.ParentTaskID, false)
	if err != nil {
		return errors.New("parent task not found")
	}

	// Set default status if not provided
	if subtask.Status == "" {
		subtask.Status = "todo"
	}

	return s.repo.CreateSubtask(subtask)
}

// GetSubtask retrieves a subtask by ID
func (s *TaskService) GetSubtask(id string) (*models.Subtask, error) {
	return s.repo.GetSubtaskByID(id)
}

// GetSubtasksByTask retrieves all subtasks for a task
func (s *TaskService) GetSubtasksByTask(taskID string) ([]models.Subtask, error) {
	return s.repo.GetSubtasksByTaskID(taskID)
}

// UpdateSubtask updates a subtask
func (s *TaskService) UpdateSubtask(id string, updates map[string]interface{}) error {
	// Check if subtask exists
	_, err := s.repo.GetSubtaskByID(id)
	if err != nil {
		return errors.New("subtask not found")
	}

	// Handle status change to "done" - set completed_at
	if status, ok := updates["status"].(string); ok && status == "done" {
		if _, exists := updates["completed_at"]; !exists {
			updates["completed_at"] = time.Now()
		}
	}

	return s.repo.UpdateSubtask(id, updates)
}

// DeleteSubtask soft deletes a subtask
func (s *TaskService) DeleteSubtask(id string) error {
	_, err := s.repo.GetSubtaskByID(id)
	if err != nil {
		return errors.New("subtask not found")
	}

	return s.repo.DeleteSubtask(id)
}

// ========== Learning Resource Operations ==========

// CreateLearningResource creates a new learning resource
func (s *TaskService) CreateLearningResource(resource *models.LearningResource) error {
	// Generate ID if not provided
	if resource.ID == "" {
		resource.ID = generateTaskID()
	}

	// Validate task exists
	_, err := s.repo.GetTaskByID(resource.TaskID, false)
	if err != nil {
		return errors.New("task not found")
	}

	// Set default status if not provided
	if resource.Status == "" {
		resource.Status = "not_started"
	}

	return s.repo.CreateLearningResource(resource)
}

// GetLearningResource retrieves a learning resource by ID
func (s *TaskService) GetLearningResource(id string) (*models.LearningResource, error) {
	return s.repo.GetLearningResourceByID(id)
}

// GetLearningResourcesByTask retrieves all learning resources for a task
func (s *TaskService) GetLearningResourcesByTask(taskID string) ([]models.LearningResource, error) {
	return s.repo.GetLearningResourcesByTaskID(taskID)
}

// UpdateLearningResource updates a learning resource
func (s *TaskService) UpdateLearningResource(id string, updates map[string]interface{}) error {
	// Check if resource exists
	_, err := s.repo.GetLearningResourceByID(id)
	if err != nil {
		return errors.New("learning resource not found")
	}

	// Handle status change to "completed" - set completed_at
	if status, ok := updates["status"].(string); ok && status == "completed" {
		if _, exists := updates["completed_at"]; !exists {
			updates["completed_at"] = time.Now()
		}
		updates["progress"] = 100
	}

	return s.repo.UpdateLearningResource(id, updates)
}

// MarkResourceComplete marks a learning resource as complete
func (s *TaskService) MarkResourceComplete(id string, notes string, keyTakeaways []string) error {
	updates := map[string]interface{}{
		"status":       "completed",
		"progress":     100,
		"completed_at": time.Now(),
	}

	if notes != "" {
		updates["notes"] = notes
	}

	// Handle key takeaways - would need proper JSON marshaling

	return s.UpdateLearningResource(id, updates)
}

// DeleteLearningResource soft deletes a learning resource
func (s *TaskService) DeleteLearningResource(id string) error {
	_, err := s.repo.GetLearningResourceByID(id)
	if err != nil {
		return errors.New("learning resource not found")
	}

	return s.repo.DeleteLearningResource(id)
}

// ========== Task Dependency Operations ==========

// AddTaskDependency adds a dependency between tasks
func (s *TaskService) AddTaskDependency(taskID, dependsOnTaskID string) error {
	// Check both tasks exist
	_, err := s.repo.GetTaskByID(taskID, false)
	if err != nil {
		return errors.New("task not found")
	}

	_, err = s.repo.GetTaskByID(dependsOnTaskID, false)
	if err != nil {
		return errors.New("depends_on task not found")
	}

	// Check for circular dependency
	if s.repo.CheckCircularDependency(taskID, dependsOnTaskID) {
		return errors.New("circular dependency detected")
	}

	dependency := &models.TaskDependency{
		TaskID:          taskID,
		DependsOnTaskID: dependsOnTaskID,
	}

	return s.repo.CreateTaskDependency(dependency)
}

// GetTaskDependencies retrieves all dependencies for a task
func (s *TaskService) GetTaskDependencies(taskID string) ([]models.TaskDependency, error) {
	return s.repo.GetTaskDependencies(taskID)
}

// GetDependentTasks retrieves all tasks that depend on this task
func (s *TaskService) GetDependentTasks(taskID string) ([]models.TaskDependency, error) {
	return s.repo.GetDependentTasks(taskID)
}

// RemoveTaskDependency removes a task dependency
func (s *TaskService) RemoveTaskDependency(id int) error {
	return s.repo.DeleteTaskDependency(id)
}

// GetProjectDependencies retrieves all dependencies for a project
func (s *TaskService) GetProjectDependencies(projectID string) ([]models.TaskDependency, error) {
	return s.repo.GetProjectDependencies(projectID)
}

// BulkUpdateTasks updates multiple tasks with the same updates
func (s *TaskService) BulkUpdateTasks(taskIDs []string, updates map[string]interface{}) (int, error) {
	return s.repo.BulkUpdateTasks(taskIDs, updates)
}

// BulkDeleteTasks deletes multiple tasks
func (s *TaskService) BulkDeleteTasks(taskIDs []string) (int, error) {
	return s.repo.BulkDeleteTasks(taskIDs)
}

// ========== Conversion Methods ==========

// ConvertTaskToMilestone converts a task to a milestone
// Subtasks become regular tasks under the new milestone
func (s *TaskService) ConvertTaskToMilestone(taskID string) (*models.Milestone, error) {
	// Get the task
	task, err := s.repo.GetTaskByID(taskID, false)
	if err != nil {
		return nil, errors.New("task not found")
	}

	// Parse project ID
	projectID, err := strconv.ParseUint(task.ProjectID, 10, 32)
	if err != nil {
		return nil, errors.New("invalid project ID")
	}

	// Create new milestone with task data
	milestone := &models.Milestone{
		ProjectID:   uint(projectID),
		Title:       task.Title,
		Description: &task.Description,
		Status:      convertTaskStatusToMilestoneStatus(task.Status),
		Priority:    task.Priority,
		Completed:   task.Status == "done",
	}

	if task.DueDate != nil {
		milestone.DueDate = task.DueDate
	}

	// Create the milestone
	if err := s.repo.CreateMilestone(milestone); err != nil {
		return nil, errors.New("failed to create milestone: " + err.Error())
	}

	// Get all subtasks of this task
	subtasks, err := s.repo.GetSubtasksByParentID(taskID)
	if err == nil && len(subtasks) > 0 {
		// Convert subtasks to regular tasks under the new milestone
		for _, subtask := range subtasks {
			// Create a new task from the subtask
			newTask := &models.Task{
				ID:          generateTaskID(),
				ProjectID:   task.ProjectID,
				Title:       subtask.Title,
				Description: subtask.Description,
				Status:      subtask.Status,
				Priority:    task.Priority, // Inherit priority from parent
				MilestoneID: &milestone.MilestoneID,
				CreatedBy:   task.CreatedBy,
			}

			if subtask.DueDate != nil {
				newTask.DueDate = subtask.DueDate
			}

			if subtask.AssignedTo != nil {
				newTask.AssignedTo = subtask.AssignedTo
			}

			// Create the new task
			if err := s.repo.CreateTask(newTask); err != nil {
				// Log error but continue
				continue
			}

			// Delete the subtask
			s.repo.DeleteSubtask(subtask.ID)
		}
	}

	// Delete the original task
	if err := s.repo.DeleteTask(taskID); err != nil {
		return nil, errors.New("failed to delete original task: " + err.Error())
	}

	return milestone, nil
}

// ConvertMilestoneToTask converts a milestone to a task
// Child tasks become subtasks of the new task
func (s *TaskService) ConvertMilestoneToTask(milestoneID uint) (*models.Task, error) {
	// Get the milestone
	milestone, err := s.repo.GetMilestoneByID(milestoneID)
	if err != nil {
		return nil, errors.New("milestone not found")
	}

	// Create new task with milestone data
	task := &models.Task{
		ID:          generateTaskID(),
		ProjectID:   strconv.FormatUint(uint64(milestone.ProjectID), 10),
		Title:       milestone.Title,
		Status:      convertMilestoneStatusToTaskStatus(milestone.Status),
		Priority:    milestone.Priority,
		CreatedBy:   "system", // Default creator
	}

	if milestone.Description != nil {
		task.Description = *milestone.Description
	}

	if milestone.DueDate != nil {
		task.DueDate = milestone.DueDate
	}

	// Create the task
	if err := s.repo.CreateTask(task); err != nil {
		return nil, errors.New("failed to create task: " + err.Error())
	}

	// Get all tasks under this milestone
	childTasks, err := s.repo.GetTasksByMilestoneID(milestoneID)
	if err == nil && len(childTasks) > 0 {
		// Convert child tasks to subtasks
		for _, childTask := range childTasks {
			// Create a subtask from the task
			subtask := &models.Subtask{
				ID:           generateTaskID(),
				ParentTaskID: task.ID,
				Title:        childTask.Title,
				Description:  childTask.Description,
				Status:       childTask.Status,
			}

			if childTask.DueDate != nil {
				subtask.DueDate = childTask.DueDate
			}

			if childTask.AssignedTo != nil {
				subtask.AssignedTo = childTask.AssignedTo
			}

			// Create the subtask
			if err := s.repo.CreateSubtask(subtask); err != nil {
				// Log error but continue
				continue
			}

			// Delete the original task
			s.repo.DeleteTask(childTask.ID)
		}
	}

	// Delete the original milestone
	if err := s.repo.DeleteMilestone(milestoneID); err != nil {
		return nil, errors.New("failed to delete original milestone: " + err.Error())
	}

	return task, nil
}

// Helper functions for status conversion
func convertTaskStatusToMilestoneStatus(taskStatus string) string {
	switch taskStatus {
	case "todo":
		return "pending"
	case "in_progress":
		return "in_progress"
	case "review":
		return "in_progress"
	case "blocked":
		return "in_progress"
	case "done":
		return "completed"
	default:
		return "pending"
	}
}

func convertMilestoneStatusToTaskStatus(milestoneStatus string) string {
	switch milestoneStatus {
	case "pending":
		return "todo"
	case "in_progress":
		return "in_progress"
	case "completed":
		return "done"
	case "cancelled":
		return "blocked"
	default:
		return "todo"
	}
}

// ========== Helper Functions ==========

// generateTaskID generates a unique task ID
func generateTaskID() string {
	return uuid.New().String()
}
