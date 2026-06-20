package main

import (
	"fmt"
	"log"

	"github.com/yashsingh/agrinerve/node/internal/ai"
)

func main() {
	client := ai.NewClient()
	fmt.Println("Client URL:", client.BaseURL)
	fmt.Println("Has Key:", client.APIKey != "")

	req := ai.ChatCompletionRequest{
		Model: "openai/gpt-chat-latest",
		Messages: []ai.ChatMessage{
			{Role: "user", Content: "Hello, reply with OK"},
		},
	}

	resp, err := client.CallChatCompletion(req)
	if err != nil {
		log.Fatal("Error:", err)
	}
	fmt.Println("Response:", resp)
}
