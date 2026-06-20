package ai

import (
	"encoding/json"
	"log"
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

// GradeCropImage takes a base64 encoded image and returns a CropGrade using Gemini Vision.
func (g *Grader) GradeCropImage(base64Image string) CropGrade {
	events.Emit(events.CropImageUploaded, nil)

	grade := CropGrade{
		Grade:      "Unknown",
		Confidence: 0.0,
		Reasoning:  "",
		Timestamp:  time.Now(),
	}

	rawJSON, err := g.Client.CallGemini(systemPrompt, base64Image)
	if err != nil {
		log.Printf("Gemini grading failed: %v", err)
		grade.Reasoning = "AI Grading Failed: " + err.Error()
		events.Emit(events.AIGradingFailed, grade.Reasoning)
		return grade
	}

	if err := json.Unmarshal([]byte(rawJSON), &grade); err != nil {
		log.Printf("Gemini grading parse failed: %v (raw: %s)", err, rawJSON)
		grade.Reasoning = "AI Parsing Failed: " + err.Error()
		events.Emit(events.AIGradingFailed, grade.Reasoning)
		return grade
	}

	grade.Timestamp = time.Now()
	events.Emit(events.CropGraded, grade)
	return grade
}
