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

const geminiBaseURL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

type Client struct {
	HTTPClient *http.Client
	GeminiKey  string
}

func NewClient() *Client {
	_ = godotenv.Load()
	key := os.Getenv("GEMINI_API_KEY")
	if key == "" {
		log.Println("Warning: GEMINI_API_KEY is not set")
	} else {
		log.Println("Gemini client initialized with key")
	}
	return &Client{
		HTTPClient: &http.Client{Timeout: 25 * time.Second},
		GeminiKey:  key,
	}
}

// CallGemini sends a text (and optionally image) prompt to Gemini and returns the response text.
func (c *Client) CallGemini(prompt string, base64Image string) (string, error) {
	if c.GeminiKey == "" {
		return "", fmt.Errorf("GEMINI_API_KEY is not set")
	}

	url := fmt.Sprintf("%s?key=%s", geminiBaseURL, c.GeminiKey)

	parts := []map[string]interface{}{
		{"text": prompt},
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
			{"parts": parts},
		},
		"generationConfig": map[string]interface{}{
			"temperature": 0.7,
		},
	}

	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	log.Printf("Sending Gemini request (body size: %d bytes)", len(bodyBytes))
	start := time.Now()

	resp, err := c.HTTPClient.Post(url, "application/json", bytes.NewBuffer(bodyBytes))
	if err != nil {
		return "", fmt.Errorf("gemini request failed: %v", err)
	}
	defer resp.Body.Close()

	log.Printf("Gemini request completed in %v with status %d", time.Since(start), resp.StatusCode)

	if resp.StatusCode != http.StatusOK {
		errBody, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("Gemini API error %d: %s", resp.StatusCode, string(errBody))
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
		return "", fmt.Errorf("no content in Gemini response")
	}

	content := geminiResp.Candidates[0].Content.Parts[0].Text
	content = strings.TrimPrefix(content, "```json")
	content = strings.TrimPrefix(content, "```")
	content = strings.TrimSuffix(content, "```")
	return strings.TrimSpace(content), nil
}
