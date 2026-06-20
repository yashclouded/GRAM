package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// Default to Hack Club AI
const DefaultProxyURL = "https://ai.hackclub.com/proxy/v1/chat/completions"

type Client struct {
	HTTPClient *http.Client
	APIKey     string
	BaseURL    string
	GeminiKey  string
}

func NewClient() *Client {
	// Attempt to load .env, but silently ignore if missing
	_ = godotenv.Load()

	key := os.Getenv("HACKCLUB_AI_API_KEY")
	geminiKey := os.Getenv("GEMINI_API_KEY")

	return &Client{
		HTTPClient: &http.Client{Timeout: 30 * time.Second},
		APIKey:     key,
		BaseURL:    DefaultProxyURL,
		GeminiKey:  geminiKey,
	}
}

// CallChatCompletion sends a request to the proxy and returns the raw JSON string
func (c *Client) CallChatCompletion(req ChatCompletionRequest) (string, error) {
	if c.APIKey == "" {
		return "", fmt.Errorf("HACKCLUB_AI_API_KEY is not set")
	}

	bodyBytes, err := json.Marshal(req)
	if err != nil {
		return "", err
	}

	httpReq, err := http.NewRequest("POST", c.BaseURL, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return "", err
	}

	httpReq.Header.Set("Authorization", "Bearer "+c.APIKey)
	httpReq.Header.Set("Content-Type", "application/json")

	log.Printf("Sending AI request to %s (body size: %d bytes)", c.BaseURL, len(bodyBytes))
	start := time.Now()
	resp, err := c.HTTPClient.Do(httpReq)
	if err != nil {
		log.Printf("AI request failed after %v: %v", time.Since(start), err)
		return "", err
	}
	defer resp.Body.Close()

	log.Printf("AI request completed in %v with status %d", time.Since(start), resp.StatusCode)

	if resp.StatusCode != http.StatusOK {
		bodyErr, _ := io.ReadAll(resp.Body)
		log.Printf("AI error body: %s", string(bodyErr))
		return "", fmt.Errorf("API error %d: %s", resp.StatusCode, string(bodyErr))
	}

	var chatResp ChatCompletionResponse
	if err := json.NewDecoder(resp.Body).Decode(&chatResp); err != nil {
		return "", err
	}

	if len(chatResp.Choices) == 0 {
		return "", fmt.Errorf("no choices returned")
	}

	// Some models ignore instructions and add markdown wrapper
	content := chatResp.Choices[0].Message.Content
	content = strings.TrimPrefix(content, "```json")
	content = strings.TrimPrefix(content, "```")
	content = strings.TrimSuffix(content, "```")
	return strings.TrimSpace(content), nil
}

// CallGeminiFallback makes a direct call to the Gemini API if Hack Club proxy fails.
func (c *Client) CallGeminiFallback(prompt string, base64Image string) (string, error) {
	if c.GeminiKey == "" {
		return "", fmt.Errorf("no gemini key provided for fallback")
	}

	geminiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=%s", c.GeminiKey)

	parts := []map[string]interface{}{
		{
			"text": prompt,
		},
	}

	if base64Image != "" {
		parts = append(parts, map[string]interface{}{
			"inline_data": map[string]interface{}{
				"mime_type": "image/jpeg",
				"data":      base64Image,
			},
		})
	}

	payload := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"parts": parts,
			},
		},
		"generationConfig": map[string]interface{}{
			"temperature": 0.2,
		},
	}

	bodyBytes, _ := json.Marshal(payload)
	resp, err := c.HTTPClient.Post(geminiURL, "application/json", bytes.NewBuffer(bodyBytes))
	if err != nil {
		return "", fmt.Errorf("gemini request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		errBody, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("gemini API error %d: %s", resp.StatusCode, string(errBody))
	}

	var geminiResp struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&geminiResp); err != nil {
		return "", err
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("no content in gemini response")
	}

	content := geminiResp.Candidates[0].Content.Parts[0].Text
	content = strings.TrimPrefix(content, "```json")
	content = strings.TrimPrefix(content, "```")
	content = strings.TrimSuffix(content, "```")
	return strings.TrimSpace(content), nil
}

