package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"projectup/database"
	"projectup/models"
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// AIGeneratedRoadmap represents the structure from AI service
type AIGeneratedRoadmap struct {
	Success              bool                   `json:"success"`
	Sections             []AIRoadmapSection     `json:"sections"`
	Proposals            []AIProposal           `json:"proposals"`
	TotalEstimatedHours  float64                `json:"total_estimated_hours"`
	TotalTasks           int                    `json:"total_tasks"`
	TotalMilestones      int                    `json:"total_milestones"`
	DependenciesGraph    []AIDependencyEdge     `json:"dependencies_graph"`
	Metadata             map[string]interface{} `json:"metadata"`
}

type AIRoadmapSection struct {
	Name        string             `json:"name"`
	Description string             `json:"description"`
	Order       int                `json:"order"`
	Color       *string            `json:"color"`
	Milestones  []AIMilestone      `json:"milestones"`
}

type AIMilestone struct {
	Title           string    `json:"title"`
	Description     string    `json:"description"`
	Tasks           []AITask  `json:"tasks"`
	EstimatedHours  float64   `json:"estimated_hours"`
	Priority        int       `json:"priority"`
	StartOffsetDays *int      `json:"start_offset_days"`
	DurationDays    *int      `json:"duration_days"`
	Status          string    `json:"status"`
}

type AITask struct {
	Title          string       `json:"title"`
	Description    string       `json:"description"`
	EstimatedHours float64      `json:"estimated_hours"`
	Priority       int          `json:"priority"`
	Subtasks       []AISubtask  `json:"subtasks"`
	Dependencies   []string     `json:"dependencies"`
	Tags           []string     `json:"tags"`
	AssignedTo     []string     `json:"assigned_to"`
}

type AISubtask struct {
	Title          string   `json:"title"`
	Description    string   `json:"description"`
	EstimatedHours *float64 `json:"estimated_hours"`
}

type AIChallengeMitigation struct {
	Challenge  string `json:"challenge"`
	Mitigation string `json:"mitigation"`
}

type AIDecisionFramework struct {
	BestFor  string `json:"best_for"`
	ChooseIf string `json:"choose_if"`
	AvoidIf  string `json:"avoid_if"`
}

type AIProposal struct {
	Title                    string                   `json:"title"`
	Description              string                   `json:"description"`
	Approach                 string                   `json:"approach"`
	Benefits                 []string                 `json:"benefits"`

	// Enhanced fields
	ChallengesWithMitigation []AIChallengeMitigation  `json:"challenges_with_mitigation"`
	SuccessMetrics           []string                 `json:"success_metrics"`
	DecisionFramework        *AIDecisionFramework     `json:"decision_framework"`
	AlternativesConsidered   *string                  `json:"alternatives_considered"`

	// Legacy field (kept for backward compatibility)
	Challenges      []string `json:"challenges"`

	Timeline        *string  `json:"timeline"`
	ResourcesNeeded []string `json:"resources_needed"`
	Status          string   `json:"status"`
}

type AIDependencyEdge struct {
	FromTask       string `json:"from_task"`
	ToTask         string `json:"to_task"`
	DependencyType string `json:"dependency_type"`
}

// RoadmapIntegrationService handles storing AI-generated roadmaps
type RoadmapIntegrationService struct {
	db *gorm.DB
}

// NewRoadmapIntegrationService creates a new service instance
func NewRoadmapIntegrationService() *RoadmapIntegrationService {
	return &RoadmapIntegrationService{
		db: database.DB,
	}
}

// StoreResult represents the result of storing a roadmap
type StoreResult struct {
	Success            bool   `json:"success"`
	SectionsCreated    int    `json:"sections_created"`
	MilestonesCreated  int    `json:"milestones_created"`
	TasksCreated       int    `json:"tasks_created"`
	SubtasksCreated    int    `json:"subtasks_created"`
	DependenciesCreated int   `json:"dependencies_created"`
	ProposalsCreated   int    `json:"proposals_created"`
	ErrorMessage       string `json:"error_message,omitempty"`
}

// StoreAIGeneratedRoadmap stores the complete AI-generated roadmap in the database
func (s *RoadmapIntegrationService) StoreAIGeneratedRoadmap(
	projectID uint,
	roadmapData AIGeneratedRoadmap,
) (*StoreResult, error) {
	result := &StoreResult{Success: false}

	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			log.Printf("Panic recovered in StoreAIGeneratedRoadmap: %v", r)
		}
	}()

	if err := tx.Error; err != nil {
		return result, err
	}

	// Verify project exists
	var project models.Project
	if err := tx.Where("project_id = ?", projectID).First(&project).Error; err != nil {
		tx.Rollback()
		return result, fmt.Errorf("project not found: %w", err)
	}

	// Map to store task title -> task ID for dependencies
	taskIDMap := make(map[string]string)

	// Step 1: Create sections and milestones
	for _, sectionData := range roadmapData.Sections {
		section, err := s.createSection(tx, projectID, sectionData)
		if err != nil {
			tx.Rollback()
			result.ErrorMessage = fmt.Sprintf("failed to create section: %v", err)
			return result, err
		}
		result.SectionsCreated++

		// Step 2: Create milestones for this section
		for milestoneOrder, milestoneData := range sectionData.Milestones {
			milestone, err := s.createMilestone(tx, projectID, section.ID, milestoneData, milestoneOrder)
			if err != nil {
				tx.Rollback()
				result.ErrorMessage = fmt.Sprintf("failed to create milestone: %v", err)
				return result, err
			}
			result.MilestonesCreated++

			// Step 3: Create tasks for this milestone
			for taskOrder, taskData := range milestoneData.Tasks {
				task, err := s.createTask(tx, projectID, milestone.MilestoneID, section.ID, taskData, taskOrder)
				if err != nil {
					tx.Rollback()
					result.ErrorMessage = fmt.Sprintf("failed to create task: %v", err)
					return result, err
				}
				result.TasksCreated++

				// Store task title -> ID mapping for dependencies
				taskIDMap[taskData.Title] = task.ID

				// Step 4: Create subtasks
				for _, subtaskData := range taskData.Subtasks {
					if err := s.createSubtask(tx, task.ID, subtaskData); err != nil {
						tx.Rollback()
						result.ErrorMessage = fmt.Sprintf("failed to create subtask: %v", err)
						return result, err
					}
					result.SubtasksCreated++
				}
			}
		}
	}

	// Step 5: Create task dependencies
	for _, sectionData := range roadmapData.Sections {
		for _, milestoneData := range sectionData.Milestones {
			for _, taskData := range milestoneData.Tasks {
				taskID, exists := taskIDMap[taskData.Title]
				if !exists {
					log.Printf("Warning: Task not found for dependencies: %s", taskData.Title)
					continue
				}

				for _, depTitle := range taskData.Dependencies {
					depTaskID, exists := taskIDMap[depTitle]
					if exists {
						if err := s.createTaskDependency(tx, taskID, depTaskID); err != nil {
							log.Printf("Warning: Failed to create dependency: %v", err)
							// Continue even if dependency creation fails
						} else {
							result.DependenciesCreated++
						}
					} else {
						log.Printf("Warning: Dependency task not found: %s", depTitle)
					}
				}
			}
		}
	}

	// Step 6: Create proposals as ProjectPlans
	for _, proposalData := range roadmapData.Proposals {
		if err := s.createProposal(tx, projectID, proposalData); err != nil {
			log.Printf("Warning: Failed to create proposal: %v", err)
			// Continue even if proposal creation fails
		} else {
			result.ProposalsCreated++
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		result.ErrorMessage = fmt.Sprintf("failed to commit transaction: %v", err)
		return result, err
	}

	result.Success = true
	log.Printf("Successfully stored roadmap for project %d: %d sections, %d milestones, %d tasks, %d subtasks, %d dependencies, %d proposals",
		projectID, result.SectionsCreated, result.MilestonesCreated, result.TasksCreated,
		result.SubtasksCreated, result.DependenciesCreated, result.ProposalsCreated)

	return result, nil
}

func (s *RoadmapIntegrationService) createSection(
	tx *gorm.DB,
	projectID uint,
	sectionData AIRoadmapSection,
) (*models.Section, error) {
	// Handle optional color field
	color := ""
	if sectionData.Color != nil {
		color = *sectionData.Color
	}

	section := &models.Section{
		ProjectID:   fmt.Sprintf("%d", projectID),
		Name:        sectionData.Name,
		Description: &sectionData.Description,
		Order:       sectionData.Order,
		Color:       color,
	}

	if err := tx.Create(section).Error; err != nil {
		return nil, fmt.Errorf("failed to create section: %w", err)
	}

	return section, nil
}

func (s *RoadmapIntegrationService) createMilestone(
	tx *gorm.DB,
	projectID uint,
	sectionID int,
	milestoneData AIMilestone,
	order int,
) (*models.Milestone, error) {
	// Calculate dates if offset provided
	var startDate *time.Time
	var dueDate *time.Time
	if milestoneData.StartOffsetDays != nil {
		start := time.Now().AddDate(0, 0, *milestoneData.StartOffsetDays)
		startDate = &start

		if milestoneData.DurationDays != nil {
			due := start.AddDate(0, 0, *milestoneData.DurationDays)
			dueDate = &due
		}
	}

	sectionIDUint := uint(sectionID)
	sectionOrder := order

	// WorkspaceID is optional - only set for pro users with workspace feature
	milestone := &models.Milestone{
		ProjectID:    projectID,
		WorkspaceID:  nil, // Optional - for pro users only
		Title:        milestoneData.Title,
		Description:  &milestoneData.Description,
		StartDate:    startDate,
		DueDate:      dueDate,
		Status:       milestoneData.Status,
		Priority:     milestoneData.Priority,
		SectionID:    &sectionIDUint,
		SectionOrder: &sectionOrder,
		SortOrder:    order,
	}

	if err := tx.Create(milestone).Error; err != nil {
		return nil, fmt.Errorf("failed to create milestone: %w", err)
	}

	return milestone, nil
}

func (s *RoadmapIntegrationService) createTask(
	tx *gorm.DB,
	projectID uint,
	milestoneID uint,
	sectionID int,
	taskData AITask,
	order int,
) (*models.Task, error) {
	// Generate unique task ID using nanoseconds to avoid collisions
	taskID := fmt.Sprintf("task_%d_%d_%d", time.Now().UnixNano(), milestoneID, order)

	// Marshal tags and assigned_to as JSON
	tagsJSON, _ := json.Marshal(taskData.Tags)
	assignedToJSON, _ := json.Marshal(taskData.AssignedTo)

	task := &models.Task{
		ID:             taskID,
		ProjectID:      fmt.Sprintf("%d", projectID),
		Title:          taskData.Title,
		Description:    taskData.Description,
		Status:         "todo",
		Priority:       taskData.Priority,
		MilestoneID:    &milestoneID,
		SectionID:      &sectionID,
		SectionOrder:   order,
		EstimatedHours: &taskData.EstimatedHours,
		Tags:           datatypes.JSON(tagsJSON),
		AssignedTo:     datatypes.JSON(assignedToJSON),
		CreatedBy:      fmt.Sprintf("%d", projectID), // Use project ID as placeholder
	}

	if err := tx.Create(task).Error; err != nil {
		return nil, fmt.Errorf("failed to create task: %w", err)
	}

	return task, nil
}

func (s *RoadmapIntegrationService) createSubtask(
	tx *gorm.DB,
	parentTaskID string,
	subtaskData AISubtask,
) error {
	// Generate subtask ID
	subtaskID := fmt.Sprintf("subtask_%d_%s", time.Now().UnixNano(), parentTaskID)

	subtask := &models.Subtask{
		ID:           subtaskID,
		ParentTaskID: parentTaskID,
		Title:        subtaskData.Title,
		Description:  subtaskData.Description,
		Status:       "todo",
	}

	if err := tx.Create(subtask).Error; err != nil {
		return fmt.Errorf("failed to create subtask: %w", err)
	}

	return nil
}

func (s *RoadmapIntegrationService) createTaskDependency(
	tx *gorm.DB,
	taskID string,
	dependsOnTaskID string,
) error {
	// Check if dependency already exists
	var existing models.TaskDependency
	err := tx.Where("task_id = ? AND depends_on_task_id = ?", taskID, dependsOnTaskID).
		First(&existing).Error

	if err == nil {
		// Dependency already exists
		return nil
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("error checking existing dependency: %w", err)
	}

	dependency := &models.TaskDependency{
		TaskID:          taskID,
		DependsOnTaskID: dependsOnTaskID,
	}

	if err := tx.Create(dependency).Error; err != nil {
		return fmt.Errorf("failed to create task dependency: %w", err)
	}

	return nil
}

func (s *RoadmapIntegrationService) createProposal(
	tx *gorm.DB,
	projectID uint,
	proposalData AIProposal,
) error {
	// Create plan content structure with enhanced fields
	sections := []map[string]interface{}{
		{
			"id":      "approach",
			"type":    "text",
			"title":   "Approach & Methodology",
			"content": proposalData.Approach,
		},
		{
			"id":    "benefits",
			"type":  "checklist",
			"title": "Benefits",
			"metadata": map[string]interface{}{
				"items": proposalData.Benefits,
			},
		},
	}

	// Add enhanced challenges with mitigation or legacy challenges
	if len(proposalData.ChallengesWithMitigation) > 0 {
		challengeItems := make([]map[string]string, len(proposalData.ChallengesWithMitigation))
		for i, cm := range proposalData.ChallengesWithMitigation {
			challengeItems[i] = map[string]string{
				"challenge":  cm.Challenge,
				"mitigation": cm.Mitigation,
			}
		}
		sections = append(sections, map[string]interface{}{
			"id":    "challenges_mitigation",
			"type":  "challenge_mitigation",
			"title": "Challenges & Risk Mitigation",
			"metadata": map[string]interface{}{
				"items": challengeItems,
			},
		})
	} else if len(proposalData.Challenges) > 0 {
		sections = append(sections, map[string]interface{}{
			"id":    "challenges",
			"type":  "checklist",
			"title": "Challenges & Risks",
			"metadata": map[string]interface{}{
				"items": proposalData.Challenges,
			},
		})
	}

	// Add success metrics if present
	if len(proposalData.SuccessMetrics) > 0 {
		sections = append(sections, map[string]interface{}{
			"id":    "success_metrics",
			"type":  "checklist",
			"title": "Success Metrics",
			"metadata": map[string]interface{}{
				"items": proposalData.SuccessMetrics,
			},
		})
	}

	// Add decision framework if present
	if proposalData.DecisionFramework != nil {
		sections = append(sections, map[string]interface{}{
			"id":    "decision_framework",
			"type":  "structured",
			"title": "Decision Framework",
			"metadata": map[string]interface{}{
				"best_for":  proposalData.DecisionFramework.BestFor,
				"choose_if": proposalData.DecisionFramework.ChooseIf,
				"avoid_if":  proposalData.DecisionFramework.AvoidIf,
			},
		})
	}

	// Add alternatives considered if present
	if proposalData.AlternativesConsidered != nil && *proposalData.AlternativesConsidered != "" {
		sections = append(sections, map[string]interface{}{
			"id":      "alternatives",
			"type":    "text",
			"title":   "Alternative Approaches Considered",
			"content": *proposalData.AlternativesConsidered,
		})
	}

	// Add resources needed
	if len(proposalData.ResourcesNeeded) > 0 {
		sections = append(sections, map[string]interface{}{
			"id":    "resources",
			"type":  "checklist",
			"title": "Resources Needed",
			"metadata": map[string]interface{}{
				"items": proposalData.ResourcesNeeded,
			},
		})
	}

	content := map[string]interface{}{
		"sections": sections,
	}

	contentJSON, err := json.Marshal(content)
	if err != nil {
		return fmt.Errorf("failed to marshal proposal content: %w", err)
	}

	plan := &models.ProjectPlan{
		ProjectID:   projectID,
		Title:       proposalData.Title,
		Description: proposalData.Description,
		PlanType:    "proposal",
		Content:     datatypes.JSON(contentJSON),
		Source:      "ai-generated",
		Status:      proposalData.Status,
	}

	if err := tx.Create(plan).Error; err != nil {
		return fmt.Errorf("failed to create proposal: %w", err)
	}

	return nil
}
