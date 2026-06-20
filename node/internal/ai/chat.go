package ai

import (
	"log"
	"strings"
)

type ChatAgent struct {
	Client *Client
}

func NewChatAgent() *ChatAgent {
	return &ChatAgent{
		Client: NewClient(),
	}
}

func (c *ChatAgent) AskQuestion(question string, lang string, history []ChatMessage) (string, error) {
	req := ChatCompletionRequest{
		Model:       "openai/gpt-chat-latest",
		Temperature: 0.7,
	}

	systemInstruction := "You are GRAM AI, a helpful assistant for farmers, buyers, and transporters in the agriculture industry. You provide concise, practical advice about crops, farming practices, mandi prices, and logistics."
	if lang == "hi" {
		systemInstruction += " Please answer in Hindi."
	} else {
		systemInstruction += " Please answer in English."
	}

	req.Messages = []ChatMessage{
		{
			Role:    "system",
			Content: systemInstruction,
		},
	}

	for _, msg := range history {
		if msg.Role == "user" || msg.Role == "assistant" {
			req.Messages = append(req.Messages, msg)
		}
	}

	req.Messages = append(req.Messages, ChatMessage{
		Role:    "user",
		Content: question,
	})

	ans, err := c.Client.CallChatCompletion(req)
	if err != nil && (strings.Contains(err.Error(), "429") || strings.Contains(err.Error(), "500")) {
		// Fallback to Gemini
		log.Println("Hack Club AI failed, falling back to Gemini API...")
		fallbackPrompt := systemInstruction + "\n\nConversation History:\n"
		for _, m := range history {
			contentStr, ok := m.Content.(string)
			if ok {
				fallbackPrompt += strings.ToUpper(m.Role) + ": " + contentStr + "\n"
			}
		}
		fallbackPrompt += "\nUSER: " + question
		geminiAns, geminiErr := c.Client.CallGeminiFallback(fallbackPrompt, "")
		if geminiErr == nil {
			return geminiAns, nil
		}
		
		// Ultimate fallback if both fail
		log.Printf("Gemini fallback also failed: %v", geminiErr)
		if lang == "hi" {
			return "मुझे खेद है, लेकिन अभी AI काम नहीं कर रहा है।", nil
		}
		return "I apologize, but the AI is currently unavailable.", nil
	}
	return ans, err
}
