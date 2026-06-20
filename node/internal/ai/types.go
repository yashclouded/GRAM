package ai

import "time"

type CropGrade struct {
	Grade      string    `json:"grade"`
	Confidence float64   `json:"confidence"`
	Reasoning  string    `json:"reasoning"`
	Timestamp  time.Time `json:"timestamp"`
}

type ChatMessage struct {
	Role    string      `json:"role"`
	Content interface{} `json:"content"` // can be string or []map[string]interface{} for vision
}

type ChatCompletionRequest struct {
	Model       string        `json:"model"`
	Messages    []ChatMessage `json:"messages"`
	Temperature float64       `json:"temperature,omitempty"`
}

type ChatCompletionResponse struct {
	Choices []struct {
		Message struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}
