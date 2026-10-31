package services

import (
	"encoding/json"
	"fmt"
	"log"
	"projectup/database"
	"projectup/models"

	"gorm.io/datatypes"
)

// ConvertAIDataToPlans converts AI-generated roadmap and curriculum data into ProjectPlan records
func ConvertAIDataToPlans(projectID uint, roadmap []map[string]interface{}, curriculum interface{}) error {
	db := database.DB

	// 1. Create Roadmap Plan
	if len(roadmap) > 0 {
		roadmapContent := convertRoadmapToPlanContent(roadmap)
		contentJSON, err := json.Marshal(roadmapContent)
		if err != nil {
			log.Printf("Failed to marshal roadmap content: %v", err)
			return err
		}

		roadmapPlan := models.ProjectPlan{
			ProjectID:   projectID,
			Title:       "Project Roadmap",
			Description: "AI-generated implementation roadmap with detailed steps and timelines",
			PlanType:    "roadmap",
			Content:     datatypes.JSON(contentJSON),
			Source:      "ai-generated",
			Status:      "active",
			OrderIndex:  0,
		}

		if err := db.Create(&roadmapPlan).Error; err != nil {
			log.Printf("Failed to create roadmap plan: %v", err)
			return err
		}

		log.Printf("✓ Created roadmap plan for project %d", projectID)
	}

	// 2. Create Curriculum Plan
	if curriculum != nil {
		curriculumContent := convertCurriculumToPlanContent(curriculum)
		contentJSON, err := json.Marshal(curriculumContent)
		if err != nil {
			log.Printf("Failed to marshal curriculum content: %v", err)
			return err
		}

		curriculumPlan := models.ProjectPlan{
			ProjectID:   projectID,
			Title:       "Learning & Curriculum Plan",
			Description: "AI-generated educational goals, skill development, and learning objectives",
			PlanType:    "curriculum",
			Content:     datatypes.JSON(contentJSON),
			Source:      "ai-generated",
			Status:      "active",
			OrderIndex:  1,
		}

		if err := db.Create(&curriculumPlan).Error; err != nil {
			log.Printf("Failed to create curriculum plan: %v", err)
			return err
		}

		log.Printf("✓ Created curriculum plan for project %d", projectID)
	}

	return nil
}

// convertRoadmapToPlanContent converts roadmap data to plan content structure
func convertRoadmapToPlanContent(roadmap []map[string]interface{}) models.PlanContent {
	sections := []models.PlanSection{}

	for i, step := range roadmap {
		section := models.PlanSection{
			ID:      fmt.Sprintf("step-%d", i),
			Type:    "roadmap-step",
			Title:   getString(step, "title"),
			Content: getString(step, "description"),
			Metadata: map[string]interface{}{
				"timeEstimate": getString(step, "timeEstimate"),
				"stepNumber":   i + 1,
				"resources":    step["resources"],
			},
		}
		sections = append(sections, section)
	}

	return models.PlanContent{
		Sections: sections,
	}
}

// convertCurriculumToPlanContent converts curriculum data to plan content structure
func convertCurriculumToPlanContent(curriculum interface{}) models.PlanContent {
	sections := []models.PlanSection{}

	curriculumMap, ok := curriculum.(map[string]interface{})
	if !ok {
		log.Printf("Warning: curriculum is not a map")
		return models.PlanContent{Sections: sections}
	}

	// Categories section
	if categories, ok := curriculumMap["categories"].([]interface{}); ok && len(categories) > 0 {
		sections = append(sections, models.PlanSection{
			ID:      "categories",
			Type:    "category-breakdown",
			Title:   "Project Categories",
			Content: "",
			Metadata: map[string]interface{}{
				"categories": categories,
			},
		})
	}

	// Skills section
	if skills, ok := curriculumMap["skills"].([]interface{}); ok && len(skills) > 0 {
		sections = append(sections, models.PlanSection{
			ID:      "skills",
			Type:    "skills-list",
			Title:   "Skills Development",
			Content: "",
			Metadata: map[string]interface{}{
				"skills": skills,
			},
		})
	}

	// Learning goals section
	if goals, ok := curriculumMap["learningGoals"].([]interface{}); ok && len(goals) > 0 {
		sections = append(sections, models.PlanSection{
			ID:      "learning-goals",
			Type:    "goals-list",
			Title:   "Learning Goals",
			Content: "",
			Metadata: map[string]interface{}{
				"goals": goals,
			},
		})
	}

	// Topics section
	if topics, ok := curriculumMap["topics"].([]interface{}); ok && len(topics) > 0 {
		sections = append(sections, models.PlanSection{
			ID:      "topics",
			Type:    "topics-list",
			Title:   "Topics Covered",
			Content: "",
			Metadata: map[string]interface{}{
				"topics": topics,
			},
		})
	}

	return models.PlanContent{
		Sections: sections,
	}
}

// ConvertChecklistToTasks converts checklist items to milestone/task records
func ConvertChecklistToTasks(projectID uint, checklist []models.ChecklistItem) error {
	db := database.DB

	for i, item := range checklist {
		// Convert string priority to int
		priority := 0
		switch item.Priority {
		case "High":
			priority = 3
		case "Medium":
			priority = 2
		case "Low":
			priority = 1
		}

		// Convert string to pointer
		category := item.Category

		task := models.Milestone{
			ProjectID: projectID,
			Title:     item.Description,
			Category:  &category,
			Priority:  priority,
			Status:    "pending",
			SortOrder: i,
			Completed: false,
		}

		if err := db.Create(&task).Error; err != nil {
			log.Printf("Failed to create task from checklist: %v", err)
			return err
		}
	}

	log.Printf("✓ Created %d tasks from checklist for project %d", len(checklist), projectID)
	return nil
}

// ExtractResourcesFromRoadmap extracts learning resources from roadmap steps
func ExtractResourcesFromRoadmap(projectID uint, roadmap []map[string]interface{}) error {
	db := database.DB
	resourceCount := 0

	for _, step := range roadmap {
		stepTitle := getString(step, "title")

		if resources, ok := step["resources"].([]interface{}); ok {
			for _, resData := range resources {
				res, ok := resData.(map[string]interface{})
				if !ok {
					continue
				}

				// Convert strings to pointers
				url := getString(res, "url")
				category := "AI Recommended"
				description := fmt.Sprintf("Resource for: %s", stepTitle)

				resource := models.ProjectResource{
					ProjectID:    projectID,
					Title:        getString(res, "title"),
					URL:          &url,
					ResourceType: getString(res, "type"),
					Category:     &category,
					Description:  &description,
				}

				if err := db.Create(&resource).Error; err != nil {
					log.Printf("Failed to create resource: %v", err)
					continue
				}

				resourceCount++
			}
		}
	}

	if resourceCount > 0 {
		log.Printf("✓ Created %d resources from roadmap for project %d", resourceCount, projectID)
	}

	return nil
}

// Helper function to safely get string from map
func getString(m map[string]interface{}, key string) string {
	if val, ok := m[key]; ok && val != nil {
		return fmt.Sprintf("%v", val)
	}
	return ""
}
