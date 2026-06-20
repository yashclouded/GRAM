package main

import (
	"fmt"
	"time"

	"github.com/yashsingh/agrinerve/node/internal/ai"
	"github.com/yashsingh/agrinerve/node/internal/auction"
	"github.com/yashsingh/agrinerve/node/internal/node"
	"github.com/yashsingh/agrinerve/node/internal/orchestrator"
)

func main() {
	fmt.Println("=======================================")
	fmt.Println("  GRAM PROTOCOL: CHAOS DEMONSTRATION")
	fmt.Println("=======================================")
	// 1. Initialize Network & Orchestrator
	orch := orchestrator.NewOrchestrator()
	orch.StartMetricsListener()

	fmt.Println("-> Spawning 25 Simulation Nodes (10 Farmers, 10 Buyers, 5 Transporters)...")
	// Spawn Farmers (0-9)
	for i := 0; i < 10; i++ {
		orch.SpawnNode(fmt.Sprintf("farmer-%d", i), node.Farmer)
	}
	// Spawn Buyers (10-19)
	for i := 0; i < 10; i++ {
		orch.SpawnNode(fmt.Sprintf("buyer-%d", i), node.Buyer)
	}
	// Spawn Transporters (20-24)
	for i := 0; i < 5; i++ {
		orch.SpawnNode(fmt.Sprintf("transporter-%d", i), node.Transporter)
	}
	orch.StartNetwork()
	time.Sleep(100 * time.Millisecond)

	fmt.Println("\n-> Phase 1: AI Crop Quality Grading")
	aiGrader := ai.NewGrader()
	fmt.Println("-> Farmer uploads crop image for grading...")
	
	// Tiny 1x1 JPEG base64 for demo purposes
	sampleImage := "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="
	
	grade := aiGrader.GradeCropImage(sampleImage)
	fmt.Printf("   [AI Result] Grade: %s (Confidence: %.1f%%)\n", grade.Grade, grade.Confidence)
	fmt.Printf("   [AI Reasoning] %s\n", grade.Reasoning)

	fmt.Println("\n-> Phase 2: Submitting Intent to Market Engine")
	marketEngine := auction.NewMarket(orch)

	// Add 3 Farmer Listings (First one includes the AI grade!)
	marketEngine.AddListing(auction.FarmerListing{
		ListingID:         "L1", 
		FarmerNodeID:      "farmer-0", 
		Crop:              "Wheat", 
		Quantity:          100, 
		ExpectedPrice:     2000, 
		QualityGrade:      grade.Grade,
		QualityConfidence: grade.Confidence,
		QualityReasoning:  grade.Reasoning,
		Timestamp:         time.Now(),
	})
	marketEngine.AddListing(auction.FarmerListing{ListingID: "L2", FarmerNodeID: "farmer-1", Crop: "Rice", Quantity: 50, ExpectedPrice: 3000, Timestamp: time.Now()})
	marketEngine.AddListing(auction.FarmerListing{ListingID: "L3", FarmerNodeID: "farmer-2", Crop: "Wheat", Quantity: 200, ExpectedPrice: 1900, Timestamp: time.Now()})

	// Add 4 Buyer Demands (B2 is willing to pay high for Rice, B3 is lowballing Wheat)
	marketEngine.AddDemand(auction.BuyerDemand{DemandID: "D1", BuyerNodeID: "buyer-0", Crop: "Wheat", RequiredQuantity: 100, MaxPrice: 2500, Timestamp: time.Now()})
	marketEngine.AddDemand(auction.BuyerDemand{DemandID: "D2", BuyerNodeID: "buyer-1", Crop: "Rice", RequiredQuantity: 50, MaxPrice: 3500, Timestamp: time.Now()})
	marketEngine.AddDemand(auction.BuyerDemand{DemandID: "D3", BuyerNodeID: "buyer-2", Crop: "Wheat", RequiredQuantity: 100, MaxPrice: 1500, Timestamp: time.Now()}) // Will fail to match (too low)
	marketEngine.AddDemand(auction.BuyerDemand{DemandID: "D4", BuyerNodeID: "buyer-3", Crop: "Wheat", RequiredQuantity: 200, MaxPrice: 2200, Timestamp: time.Now()})

	// Add 2 Transporters
	marketEngine.AddOffer(auction.TransportOffer{OfferID: "O1", TransporterNodeID: "transporter-0", AvailableCapacity: 500, CostPerKm: 10, Timestamp: time.Now()})
	marketEngine.AddOffer(auction.TransportOffer{OfferID: "O2", TransporterNodeID: "transporter-1", AvailableCapacity: 100, CostPerKm: 15, Timestamp: time.Now()})

	time.Sleep(100 * time.Millisecond)
	
	fmt.Println("\n-> Phase 3: Running Deterministic Market Cycle")
	fmt.Println("   (Engine calculates matches -> submits to Snowball Consensus)")
	marketEngine.RunMarketCycle()

	// Wait for consensus to settle
	time.Sleep(3 * time.Second)

	fmt.Println("\n-> Phase 4: Chaos Mode Injection during Market Cycle")
	fmt.Println("-> Killing 40% of the nodes, then adding new late demands...")
	orch.KillPercentage(40)
	time.Sleep(200 * time.Millisecond)

	marketEngine.AddListing(auction.FarmerListing{ListingID: "L4", FarmerNodeID: "farmer-4", Crop: "Corn", Quantity: 500, ExpectedPrice: 1000, Timestamp: time.Now()})
	marketEngine.AddDemand(auction.BuyerDemand{DemandID: "D5", BuyerNodeID: "buyer-8", Crop: "Corn", RequiredQuantity: 500, MaxPrice: 2000, Timestamp: time.Now()})
	marketEngine.AddOffer(auction.TransportOffer{OfferID: "O3", TransporterNodeID: "transporter-4", AvailableCapacity: 1000, CostPerKm: 10, Timestamp: time.Now()})
	
	marketEngine.RunMarketCycle()

	// Wait for consensus to settle under degraded network conditions
	time.Sleep(3 * time.Second) // wait for consensus

	fmt.Println("\n=======================================")
	fmt.Println("  METRICS SUMMARY")
	fmt.Println("=======================================")
	m := orch.GetMetrics()
	m.Mu.RLock()
	fmt.Printf("Total Nodes Spawned:    %d\n", m.TotalNodes)
	fmt.Printf("Currently Active:       %d\n", m.ActiveNodes)
	fmt.Printf("Currently Offline:      %d\n", m.OfflineNodes)
	fmt.Printf("Trade Proposals Sent:   %d\n", m.TradeProposals)
	fmt.Printf("Consensus Reached:      %d\n", m.AcceptedTrades)
	fmt.Printf("Consensus Rejected:     %d\n", m.RejectedTrades)
	fmt.Printf("Total Consensus Rounds: %d\n", m.TotalConsensusRounds)
	m.Mu.RUnlock()

	score := orch.GetHealthScore()
	fmt.Printf("\n-> Final Network Health Score: %d / 100\n", score)
	fmt.Println("=======================================")

	orch.StopNetwork()
}
