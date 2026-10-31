package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"projectup/models"
	"projectup/repositories"
	"time"

	"gorm.io/datatypes"
)

// GenerateLearningPathWithAI calls the AI agent to generate a personalized learning path
func GenerateLearningPathWithAI(req models.LearningPathRequest) (*models.LearningPath, error) {
	// Get AI agent URL from environment
	aiAgentURL := os.Getenv("AI_AGENT_URL")
	if aiAgentURL == "" {
		aiAgentURL = "http://localhost:8000"
	}

	// Log the AI agent URL for debugging
	fmt.Printf("Calling AI agent at: %s/api/learning/start\n", aiAgentURL)

	// Use unified learning API endpoint
	unifiedRequest := map[string]interface{}{
		"workflow_type":      "course_generation",
		"topic":             req.TopicName,
		"learning_goals":    []string{req.LearningGoals},
		"user_background":   req.UserBackground,
		"preferred_duration": req.EstimatedWeeks * 10, // Convert weeks to hours (assuming 10 hours/week)
		"difficulty_level":  req.Difficulty,
		"max_refinements":   1,
	}
	
	requestJSON, _ := json.Marshal(unifiedRequest)
	
	// Make request to AI agent unified learning endpoint
	resp, err := http.Post(
		fmt.Sprintf("%s/api/learning/start", aiAgentURL),
		"application/json",
		bytes.NewBuffer(requestJSON),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to call AI agent at %s: %w", aiAgentURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("AI agent returned status %d: %s", resp.StatusCode, string(body))
	}

	// Parse the response from unified API
	var aiResponse struct {
		SessionID    string `json:"session_id"`
		WorkflowType string `json:"workflow_type"`
		Status       string `json:"status"`
		Message      string `json:"message"`
		Data struct {
			Course struct {
			Title         string   `json:"title"`
			Description   string   `json:"description"`
			Duration      string   `json:"duration"`
			Difficulty    string   `json:"difficulty"`
			Prerequisites []string `json:"prerequisites"`
			Modules []struct {
				Title       string `json:"title"`
				Description string `json:"description"`
				Duration    string `json:"duration"`
				Lessons     []struct {
					Title       string   `json:"title"`
					Description string   `json:"description"`
					Objectives  []string `json:"objectives"`
					ContentType string   `json:"content_type"`
					Duration    string   `json:"duration"`
					Resources   []models.LearningPathResource `json:"resources"`
				} `json:"lessons"`
			} `json:"modules"`
			EstimatedDuration int `json:"estimated_duration"`
			} `json:"course"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&aiResponse); err != nil {
		return nil, fmt.Errorf("failed to decode AI response: %w", err)
	}

	// Check if the response was successful
	if aiResponse.Status == "error" {
		return nil, fmt.Errorf("failed to generate learning path: %s", aiResponse.Message)
	}

	// Convert AI response to our model
	course := aiResponse.Data.Course
	learningPath := &models.LearningPath{
		UserID:         req.UserID,
		TopicID:        req.TopicID,
		TopicName:      req.TopicName,
		Title:          course.Title,
		Description:    course.Description,
		Duration:       fmt.Sprintf("%d hours", course.EstimatedDuration),
		Difficulty:     course.Difficulty,
		LearningGoals:  req.LearningGoals,
		EstimatedWeeks: req.EstimatedWeeks,
	}

	// Convert prerequisites to JSON
	prereqJSON, _ := json.Marshal(course.Prerequisites)
	learningPath.Prerequisites = datatypes.JSON(prereqJSON)

	// Convert modules
	for i, aiModule := range course.Modules {
		module := models.LearningModule{
			Title:       aiModule.Title,
			Description: aiModule.Description,
			Duration:    aiModule.Duration,
			OrderIndex:  i,
		}

		// Convert lessons to resources and tasks
		var resources []models.LearningPathResource
		for j, lesson := range aiModule.Lessons {
			// Add all lesson resources
			if len(lesson.Resources) > 0 {
				resources = append(resources, lesson.Resources...)
			} else {
				// Create a default resource if none provided
				defaultResource := models.LearningPathResource{
					Title:      lesson.Title,
					URL:        fmt.Sprintf("https://example.com/lesson_%d_%d", i, j),
					Type:       lesson.ContentType,
					Provider:   "ProjectUp",
					Difficulty: learningPath.Difficulty,
					Duration:   lesson.Duration,
					Cost:       "Free",
				}
				resources = append(resources, defaultResource)
			}

			// Create a task for the lesson
			task := models.LearningTask{
				Title:       lesson.Title,
				Description: lesson.Description,
				Difficulty:  learningPath.Difficulty,
				OrderIndex:  j,
			}
			module.Tasks = append(module.Tasks, task)
		}

		// Convert resources to JSON
		resourcesJSON, _ := json.Marshal(resources)
		module.Resources = datatypes.JSON(resourcesJSON)

		learningPath.Modules = append(learningPath.Modules, module)
	}

	return learningPath, nil
}

// PollCourseStatus polls the AI agent for course generation status and updates the learning path
func PollCourseStatus(pathID uint, requestID string) {
	aiAgentURL := os.Getenv("AI_AGENT_URL")
	if aiAgentURL == "" {
		aiAgentURL = "http://localhost:8888"
	}

	repo := repositories.NewLearningRepository()
	maxAttempts := 60 // Poll for up to 5 minutes (5 second intervals)
	pollInterval := 5 * time.Second

	for attempt := 0; attempt < maxAttempts; attempt++ {
		time.Sleep(pollInterval)

		// Get course status from AI agent
		resp, err := http.Get(fmt.Sprintf("%s/api/courses/status/%s", aiAgentURL, requestID))
		if err != nil {
			fmt.Printf("Error polling course status: %v\n", err)
			continue
		}

		if resp.StatusCode != http.StatusOK {
			resp.Body.Close()
			continue
		}

		var statusResponse struct {
			Request struct {
				ID     string `json:"id"`
				Status string `json:"status"`
			} `json:"request"`
			Course *struct {
				ID          string `json:"id"`
				Title       string `json:"title"`
				Description string `json:"description"`
				Duration    int    `json:"duration_weeks"`
				Difficulty  string `json:"difficulty_level"`
				Sections    []struct {
					Title         string `json:"title"`
					Description   string `json:"description"`
					WeekNumber    int    `json:"week_number"`
					Concepts      []map[string]interface{} `json:"concepts"`
					EstimatedHours int   `json:"estimated_hours"`
				} `json:"sections"`
				LearningPath map[string]interface{} `json:"learning_path"`
			} `json:"course"`
		}

		if err := json.NewDecoder(resp.Body).Decode(&statusResponse); err != nil {
			resp.Body.Close()
			fmt.Printf("Error decoding status response: %v\n", err)
			continue
		}
		resp.Body.Close()

		// Check if generation is complete
		if statusResponse.Request.Status == "generated" && statusResponse.Course != nil {
			// Update learning path with generated course
			learningPath := &models.LearningPath{
				ID:             pathID,
				Title:          statusResponse.Course.Title,
				Description:    statusResponse.Course.Description,
				Duration:       fmt.Sprintf("%d weeks", statusResponse.Course.Duration),
				Difficulty:     statusResponse.Course.Difficulty,
				Status:         "ready",
				EstimatedWeeks: statusResponse.Course.Duration,
			}

			// Convert modules from AI agent course sections
			for _, section := range statusResponse.Course.Sections {
				module := models.LearningModule{
					Title:       section.Title,
					Description: section.Description,
					Duration:    fmt.Sprintf("%d hours", section.EstimatedHours),
					OrderIndex:  section.WeekNumber - 1,
				}

				// Add a default task for each section
				task := models.LearningTask{
					Title:       fmt.Sprintf("Complete %s", section.Title),
					Description: section.Description,
					Difficulty:  learningPath.Difficulty,
					OrderIndex:  0,
				}
				module.Tasks = append(module.Tasks, task)

				// Convert concepts to resources
				var resources []models.LearningPathResource
				for _, concept := range section.Concepts {
					if name, ok := concept["name"].(string); ok {
						resource := models.LearningPathResource{
							Title:      name,
							Type:       "article",
							Provider:   "AI Generated",
							Difficulty: learningPath.Difficulty,
							Cost:       "Free",
						}
						if desc, ok := concept["description"].(string); ok {
							resource.Description = desc
						}
						resources = append(resources, resource)
					}
				}

				resourcesJSON, _ := json.Marshal(resources)
				module.Resources = datatypes.JSON(resourcesJSON)

				learningPath.Modules = append(learningPath.Modules, module)
			}

			// Update in database
			if err := repo.UpdateLearningPath(learningPath); err != nil {
				fmt.Printf("Error updating learning path: %v\n", err)
				repo.UpdateLearningPathStatus(pathID, "failed")
			}

			fmt.Printf("Successfully updated learning path %d with course data\n", pathID)
			return
		}

		// Check if generation failed
		if statusResponse.Request.Status == "failed" {
			repo.UpdateLearningPathStatus(pathID, "failed")
			fmt.Printf("Course generation failed for request %s\n", requestID)
			return
		}

		// Continue polling if still generating
		if statusResponse.Request.Status != "generating" && statusResponse.Request.Status != "pending" {
			fmt.Printf("Unknown status: %s\n", statusResponse.Request.Status)
		}
	}

	// Timeout - mark as failed
	repo.UpdateLearningPathStatus(pathID, "failed")
	fmt.Printf("Course generation timed out for request %s\n", requestID)
}