package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

type AgentService struct {
	baseURL string
}

func NewAgentService() *AgentService {
	baseURL := os.Getenv("AI_AGENT_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8888"
	}
	return &AgentService{baseURL: baseURL}
}

func (s *AgentService) SendMessage(agentName string, message string) (string, error) {
	url := fmt.Sprintf("%s/agents/%s/chat", s.baseURL, agentName)

	requestBody := map[string]string{
		"message": message,
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return "", err
	}

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("agent service returned status code: %d", resp.StatusCode)
	}

	var response struct {
		Response string `json:"response"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return "", err
	}

	return response.Response, nil
}

func (s *AgentService) CreateAgent(config map[string]interface{}) error {
	url := fmt.Sprintf("%s/agents", s.baseURL)

	jsonData, err := json.Marshal(config)
	if err != nil {
		return err
	}

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("agent service returned status code: %d", resp.StatusCode)
	}

	return nil
}

// URLSearchResponse represents the response from the URL search tool
type URLSearchResponse struct {
	URLsFound   int               `json:"urls_found"`
	URLContents map[string]string `json:"url_contents"`
}

// SearchURLs extracts and processes URLs from the given text
func (s *AgentService) SearchURLs(text string) (*URLSearchResponse, error) {
	url := fmt.Sprintf("%s/tools/url-search", s.baseURL)

	requestBody := map[string]string{
		"text": text,
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, err
	}

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("URL search service returned status code: %d", resp.StatusCode)
	}

	var response URLSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, err
	}

	return &response, nil
}

// ImageAnalysisResult represents the analysis of a single image
type ImageAnalysisResult struct {
	ExtractedText string   `json:"extracted_text,omitempty"`
	Labels        []string `json:"labels,omitempty"`
	Error         string   `json:"error,omitempty"`
}

// ImageProcessingResponse represents the response from the image processing tool
type ImageProcessingResponse struct {
	ImagesFound   int                   `json:"images_found"`
	ImageAnalysis []ImageAnalysisResult `json:"image_analysis"`
}

// ProcessImages processes and analyzes the provided base64 encoded images
func (s *AgentService) ProcessImages(base64Images []string) (*ImageProcessingResponse, error) {
	url := fmt.Sprintf("%s/tools/image-processing", s.baseURL)

	requestBody := map[string][]string{
		"base64_images": base64Images,
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, err
	}

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("image processing service returned status code: %d", resp.StatusCode)
	}

	var response ImageProcessingResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, err
	}

	return &response, nil
}

// ListAgents returns a list of available agent names
func (s *AgentService) ListAgents() ([]string, error) {
	url := fmt.Sprintf("%s/agents", s.baseURL)

	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("agent service returned status code: %d", resp.StatusCode)
	}

	var response struct {
		Agents []string `json:"agents"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, err
	}

	return response.Agents, nil
}

// SendSessionBasedRequest sends a request to a specific endpoint of an agent with session support
func (s *AgentService) SendSessionBasedRequest(agentName string, endpoint string, requestData map[string]interface{}) (string, string, error) {
	url := fmt.Sprintf("%s/agents/%s/%s", s.baseURL, agentName, endpoint)

	jsonData, err := json.Marshal(requestData)
	if err != nil {
		return "", "", err
	}

	fmt.Printf("Sending request to %s with data: %s\n", url, string(jsonData))

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		// Read the response body for better error reporting
		bodyBytes, _ := io.ReadAll(resp.Body)
		bodyString := string(bodyBytes)
		return "", "", fmt.Errorf("agent service returned status code: %d, body: %s", resp.StatusCode, bodyString)
	}

	// Read the entire response body first for debugging
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", "", fmt.Errorf("error reading response body: %v", err)
	}

	bodyString := string(bodyBytes)

	// Check if body is empty or too short to be valid JSON
	if len(bodyString) < 2 {
		return "{}", "", fmt.Errorf("received empty or too short response body")
	}

	fmt.Printf("Received raw response from agent: %s\n", bodyString)

	var response struct {
		Response  interface{} `json:"response"`
		SessionID string      `json:"session_id"`
	}

	// Try to parse the JSON response
	if err := json.Unmarshal(bodyBytes, &response); err != nil {
		fmt.Printf("Error parsing agent response as JSON: %v\n", err)

		// Try to fix the JSON if it's invalid
		validJSON, fixed := tryFixInvalidJSON(bodyString)
		if fixed {
			if err := json.Unmarshal([]byte(validJSON), &response); err != nil {
				// If we still can't parse it, return the original error but also the raw response
				return bodyString, "", fmt.Errorf("error parsing response: %v, raw response: %s", err, bodyString)
			}
		} else {
			// If we couldn't fix it, return the original error but also the raw response
			return bodyString, "", fmt.Errorf("error parsing response: %v, raw response: %s", err, bodyString)
		}
	}

	// Convert response to string if it's not already
	var responseStr string
	switch v := response.Response.(type) {
	case string:
		responseStr = v
	default:
		// Marshal back to JSON string
		jsonBytes, err := json.Marshal(response.Response)
		if err != nil {
			return "", response.SessionID, fmt.Errorf("error converting response to JSON: %v", err)
		}
		responseStr = string(jsonBytes)
	}

	// Verify that the responseStr is a valid JSON
	if !isValidJSON(responseStr) && len(responseStr) > 0 {
		fmt.Printf("Warning: Response is not valid JSON: %s\n", responseStr)

		// If it's not valid JSON but not empty, try to wrap it properly
		if strings.Contains(responseStr, "{") || strings.Contains(responseStr, "[") {
			// Try to extract and fix just the JSON part
			responseStr = extractAndFixJSON(responseStr)
		} else {
			// If it doesn't contain any JSON markers, wrap it in a simple structure
			responseStr = fmt.Sprintf(`{"text": %q}`, responseStr)
		}
	}

	return responseStr, response.SessionID, nil
}

// Helper function to check if a string is valid JSON
func isValidJSON(input string) bool {
	var obj interface{}
	return json.Unmarshal([]byte(input), &obj) == nil
}

// tryFixInvalidJSON attempts to fix common JSON issues
func tryFixInvalidJSON(input string) (string, bool) {
	// Skip empty input
	if len(strings.TrimSpace(input)) == 0 {
		return "{}", true
	}

	// Try to identify if this is just a truncated response
	// Look for the opening structure but missing closing
	if strings.HasPrefix(input, "{") && !strings.HasSuffix(input, "}") {
		return input + "}", true
	}

	if strings.HasPrefix(input, "[") && !strings.HasSuffix(input, "]") {
		return input + "]", true
	}

	// Fix unbalanced quotes
	count := 0
	for _, c := range input {
		if c == '"' {
			count++
		}
	}

	if count%2 != 0 {
		// Odd number of quotes - add one at the end before any closing brace/bracket
		lastBrace := strings.LastIndex(input, "}")
		lastBracket := strings.LastIndex(input, "]")

		if lastBrace > lastBracket && lastBrace > 0 {
			input = input[:lastBrace] + "\"" + input[lastBrace:]
			return input, true
		} else if lastBracket > 0 {
			input = input[:lastBracket] + "\"" + input[lastBracket:]
			return input, true
		}
	}

	// If we can't determine how to fix it, return original
	return input, false
}

// extractAndFixJSON tries to extract and fix a JSON part from a string
func extractAndFixJSON(input string) string {
	// Look for JSON object
	objStart := strings.Index(input, "{")
	objEnd := strings.LastIndex(input, "}")

	// Look for JSON array
	arrStart := strings.Index(input, "[")
	arrEnd := strings.LastIndex(input, "]")

	// If we have a complete object
	if objStart >= 0 && objEnd > objStart {
		candidate := input[objStart : objEnd+1]
		if isValidJSON(candidate) {
			return candidate
		}

		// Try to fix unbalanced braces
		openCount := strings.Count(candidate, "{")
		closeCount := strings.Count(candidate, "}")

		if openCount > closeCount {
			// Add missing closing braces
			for i := 0; i < (openCount - closeCount); i++ {
				candidate += "}"
			}
		}

		if isValidJSON(candidate) {
			return candidate
		}
	}

	// If we have a complete array
	if arrStart >= 0 && arrEnd > arrStart {
		candidate := input[arrStart : arrEnd+1]
		if isValidJSON(candidate) {
			return candidate
		}

		// Try to fix unbalanced brackets
		openCount := strings.Count(candidate, "[")
		closeCount := strings.Count(candidate, "]")

		if openCount > closeCount {
			// Add missing closing brackets
			for i := 0; i < (openCount - closeCount); i++ {
				candidate += "]"
			}
		}

		if isValidJSON(candidate) {
			return candidate
		}
	}

	// Fallback to a minimal valid JSON if we can't extract anything useful
	return "{}"
}

// CallProjectAssistantAPI calls the project assistant API directly with the given endpoint and data
func (s *AgentService) CallProjectAssistantAPI(endpoint string, requestData map[string]interface{}) (string, error) {
	url := fmt.Sprintf("%s/api/project-assistant/%s", s.baseURL, endpoint)

	jsonData, err := json.Marshal(requestData)
	if err != nil {
		return "", err
	}

	fmt.Printf("Calling project assistant API: %s with data: %s\n", url, string(jsonData))

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("project assistant API returned status code: %d, body: %s", resp.StatusCode, string(bodyBytes))
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("error reading response body: %v", err)
	}

	return string(bodyBytes), nil
}

// GenerateLearningGoals calls the AI agent to generate learning goals for a topic
func (s *AgentService) GenerateLearningGoals(topic string, currentKnowledge string) ([]string, error) {
	// Prepare request to AI agent
	requestBody := map[string]string{
		"topic":            topic,
		"currentKnowledge": currentKnowledge,
	}

	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("error marshaling request: %v", err)
	}

	// Call AI agent endpoint
	req, err := http.NewRequest("POST", fmt.Sprintf("%s/api/qa/learning/goals", s.baseURL), bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("error creating request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error calling AI agent: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("AI agent returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	// Parse response
	var response struct {
		Success bool     `json:"success"`
		Goals   []string `json:"goals"`
		Error   string   `json:"error,omitempty"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("error parsing response: %v", err)
	}

	if !response.Success {
		return nil, fmt.Errorf("AI agent error: %s", response.Error)
	}

	return response.Goals, nil
}
