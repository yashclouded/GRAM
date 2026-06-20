package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
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
}

func NewClient() *Client {
	// Attempt to load .env, but silently ignore if missing
	_ = godotenv.Load()

	key := os.Getenv("HACKCLUB_AI_API_KEY")

	return &Client{
		HTTPClient: &http.Client{Timeout: 30 * time.Second},
		APIKey:     key,
		BaseURL:    DefaultProxyURL,
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

	resp, err := c.HTTPClient.Do(httpReq)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyErr, _ := io.ReadAll(resp.Body)
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
