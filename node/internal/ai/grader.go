package ai

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/yashsingh/agrinerve/node/internal/events"
)

// Grader wraps the generic AI Client to provide domain-specific crop grading.
type Grader struct {
	Client *Client
}

func NewGrader() *Grader {
	return &Grader{
		Client: NewClient(),
	}
}

// GradeCropImage takes a base64 encoded image and returns a CropGrade.
// If the AI fails, it gracefully falls back to "Unknown" rather than crashing.
func (g *Grader) GradeCropImage(base64Image string) CropGrade {
	events.Emit(events.CropImageUploaded, nil)

	grade := CropGrade{
		Grade:      "Unknown",
		Confidence: 0.0,
		Reasoning:  "",
		Timestamp:  time.Now(),
	}

	req := ChatCompletionRequest{
		Model:       "openai/gpt-chat-latest",
		Temperature: 0.2, // Low temperature for deterministic grading
	}

	// Vision payload
	content := []map[string]interface{}{
		{
			"type": "text",
			"text": systemPrompt,
		},
		{
			"type": "image_url",
			"image_url": map[string]interface{}{
				"url": fmt.Sprintf("data:image/jpeg;base64,%s", base64Image),
			},
		},
	}

	req.Messages = append(req.Messages, ChatMessage{
		Role:    "user",
		Content: content,
	})

	rawJSON, err := g.Client.CallChatCompletion(req)
	if err != nil && (strings.Contains(err.Error(), "429") || strings.Contains(err.Error(), "500")) {
		log.Println("Hack Club AI failed for grading, falling back to Gemini API...")
		geminiAns, geminiErr := g.Client.CallGeminiFallback(systemPrompt, base64Image)
		if geminiErr == nil {
			rawJSON = geminiAns
			err = nil
		} else {
			log.Printf("Gemini fallback grading also failed: %v", geminiErr)
		}
	}

	if err != nil {
		grade.Reasoning = "AI Grading Failed: " + err.Error()
		events.Emit(events.AIGradingFailed, grade.Reasoning)
		return grade
	}

	err = json.Unmarshal([]byte(rawJSON), &grade)
	if err != nil {
		grade.Reasoning = "AI Parsing Failed: " + err.Error()
		events.Emit(events.AIGradingFailed, grade.Reasoning)
		return grade
	}

	// Valid Grade!
	grade.Timestamp = time.Now()
	events.Emit(events.CropGraded, grade)
	return grade
}
