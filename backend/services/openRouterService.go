package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

const openRouterURL = "https://openrouter.ai/api/v1/chat/completions"

var openRouterHTTPClient = &http.Client{Timeout: 90 * time.Second}

type openRouterMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openRouterRequest struct {
	Model          string              `json:"model"`
	Messages       []openRouterMessage `json:"messages"`
	Temperature    float64             `json:"temperature"`
	ResponseFormat map[string]string   `json:"response_format,omitempty"`
}

type openRouterResponse struct {
	Choices []struct {
		Message openRouterMessage `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// OpenRouterJSON sends a system + user prompt to OpenRouter and decodes the
// model's JSON reply into out. The model is configured via OPENROUTER_MODEL.
func OpenRouterJSON(systemPrompt, userPrompt string, temperature float64, out interface{}) error {
	return OpenRouterJSONWithin(0, systemPrompt, userPrompt, temperature, out)
}

// OpenRouterJSONWithin is OpenRouterJSON with a shorter deadline than the
// client's default, for calls a user is waiting on and that are worth retrying
// rather than hanging. A zero timeout keeps the default.
func OpenRouterJSONWithin(timeout time.Duration, systemPrompt, userPrompt string, temperature float64, out interface{}) error {
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	model := os.Getenv("OPENROUTER_MODEL")
	if apiKey == "" || model == "" {
		return errors.New("OPENROUTER_API_KEY and OPENROUTER_MODEL must be set")
	}

	body, err := json.Marshal(openRouterRequest{
		Model: model,
		Messages: []openRouterMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userPrompt},
		},
		Temperature:    temperature,
		ResponseFormat: map[string]string{"type": "json_object"},
	})
	if err != nil {
		return err
	}

	ctx := context.Background()
	if timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, timeout)
		defer cancel()
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, openRouterURL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Title", "ProjectUp")

	resp, err := openRouterHTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("openrouter request failed: %w", err)
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	var parsed openRouterResponse
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return fmt.Errorf("openrouter returned non-JSON (status %d)", resp.StatusCode)
	}
	if parsed.Error != nil {
		return fmt.Errorf("openrouter error: %s", parsed.Error.Message)
	}
	if resp.StatusCode != http.StatusOK || len(parsed.Choices) == 0 {
		return fmt.Errorf("openrouter returned status %d with no choices", resp.StatusCode)
	}

	content := extractJSONObject(parsed.Choices[0].Message.Content)
	if err := json.Unmarshal([]byte(content), out); err != nil {
		return fmt.Errorf("model reply was not valid JSON: %w", err)
	}
	return nil
}

// extractJSONObject trims code fences or prose around the first JSON object,
// since not every model honours response_format strictly.
func extractJSONObject(s string) string {
	start := strings.Index(s, "{")
	end := strings.LastIndex(s, "}")
	if start == -1 || end <= start {
		return s
	}
	return s[start : end+1]
}
