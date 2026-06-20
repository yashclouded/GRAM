package main

import (
	"fmt"
	"log"

	"github.com/yashsingh/agrinerve/node/internal/api"
	"github.com/yashsingh/agrinerve/node/internal/node"
	"github.com/yashsingh/agrinerve/node/internal/orchestrator"
)

func main() {
	fmt.Println("=======================================")
	fmt.Println("  GRAM PROTOCOL: API & WS SERVER")
	fmt.Println("=======================================")

	// 1. Initialize Network & Orchestrator
	orch := orchestrator.NewOrchestrator()
	orch.StartMetricsListener()

	// 2. Pre-spawn a demo network (10 Farmers, 10 Buyers, 5 Transporters)
	for i := 0; i < 10; i++ {
		orch.SpawnNode(fmt.Sprintf("farmer-%d", i), node.Farmer)
		orch.SpawnNode(fmt.Sprintf("buyer-%d", i), node.Buyer)
	}
	for i := 0; i < 5; i++ {
		orch.SpawnNode(fmt.Sprintf("transporter-%d", i), node.Transporter)
	}
	orch.StartNetwork()

	// 3. Start API Server
	srv := api.NewServer(orch)

	port := ":8080"
	log.Printf("Server listening on http://localhost%s", port)
	if err := srv.Start(port); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
