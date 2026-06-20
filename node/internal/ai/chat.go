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
	systemInstruction := "You are GRAM AI, a helpful assistant for farmers, buyers, and transporters in the agriculture industry. You provide concise, practical advice about crops, farming practices, mandi prices, and logistics."
	if lang == "hi" {
		systemInstruction += " Please answer in Hindi."
	} else {
		systemInstruction += " Please answer in English."
	}

	// Build full prompt with history
	prompt := systemInstruction + "\n\nConversation History:\n"
	for _, m := range history {
		contentStr, ok := m.Content.(string)
		if ok {
			prompt += strings.ToUpper(m.Role) + ": " + contentStr + "\n"
		}
	}
	prompt += "\nUSER: " + question + "\nASSISTANT:"

	ans, err := c.Client.CallGemini(prompt, "")
	if err != nil {
		log.Printf("Gemini chat failed: %v", err)
		if lang == "hi" {
			return "मुझे खेद है, लेकिन अभी AI काम नहीं कर रहा है।", nil
		}
		return "I apologize, but the AI is currently unavailable.", nil
	}
	return ans, nil
}
