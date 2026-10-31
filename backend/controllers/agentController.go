package controllers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"

	"projectup/models"
	"projectup/services"
	"projectup/utils/prompts"

	"github.com/gin-gonic/gin"
)

type AgentController struct {
	agentService *services.AgentService
}

func NewAgentController() *AgentController {
	return &AgentController{
		agentService: services.NewAgentService(),
	}
}

func (c *AgentController) CreateAgent(ctx *gin.Context) {
	var config models.AgentConfig
	if err := ctx.ShouldBindJSON(&config); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	configMap := map[string]interface{}{
		"name":        config.Name,
		"provider":    config.Provider,
		"model":       config.Model,
		"temperature": config.Temperature,
		"max_tokens":  config.MaxTokens,
		"memory_size": config.MemorySize,
	}

	if err := c.agentService.CreateAgent(configMap); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Agent created successfully"})
}

func (c *AgentController) SendMessage(ctx *gin.Context) {
	agentName := ctx.Param("name")
	var request models.AgentRequest

	if err := ctx.ShouldBindJSON(&request); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	response, err := c.agentService.SendMessage(agentName, request.Message)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, models.AgentResponse{Response: response})
}

// GetProjectIdeas gets project ideas based on user preferences
func (c *AgentController) GetProjectIdeas(ctx *gin.Context) {
	// Log request for debugging
	fmt.Println("GetProjectIdeas called")

	// Parse request
	var request struct {
		Skills              []string `json:"skills"`
		Interests           []string `json:"interests"`
		Goal                string   `json:"goal"`
		Reference           string   `json:"reference"`
		HoursPerWeek        string   `json:"hoursPerWeek"`
		PreferredDifficulty string   `json:"preferredDifficulty"`
		PreferredTimeframe  string   `json:"preferredTimeframe"`
		Deadline            string   `json:"deadline"`
		CustomTimePeriod    string   `json:"customTimePeriod"`
		NumIdeas            int      `json:"numIdeas"`
	}

	if err := ctx.ShouldBindJSON(&request); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Default number of ideas
	if request.NumIdeas == 0 {
		request.NumIdeas = 5
	}

	// Format the request for the new Python agent API
	requestData := map[string]interface{}{
		"skills":              request.Skills,
		"interests":           request.Interests,
		"goal":                request.Goal,
		"reference":           request.Reference,
		"hoursPerWeek":        request.HoursPerWeek,
		"preferredDifficulty": request.PreferredDifficulty,
		"preferredTimeframe":  request.PreferredTimeframe,
		"deadline":            request.Deadline,
		"customTimePeriod":    request.CustomTimePeriod,
		"numIdeas":            request.NumIdeas,
	}

	fmt.Printf("Calling project assistant API with: %+v\n", requestData)

	// Call the new project assistant API directly
	result, err := c.agentService.CallProjectAssistantAPI("project-ideas", requestData)
	if err != nil {
		fmt.Printf("Error from AI service: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "AI service error", "details": err.Error()})
		return
	}

	// Parse the new API response format
	var apiResponse struct {
		Response interface{} `json:"response"`
		Status   string      `json:"status"`
		Message  string      `json:"message"`
	}

	if err := json.Unmarshal([]byte(result), &apiResponse); err != nil {
		fmt.Printf("Error parsing API response: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse API response"})
		return
	}

	// Return the response directly - the frontend expects it in this format
	ctx.JSON(http.StatusOK, apiResponse)
}

// extractProjectIdeasWithRegex tries to extract project ideas from malformed JSON using regex
func extractProjectIdeasWithRegex(input string) ([]models.ProjectIdea, error) {
	// Try to find project ideas sections with regex
	ideaPattern := regexp.MustCompile(`(?s)"title"\s*:\s*"([^"]+)".*?"description"\s*:\s*"([^"]+)".*?"difficulty"\s*:\s*"([^"]+)".*?"estimatedTime"\s*:\s*"([^"]+)"`)
	matches := ideaPattern.FindAllStringSubmatch(input, -1)

	if len(matches) == 0 {
		return nil, fmt.Errorf("no project ideas found with regex")
	}

	var ideas []models.ProjectIdea
	for _, match := range matches {
		if len(match) < 5 {
			continue // Not enough fields captured
		}

		// Create a basic project idea with the fields we could extract
		idea := models.ProjectIdea{
			Title:            match[1],
			Description:      match[2],
			Difficulty:       match[3],
			EstimatedTime:    match[4],
			KeyTechnologies:  []string{"Extracted from response"},
			KeyFeatures:      []string{"Features not fully parsed"},
			LearningOutcomes: []string{"Learning outcomes not fully parsed"},
		}

		// Set default estimated hours per week based on difficulty
		switch idea.Difficulty {
		case "Beginner":
			idea.EstimatedHoursPerWeek = "3-5 hours/week"
		case "Intermediate":
			idea.EstimatedHoursPerWeek = "5-8 hours/week"
		case "Advanced":
			idea.EstimatedHoursPerWeek = "8-12 hours/week"
		default:
			idea.EstimatedHoursPerWeek = "4-8 hours/week"
		}

		// Try to extract estimated hours per week if available
		hoursPattern := regexp.MustCompile(`(?s)"estimatedHoursPerWeek"\s*:\s*"([^"]+)"`)
		hoursMatch := hoursPattern.FindStringSubmatch(input)
		if len(hoursMatch) > 1 {
			idea.EstimatedHoursPerWeek = hoursMatch[1]
		}

		// Try to extract key technologies
		techPattern := regexp.MustCompile(`(?s)"keyTechnologies"\s*:\s*\[(.*?)\]`)
		techMatch := techPattern.FindStringSubmatch(input)
		if len(techMatch) > 1 {
			techsStr := techMatch[1]
			techItems := regexp.MustCompile(`"([^"]+)"`).FindAllStringSubmatch(techsStr, -1)
			techs := []string{}
			for _, techItem := range techItems {
				if len(techItem) > 1 {
					techs = append(techs, techItem[1])
				}
			}
			if len(techs) > 0 {
				idea.KeyTechnologies = techs
			}
		}

		// Try to extract key features
		featPattern := regexp.MustCompile(`(?s)"keyFeatures"\s*:\s*\[(.*?)\]`)
		featMatch := featPattern.FindStringSubmatch(input)
		if len(featMatch) > 1 {
			featsStr := featMatch[1]
			featItems := regexp.MustCompile(`"([^"]+)"`).FindAllStringSubmatch(featsStr, -1)
			feats := []string{}
			for _, featItem := range featItems {
				if len(featItem) > 1 {
					feats = append(feats, featItem[1])
				}
			}
			if len(feats) > 0 {
				idea.KeyFeatures = feats
			}
		}

		// Try to extract learning outcomes
		// Modified to handle truncated JSON by using a more forgiving regex
		outcomePattern := regexp.MustCompile(`(?s)"learningOutcomes"\s*:\s*\[(.*?)(\]|$)`)
		outcomeMatch := outcomePattern.FindStringSubmatch(input)
		if len(outcomeMatch) > 1 {
			outcomesStr := outcomeMatch[1]
			// Use a more lenient pattern that can find quoted strings even if they're not properly terminated
			outcomeItems := regexp.MustCompile(`"([^"]+)(?:"|$)`).FindAllStringSubmatch(outcomesStr, -1)
			outcomes := []string{}
			for _, outcomeItem := range outcomeItems {
				if len(outcomeItem) > 1 {
					outcomes = append(outcomes, outcomeItem[1])
				}
			}
			if len(outcomes) > 0 {
				idea.LearningOutcomes = outcomes
			}
		}

		ideas = append(ideas, idea)
	}

	if len(ideas) == 0 {
		return nil, fmt.Errorf("failed to extract any complete project ideas")
	}

	return ideas, nil
}

// mapToProjectIdea converts a map to a ProjectIdea struct
func mapToProjectIdea(data map[string]interface{}) (models.ProjectIdea, error) {
	idea := models.ProjectIdea{}

	// Extract title
	if title, ok := data["title"].(string); ok {
		idea.Title = title
	} else {
		return idea, fmt.Errorf("missing or invalid title")
	}

	// Extract description
	if desc, ok := data["description"].(string); ok {
		idea.Description = desc
	} else {
		return idea, fmt.Errorf("missing or invalid description")
	}

	// Extract difficulty
	if diff, ok := data["difficulty"].(string); ok {
		idea.Difficulty = diff
	} else {
		idea.Difficulty = "Intermediate" // Default value
	}

	// Extract estimatedTime
	if est, ok := data["estimatedTime"].(string); ok {
		idea.EstimatedTime = est
	} else {
		idea.EstimatedTime = "Varies" // Default value
	}

	// Extract estimatedHoursPerWeek
	if hours, ok := data["estimatedHoursPerWeek"].(string); ok {
		idea.EstimatedHoursPerWeek = hours
	} else {
		// Default value based on the difficulty
		switch idea.Difficulty {
		case "Beginner":
			idea.EstimatedHoursPerWeek = "3-5 hours/week"
		case "Intermediate":
			idea.EstimatedHoursPerWeek = "5-8 hours/week"
		case "Advanced":
			idea.EstimatedHoursPerWeek = "8-12 hours/week"
		default:
			idea.EstimatedHoursPerWeek = "4-8 hours/week"
		}
	}

	// Extract keyTechnologies
	idea.KeyTechnologies = []string{}
	if techs, ok := data["keyTechnologies"].([]interface{}); ok {
		for _, tech := range techs {
			if techStr, ok := tech.(string); ok {
				idea.KeyTechnologies = append(idea.KeyTechnologies, techStr)
			}
		}
	}

	// Extract keyFeatures
	idea.KeyFeatures = []string{}
	if feats, ok := data["keyFeatures"].([]interface{}); ok {
		for _, feat := range feats {
			if featStr, ok := feat.(string); ok {
				idea.KeyFeatures = append(idea.KeyFeatures, featStr)
			}
		}
	}

	// Extract learningOutcomes
	idea.LearningOutcomes = []string{}
	if outcomes, ok := data["learningOutcomes"].([]interface{}); ok {
		for _, outcome := range outcomes {
			if outcomeStr, ok := outcome.(string); ok {
				idea.LearningOutcomes = append(idea.LearningOutcomes, outcomeStr)
			}
		}
	}

	// Ensure arrays are not nil
	if idea.KeyTechnologies == nil {
		idea.KeyTechnologies = []string{"Not specified"}
	}
	if idea.KeyFeatures == nil {
		idea.KeyFeatures = []string{"Not specified"}
	}
	if idea.LearningOutcomes == nil {
		idea.LearningOutcomes = []string{"Not specified"}
	}

	return idea, nil
}

// GetProjectRoadmap handles requests for generating a roadmap for a project idea
func (c *AgentController) GetProjectRoadmap(ctx *gin.Context) {
	// Log request for debugging
	fmt.Println("GetProjectRoadmap called")

	var request struct {
		Title       string   `json:"title"`
		Description string   `json:"description"`
		KeyFeatures []string `json:"keyFeatures"`
		Difficulty  string   `json:"difficulty"`
		SessionID   string   `json:"sessionId"`
	}

	if err := ctx.ShouldBindJSON(&request); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Ensure the project-assistant agent exists
	err := c.ensureAgentExists()
	if err != nil {
		fmt.Printf("Failed to create agent: %v\n", err)
		// Continue anyway - we'll try to use existing agent
	}

	// Format the request for the Python agent API
	requestData := map[string]interface{}{
		"title":            request.Title,
		"description":      request.Description,
		"difficulty_level": request.Difficulty,
	}

	// Include key features if provided
	if len(request.KeyFeatures) > 0 {
		requestData["key_features"] = request.KeyFeatures
	}

	// Include session ID if provided
	if request.SessionID != "" {
		requestData["session_id"] = request.SessionID
	}

	// Call the agent using the session-based endpoint
	result, sessionID, err := c.agentService.SendSessionBasedRequest("project-assistant", "project_roadmap", requestData)
	if err != nil {
		fmt.Printf("Error from AI service: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "AI service error"})
		return
	}

	// Clean up the response to handle potential markdown formatting
	cleanedResponse := cleanJSONResponse(result)

	// Try to fix common JSON issues
	fixedJSON := fixJSONParsingIssues(cleanedResponse)

	// Try to parse the response
	var roadmapResponse models.RoadmapResponse
	err = json.Unmarshal([]byte(fixedJSON), &roadmapResponse)
	if err != nil {
		// Try our existing recover methods
		// [existing recover code here]

		// If all parsing fails, return the raw response with session ID
		ctx.JSON(http.StatusOK, gin.H{
			"response":  fixedJSON,
			"sessionId": sessionID,
			"warning":   "Could not parse structured JSON",
		})
		return
	}

	// Successfully parsed, return with session ID
	ctx.JSON(http.StatusOK, gin.H{
		"response":  roadmapResponse,
		"sessionId": sessionID,
	})
}

// GetBasicRoadmap handles requests for generating a roadmap without resources
func (c *AgentController) GetBasicRoadmap(ctx *gin.Context) {
	var request struct {
		Title       string `json:"title"`
		Description string `json:"description"`
	}

	if err := ctx.ShouldBindJSON(&request); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Ensure the project-assistant agent exists
	err := c.ensureAgentExists()
	if err != nil {
		fmt.Printf("Failed to create agent: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to create agent: %v", err)})
		return
	}

	// Build the prompt using the template
	prompt := fmt.Sprintf(
		prompts.BasicRoadmapPrompt,
		request.Title,
		request.Description,
	)

	// Send the prompt to the project-assistant agent
	response, err := c.agentService.SendMessage("project-assistant", prompt)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Parse the response into a BasicRoadmapResponse
	var roadmapResponse models.BasicRoadmapResponse
	if err := json.Unmarshal([]byte(response), &roadmapResponse); err != nil {
		// If parsing fails, return the raw response
		ctx.JSON(http.StatusOK, models.AgentResponse{Response: response})
		return
	}

	// Return the structured response
	ctx.JSON(http.StatusOK, gin.H{"response": roadmapResponse})
}

// GetRoadmapResources handles requests for generating resources for roadmap steps
func (c *AgentController) GetRoadmapResources(ctx *gin.Context) {
	var request struct {
		Title       string                    `json:"title"`
		Description string                    `json:"description"`
		Steps       []models.BasicRoadmapStep `json:"steps"`
	}

	if err := ctx.ShouldBindJSON(&request); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Ensure the project-assistant agent exists
	err := c.ensureAgentExists()
	if err != nil {
		fmt.Printf("Failed to create agent: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to create agent: %v", err)})
		return
	}

	// Format the roadmap steps as a string for the prompt
	var stepsText strings.Builder
	for i, step := range request.Steps {
		stepsText.WriteString(fmt.Sprintf("%d. %s: %s\n", i+1, step.Title, step.Description))
	}

	// Build the prompt using the template
	prompt := fmt.Sprintf(
		prompts.RoadmapResourcesPrompt,
		request.Title,
		request.Description,
		stepsText.String(),
	)

	// Send the prompt to the project-assistant agent
	response, err := c.agentService.SendMessage("project-assistant", prompt)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Parse the response into a RoadmapResourcesResponse
	var resourcesResponse models.RoadmapResourcesResponse
	if err := json.Unmarshal([]byte(response), &resourcesResponse); err != nil {
		// If parsing fails, return the raw response
		ctx.JSON(http.StatusOK, models.AgentResponse{Response: response})
		return
	}

	// Return the structured response
	ctx.JSON(http.StatusOK, gin.H{"response": resourcesResponse})
}

// GetEnhancedRoadmap handles requests for generating a roadmap with curriculum alignment and checklist
func (c *AgentController) GetEnhancedRoadmap(ctx *gin.Context) {
	// Read the request body
	body, err := io.ReadAll(ctx.Request.Body)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Could not read request body"})
		return
	}

	// Parse the request
	var request struct {
		Title       string   `json:"title"`
		Description string   `json:"description"`
		Difficulty  string   `json:"difficulty"`
		ProjectType string   `json:"projectType"`
		KeyFeatures []string `json:"keyFeatures"`
	}

	if err := json.Unmarshal(body, &request); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Check if agent exists
	agentName := "project-assistant"
	fmt.Println("GetEnhancedRoadmap called")
	err = c.ensureAgentExists()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Send the request to the agent service
	fmt.Println("Project assistant agent already exists")
	response, sessionID, err := c.agentService.SendSessionBasedRequest(agentName, "enhanced-roadmap", map[string]interface{}{
		"title":            request.Title,
		"description":      request.Description,
		"difficulty_level": request.Difficulty,
		"key_features":     request.KeyFeatures,
		"project_type":     request.ProjectType,
	})

	if err != nil {
		fmt.Printf("Error getting enhanced roadmap: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate enhanced roadmap"})
		return
	}

	// Try to parse the agent's response
	var agentResponse map[string]interface{}
	err = json.Unmarshal([]byte(response), &agentResponse)
	if err != nil {
		fmt.Printf("Error parsing agent response: %v\n", err)
		// Handle JSON parsing error - try to extract valid JSON
		response = fixJSONParsingIssues(response)
		err = json.Unmarshal([]byte(response), &agentResponse)
		if err != nil {
			fmt.Printf("JSON still invalid after fixes: %v\n", err)
			// Return minimal valid JSON as fallback
			fmt.Println("Returning minimal valid JSON as fallback")

			// Fallback to generating roadmap, curriculum, and checklist separately
			fmt.Println("generate roadmap, curriculum, checklist seprarately")

			// Try to transform the agent's response to the expected format
			// First, try to extract the roadmap, curriculum and checklist from the agent's response
			var transformedResponse models.ProjectRoadmapWithChecklist

			// Try to extract roadmap steps
			if roadmapArray, ok := agentResponse["roadmap"].([]interface{}); ok {
				steps := make([]models.RoadmapStep, 0)

				for _, step := range roadmapArray {
					stepMap, isMap := step.(map[string]interface{})
					if !isMap {
						continue
					}

					resources := make([]models.RoadmapResource, 0)
					if learningResources, hasResources := stepMap["learningResources"].([]interface{}); hasResources {
						for _, res := range learningResources {
							resString, isString := res.(string)
							if !isString {
								continue
							}

							// Extract URL and type
							resourceURL := resString
							resourceType := "Article"
							if strings.Contains(resString, "youtube.com") || strings.Contains(resString, "vimeo.com") {
								resourceType = "Video"
							} else if strings.Contains(resString, "docs") || strings.Contains(resString, "documentation") {
								resourceType = "Documentation"
							}

							title := resourceURL
							if startIdx := strings.Index(resourceURL, "("); startIdx != -1 {
								if endIdx := strings.Index(resourceURL, ")"); endIdx != -1 && endIdx > startIdx {
									title = resourceURL[startIdx+1 : endIdx]
									resourceURL = strings.TrimSpace(resourceURL[0:startIdx])
								}
							}

							resources = append(resources, models.RoadmapResource{
								Title: title,
								URL:   resourceURL,
								Type:  resourceType,
							})
						}
					}

					newStep := models.RoadmapStep{
						Title:        stepMap["title"].(string),
						Description:  stepMap["description"].(string),
						TimeEstimate: stepMap["estimatedTime"].(string),
						Resources:    resources,
					}

					steps = append(steps, newStep)
				}

				transformedResponse.Roadmap = models.Roadmap{
					Steps: steps,
				}
			}

			// Try to extract curriculum alignment
			if curriculum, ok := agentResponse["curriculumAlignment"].(map[string]interface{}); ok {
				var categories []models.TopicCategory
				var skills []models.CurriculumSkill

				if topics, hasCat := curriculum["mainTopicsCovered"].([]interface{}); hasCat {
					cat := models.TopicCategory{
						Name:          "Main Topics",
						Subcategories: make([]string, 0),
					}

					for _, topic := range topics {
						topicStr, isStr := topic.(string)
						if isStr {
							cat.Subcategories = append(cat.Subcategories, topicStr)
						}
					}

					categories = append(categories, cat)
				}

				if specificSkills, hasSkills := curriculum["specificSkillsDeveloped"].([]interface{}); hasSkills {
					for idx, skill := range specificSkills {
						skillStr, isStr := skill.(string)
						if isStr {
							// Assign difficulty level based on position
							level := "Intermediate"
							if idx == 0 {
								level = "Beginner"
							} else if idx >= len(specificSkills)-1 {
								level = "Advanced"
							}

							skills = append(skills, models.CurriculumSkill{
								Name:        skillStr,
								Description: "Developed through the project",
								Level:       level,
							})
						}
					}
				}

				transformedResponse.CurriculumAlignment = models.CurriculumAlignment{
					Topics:     extractStringArray(curriculum, "mainTopicsCovered"),
					Categories: categories,
					Skills:     skills,
				}
			}

			// Try to extract checklist
			if checklist, ok := agentResponse["projectChecklist"].([]interface{}); ok {
				items := make([]models.ChecklistItem, 0)

				for _, item := range checklist {
					itemMap, isMap := item.(map[string]interface{})
					if !isMap {
						continue
					}

					description, _ := itemMap["item"].(string)
					category, _ := itemMap["category"].(string)
					priority, _ := itemMap["priority"].(string)

					items = append(items, models.ChecklistItem{
						Description: description,
						Category:    category,
						Priority:    priority,
					})
				}

				transformedResponse.Checklist = models.ProjectChecklist{
					Items: items,
				}
			}

			// If the transformation was successful, convert it to JSON and return
			if len(transformedResponse.Roadmap.Steps) > 0 {
				jsonData, err := json.Marshal(models.ProjectRoadmapWithChecklistResponse{
					Response: transformedResponse,
				})

				if err == nil {
					ctx.Data(http.StatusOK, "application/json", jsonData)
					return
				}
			}

			// If transformation failed, return a minimal fallback
			ctx.JSON(http.StatusOK, gin.H{
				"response": models.ProjectRoadmapWithChecklist{
					Roadmap: models.Roadmap{
						Steps: []models.RoadmapStep{
							{
								Title:        "Error Generating Roadmap",
								Description:  "We encountered an error while generating your roadmap. Please try again.",
								TimeEstimate: "N/A",
								Resources:    []models.RoadmapResource{},
							},
						},
					},
					Checklist: models.ProjectChecklist{
						Items: []models.ChecklistItem{
							{
								Description: "Error occurred - simplified roadmap generated",
								Category:    "Requirements",
								Priority:    "High",
							},
						},
					},
				},
			})
			return
		}
	}

	// Return the response
	ctx.JSON(http.StatusOK, gin.H{
		"response":   response,
		"session_id": sessionID,
	})
}

// GetRoadmapSteps handles requests for generating just the roadmap steps
func (c *AgentController) GetRoadmapSteps(ctx *gin.Context) {
	// Parse the request
	var request struct {
		Title       string   `json:"title"`
		Description string   `json:"description"`
		Difficulty  string   `json:"difficulty"`
		ProjectType string   `json:"projectType"`
		KeyFeatures []string `json:"keyFeatures"`
	}

	if err := ctx.ShouldBindJSON(&request); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Format the request for the new Python agent API
	requestData := map[string]interface{}{
		"title":       request.Title,
		"description": request.Description,
		"difficulty":  request.Difficulty,
		"projectType": request.ProjectType,
		"keyFeatures": request.KeyFeatures,
	}

	// Call the new project assistant API directly
	result, err := c.agentService.CallProjectAssistantAPI("roadmap-steps", requestData)
	if err != nil {
		fmt.Printf("Error from AI service: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "AI service error"})
		return
	}

	// Parse and return the response
	var apiResponse interface{}
	if err := json.Unmarshal([]byte(result), &apiResponse); err != nil {
		fmt.Printf("Error parsing API response: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse API response"})
		return
	}

	ctx.JSON(http.StatusOK, apiResponse)
}

// GetCurriculumAlignment handles requests for generating just the curriculum alignment
func (c *AgentController) GetCurriculumAlignment(ctx *gin.Context) {
	// Parse the request
	var request struct {
		Title       string   `json:"title"`
		Description string   `json:"description"`
		Difficulty  string   `json:"difficulty"`
		ProjectType string   `json:"projectType"`
		KeyFeatures []string `json:"keyFeatures"`
	}

	if err := ctx.ShouldBindJSON(&request); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Format the request for the new Python agent API
	requestData := map[string]interface{}{
		"title":       request.Title,
		"description": request.Description,
		"difficulty":  request.Difficulty,
		"projectType": request.ProjectType,
		"keyFeatures": request.KeyFeatures,
	}

	// Call the new project assistant API directly
	result, err := c.agentService.CallProjectAssistantAPI("curriculum-alignment", requestData)
	if err != nil {
		fmt.Printf("Error from AI service: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "AI service error"})
		return
	}

	// Parse and return the response
	var apiResponse interface{}
	if err := json.Unmarshal([]byte(result), &apiResponse); err != nil {
		fmt.Printf("Error parsing API response: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse API response"})
		return
	}

	ctx.JSON(http.StatusOK, apiResponse)
}

// GetProjectChecklist handles requests for generating just the project checklist
func (c *AgentController) GetProjectChecklist(ctx *gin.Context) {
	// Parse the request
	var request struct {
		Title       string   `json:"title"`
		Description string   `json:"description"`
		Difficulty  string   `json:"difficulty"`
		ProjectType string   `json:"projectType"`
		KeyFeatures []string `json:"keyFeatures"`
	}

	if err := ctx.ShouldBindJSON(&request); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Format the request for the new Python agent API
	requestData := map[string]interface{}{
		"title":       request.Title,
		"description": request.Description,
		"difficulty":  request.Difficulty,
		"projectType": request.ProjectType,
		"keyFeatures": request.KeyFeatures,
	}

	// Call the new project assistant API directly
	result, err := c.agentService.CallProjectAssistantAPI("project-checklist", requestData)
	if err != nil {
		fmt.Printf("Error from AI service: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "AI service error"})
		return
	}

	// Parse and return the response
	var apiResponse interface{}
	if err := json.Unmarshal([]byte(result), &apiResponse); err != nil {
		fmt.Printf("Error parsing API response: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse API response"})
		return
	}

	ctx.JSON(http.StatusOK, apiResponse)
}

// Helper function to extract string arrays from map
func extractStringArray(data map[string]interface{}, key string) []string {
	result := []string{}
	if val, ok := data[key].([]interface{}); ok {
		for _, v := range val {
			if str, isStr := v.(string); isStr {
				result = append(result, str)
			}
		}
	}
	return result
}

// ensureAgentExists checks if the "project-assistant" agent exists and creates it if not
func (c *AgentController) ensureAgentExists() error {
	// Try to get agents, but continue even if this fails
	agents, err := c.agentService.ListAgents()
	if err != nil {
		fmt.Printf("Error listing agents (this is expected on first run): %v\n", err)
		// Continue anyway, we'll try to create the agent
	} else {
		// Check if the project-assistant agent already exists
		for _, agent := range agents {
			if agent == "project-assistant" {
				fmt.Println("Project assistant agent already exists")
				return nil
			}
		}
	}

	fmt.Println("Project assistant agent does not exist, creating...")

	// Try Vertex AI first
	vertexConfig := map[string]interface{}{
		"name":                    "project-assistant",
		"provider":                "vertex_ai",
		"model":                   "gemini-2.0-flash", // Use a valid model name
		"tokens":                  8000,               // Increased from 4000 to 8000
		"temperature":             0.7,
		"enable_url_search":       true,
		"enable_image_processing": true,
	}

	vertexErr := c.agentService.CreateAgent(vertexConfig)
	if vertexErr == nil {
		fmt.Println("Successfully created project assistant agent with Vertex AI")
		return nil
	}

	// Log the Vertex AI error but continue to OpenAI fallback
	fmt.Printf("Failed to create agent with Vertex AI: %v\n", vertexErr)
	fmt.Println("Falling back to OpenAI...")

	// If Vertex AI failed, try OpenAI as fallback
	openaiConfig := map[string]interface{}{
		"name":                    "project-assistant",
		"provider":                "openai",
		"model":                   "gpt-3.5-turbo", // Updated model
		"tokens":                  8000,            // Increased from 4000 to 8000
		"temperature":             0.7,
		"enable_url_search":       true,
		"enable_image_processing": true,
	}

	openaiErr := c.agentService.CreateAgent(openaiConfig)
	if openaiErr != nil {
		// Log OpenAI error but don't fail the request
		fmt.Printf("Failed to create agent with OpenAI: %v\n", openaiErr)
		fmt.Println("Unable to create agent with either provider, will try again on next request")
		// We continue despite the failure - the UI should still work but will have to retry creation
	} else {
		fmt.Println("Successfully created project assistant agent with OpenAI")
	}

	return nil
}

// Helper function to fix common JSON parsing issues
func fixJSONParsingIssues(input string) string {
	// If input is empty or too short to be valid JSON, return a minimal valid JSON
	if len(input) < 2 {
		return "{}"
	}

	// Check if it's already valid JSON
	var testObj interface{}
	if err := json.Unmarshal([]byte(input), &testObj); err == nil {
		// The JSON is already valid, return it as is
		return input
	}

	// Make a copy of the input to compare after fixes
	originalInput := input

	// Apply minimal fixes that won't affect array content
	// Replace escaped newlines with actual newlines
	input = strings.ReplaceAll(input, "\\n", "\n")

	// Remove any newline or carriage return at the beginning
	input = strings.TrimLeft(input, "\n\r")

	// Replace any invalid JSON literals
	input = strings.ReplaceAll(input, "undefined", "null")
	input = strings.ReplaceAll(input, "NaN", "null")

	// Fix missing commas between objects (but don't touch arrays)
	input = strings.ReplaceAll(input, "}  {", "}, {")
	input = strings.ReplaceAll(input, "}   {", "}, {")
	input = strings.ReplaceAll(input, "}\t{", "}, {")
	input = strings.ReplaceAll(input, "}\n{", "}, {")
	input = strings.ReplaceAll(input, "}\r\n{", "}, {")

	// Fix trailing commas in arrays
	input = regexp.MustCompile(`,(\s*)([\]}])`).ReplaceAllString(input, "$2")

	// Replace any potential control characters
	input = strings.Map(func(r rune) rune {
		if r < 32 || r == 127 {
			return -1 // drop the character
		}
		return r
	}, input)

	// Fix unbalanced brackets
	openBraces := strings.Count(input, "{")
	closeBraces := strings.Count(input, "}")
	openBrackets := strings.Count(input, "[")
	closeBrackets := strings.Count(input, "]")

	// Add missing closing braces/brackets
	for i := 0; i < openBraces-closeBraces; i++ {
		input += "}"
	}
	for i := 0; i < openBrackets-closeBrackets; i++ {
		input += "]"
	}

	// Remove excess closing braces/brackets if needed
	if closeBraces > openBraces {
		excess := closeBraces - openBraces
		for i := 0; i < excess; i++ {
			lastIndex := strings.LastIndex(input, "}")
			if lastIndex >= 0 {
				input = input[:lastIndex] + input[lastIndex+1:]
			}
		}
	}
	if closeBrackets > openBrackets {
		excess := closeBrackets - openBrackets
		for i := 0; i < excess; i++ {
			lastIndex := strings.LastIndex(input, "]")
			if lastIndex >= 0 {
				input = input[:lastIndex] + input[lastIndex+1:]
			}
		}
	}

	// Fix unbalanced quotes
	if strings.Count(input, "\"")%2 != 0 {
		// If odd number of quotes, add one at the end before the last brace/bracket
		lastBrace := strings.LastIndex(input, "}")
		lastBracket := strings.LastIndex(input, "]")

		if lastBrace > lastBracket && lastBrace > 0 {
			input = input[:lastBrace] + "\"" + input[lastBrace:]
		} else if lastBracket > 0 {
			input = input[:lastBracket] + "\"" + input[lastBracket:]
		} else {
			// Just add at the end
			input += "\""
		}
	}

	// Validate if it's now a valid JSON
	if err := json.Unmarshal([]byte(input), &testObj); err != nil {
		fmt.Printf("JSON still invalid after minimal fixes: %v\n", err)

		// Try extracting valid project ideas as a last resort
		ideas, err := extractProjectIdeasWithRegex(originalInput)
		if err == nil && len(ideas) > 0 {
			// Convert the extracted ideas back to a valid JSON response
			ideaResponse := models.ProjectIdeaResponse{
				ProjectIdeas: ideas,
			}

			jsonData, err := json.Marshal(ideaResponse)
			if err == nil {
				return string(jsonData)
			}
		}

		// If all else fails, return minimal valid JSON
		return "{}"
	}

	return input
}

// cleanJSONResponse cleans up a JSON response from the AI model
func cleanJSONResponse(input string) string {
	// Check if the response is wrapped in backticks (common with some AI models)
	if strings.HasPrefix(input, "```json") {
		// Find the end of the JSON block
		end := strings.LastIndex(input, "```")
		if end > 6 { // 6 is the length of "```json"
			// Extract just the JSON content and trim any whitespace/newlines
			content := strings.TrimSpace(input[6:end])
			// Remove any leading newline characters
			content = strings.TrimLeft(content, "\n\r")
			return content
		}
	} else if strings.HasPrefix(input, "```") {
		// In case it's just wrapped in backticks without specifying json
		end := strings.LastIndex(input, "```")
		if end > 3 { // 3 is the length of "```"
			// Extract just the content and trim any whitespace/newlines
			content := strings.TrimSpace(input[3:end])
			// Remove any leading newline characters
			content = strings.TrimLeft(content, "\n\r")
			return content
		}
	}

	// Remove any leading whitespace or newlines
	input = strings.TrimLeft(strings.TrimSpace(input), "\n\r")

	// Replace smart quotes with regular quotes
	input = strings.ReplaceAll(input, "\u201C", "\"") // Left double quote
	input = strings.ReplaceAll(input, "\u201D", "\"") // Right double quote
	input = strings.ReplaceAll(input, "\u2018", "'")  // Left single quote
	input = strings.ReplaceAll(input, "\u2019", "'")  // Right single quote

	// Handle truncated responses by adding missing closing brackets and braces
	// Count open and close brackets/braces
	openBraces := strings.Count(input, "{")
	closeBraces := strings.Count(input, "}")
	openBrackets := strings.Count(input, "[")
	closeBrackets := strings.Count(input, "]")

	// Special handling for truncated arrays in 'learningOutcomes'
	// This handles the specific case where the JSON is cut off in the middle of an array of strings
	truncatedArrayPattern := regexp.MustCompile(`"learningOutcomes"\s*:\s*\[\s*(?:"[^"]*"(?:\s*,\s*"[^"]*")*)?(?:\s*,\s*"[^"]*)?$`)
	if truncatedArrayPattern.MatchString(input) {
		// Close the unclosed string and array, and also the enclosing objects as needed
		missingClosings := ""

		// Close the string if needed
		if strings.Count(input, "\"")%2 != 0 {
			missingClosings += "\""
		}

		// Close the array
		missingClosings += "]"

		// Add closing braces to match opening ones
		for i := 0; i < openBraces-closeBraces; i++ {
			missingClosings += "}"
		}

		input += missingClosings
	} else {
		// Complete any unfinished JSON by adding missing closing braces/brackets
		for i := 0; i < openBraces-closeBraces; i++ {
			input += "}"
		}
		for i := 0; i < openBrackets-closeBrackets; i++ {
			input += "]"
		}
	}

	// Handle truncated strings in general
	if strings.Count(input, "\"")%2 != 0 {
		// If we have an odd number of quotes, find the last potential unclosed string
		pattern := regexp.MustCompile(`"([^"]*)$`)
		if match := pattern.FindStringSubmatch(input); len(match) > 0 {
			// Close the unclosed string
			input += "\""
		}
	}

	// Original approach - find the first '{' and the last '}'
	start := strings.Index(input, "{")
	end := strings.LastIndex(input, "}")

	if start >= 0 && end > start {
		return input[start : end+1]
	}
	return input
}

// GetMultipleProjectIdeas gets multiple project ideas one by one, resulting in more diverse suggestions
func (c *AgentController) GetMultipleProjectIdeas(ctx *gin.Context) {

	// Parse request
	var request struct {
		Skills              []string `json:"skills"`
		Interests           []string `json:"interests"`
		Goal                string   `json:"goal"`
		Reference           string   `json:"reference"`
		PreferredDifficulty string   `json:"preferredDifficulty"`
		PreferredTimeframe  string   `json:"preferredTimeframe"`
		SessionID           string   `json:"sessionId"`
		NumIdeas            int      `json:"numIdeas"`
	}

	if err := ctx.ShouldBindJSON(&request); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate number of ideas
	if request.NumIdeas <= 0 {
		request.NumIdeas = 5 // Default to 5 ideas
	} else if request.NumIdeas > 10 {
		request.NumIdeas = 10 // Cap at 10 ideas
	}

	// Ensure the project-assistant agent exists
	err := c.ensureAgentExists()
	if err != nil {
		fmt.Printf("Failed to create agent: %v\n", err)
		// Continue anyway - we'll try to use existing agent
	}

	// Format the request for the Python agent API
	requestData := map[string]interface{}{
		"skills":               request.Skills,
		"interests":            request.Interests,
		"goal":                 request.Goal,
		"reference":            request.Reference,
		"preferred_difficulty": request.PreferredDifficulty,
		"preferred_timeframe":  request.PreferredTimeframe,
		"num_ideas":            request.NumIdeas,
	}

	// Include session ID if provided
	if request.SessionID != "" {
		requestData["session_id"] = request.SessionID
	}

	// Call the agent using the project_ideas endpoint
	result, sessionID, err := c.agentService.SendSessionBasedRequest("project-assistant", "project_ideas", requestData)
	if err != nil {
		fmt.Printf("Error from AI service: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "AI service error"})
		return
	}

	// Clean up the response to handle potential markdown formatting
	cleanedResponse := cleanJSONResponse(result)

	// Apply additional fixes to the JSON
	cleanedResponse = fixJSONParsingIssues(cleanedResponse)

	// Try to parse the response to validate it
	var parsedJSON map[string]interface{}
	if err := json.Unmarshal([]byte(cleanedResponse), &parsedJSON); err != nil {
		// If parsing fails, return the raw response
		ctx.JSON(http.StatusOK, gin.H{
			"response":  cleanedResponse,
			"sessionId": sessionID,
			"warning":   "Failed to parse response as JSON",
		})
		return
	}

	// Log the parsed projectIdeas for debugging
	if projectIdeas, ok := parsedJSON["projectIdeas"].([]interface{}); ok {
		fmt.Println("Number of project ideas:", len(projectIdeas))

		// Log each idea
		for i, idea := range projectIdeas {
			if ideaMap, ok := idea.(map[string]interface{}); ok {
				fmt.Printf("Idea %d: Title=%s\n", i+1, ideaMap["title"])

				// Log the key arrays for debugging
				if tech, ok := ideaMap["keyTechnologies"].([]interface{}); ok {
					fmt.Printf("  Technologies (%d): %v\n", len(tech), tech)
				}

				if features, ok := ideaMap["keyFeatures"].([]interface{}); ok {
					fmt.Printf("  Features (%d): %v\n", len(features), features)
				}

				if outcomes, ok := ideaMap["learningOutcomes"].([]interface{}); ok {
					fmt.Printf("  Outcomes (%d): %v\n", len(outcomes), outcomes)
				}
			}
		}
	}

	// Return the parsed response
	ctx.JSON(http.StatusOK, gin.H{
		"response":  parsedJSON,
		"sessionId": sessionID,
	})
}
