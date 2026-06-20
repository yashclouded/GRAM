package main

import (
	"fmt"
	"time"

	"github.com/yashsingh/agrinerve/node/internal/ai"
	"github.com/yashsingh/agrinerve/node/internal/auction"
	"github.com/yashsingh/agrinerve/node/internal/network"
	"github.com/yashsingh/agrinerve/node/internal/node"
	"github.com/yashsingh/agrinerve/node/internal/orchestrator"
)

func injectGossip(orch *orchestrator.Orchestrator, msgType network.MsgType, id string, payload interface{}, timestamp time.Time) {
	active := orch.GetActiveNodes()
	if len(active) > 0 {
		n := active[0]
		msg := network.Message{
			ID:        "msg-" + id,
			Type:      msgType,
			SenderID:  n.GetID(),
			Payload:   payload,
			TTL:       5,
			Timestamp: timestamp,
		}
		n.Receive(msg)
		n.GetRouter().Gossip(msg, 3, n.GetID())
	}
}

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

	fmt.Println("\n-> Phase 2: Injecting Intents to Gossip Network")

	l1 := auction.FarmerListing{
		ListingID:         "L1",
		FarmerNodeID:      "farmer-0",
		Crop:              "Wheat",
		Quantity:          100,
		ExpectedPrice:     2000,
		QualityGrade:      grade.Grade,
		QualityConfidence: grade.Confidence,
		QualityReasoning:  grade.Reasoning,
		Timestamp:         time.Now(),
	}
	injectGossip(orch, network.MsgListing, l1.ListingID, l1, l1.Timestamp)

	l2 := auction.FarmerListing{ListingID: "L2", FarmerNodeID: "farmer-1", Crop: "Rice", Quantity: 50, ExpectedPrice: 3000, Timestamp: time.Now()}
	injectGossip(orch, network.MsgListing, l2.ListingID, l2, l2.Timestamp)

	l3 := auction.FarmerListing{ListingID: "L3", FarmerNodeID: "farmer-2", Crop: "Wheat", Quantity: 200, ExpectedPrice: 1900, Timestamp: time.Now()}
	injectGossip(orch, network.MsgListing, l3.ListingID, l3, l3.Timestamp)

	d1 := auction.BuyerDemand{DemandID: "D1", BuyerNodeID: "buyer-0", Crop: "Wheat", RequiredQuantity: 100, MaxPrice: 2500, Timestamp: time.Now()}
	injectGossip(orch, network.MsgDemand, d1.DemandID, d1, d1.Timestamp)

	d2 := auction.BuyerDemand{DemandID: "D2", BuyerNodeID: "buyer-1", Crop: "Rice", RequiredQuantity: 50, MaxPrice: 3500, Timestamp: time.Now()}
	injectGossip(orch, network.MsgDemand, d2.DemandID, d2, d2.Timestamp)

	d3 := auction.BuyerDemand{DemandID: "D3", BuyerNodeID: "buyer-2", Crop: "Wheat", RequiredQuantity: 100, MaxPrice: 1500, Timestamp: time.Now()} // Will fail
	injectGossip(orch, network.MsgDemand, d3.DemandID, d3, d3.Timestamp)

	d4 := auction.BuyerDemand{DemandID: "D4", BuyerNodeID: "buyer-3", Crop: "Wheat", RequiredQuantity: 200, MaxPrice: 2200, Timestamp: time.Now()}
	injectGossip(orch, network.MsgDemand, d4.DemandID, d4, d4.Timestamp)

	o1 := auction.TransportOffer{OfferID: "O1", TransporterNodeID: "transporter-0", AvailableCapacity: 500, CostPerKm: 10, Timestamp: time.Now()}
	injectGossip(orch, network.MsgOffer, o1.OfferID, o1, o1.Timestamp)

	o2 := auction.TransportOffer{OfferID: "O2", TransporterNodeID: "transporter-1", AvailableCapacity: 100, CostPerKm: 15, Timestamp: time.Now()}
	injectGossip(orch, network.MsgOffer, o2.OfferID, o2, o2.Timestamp)

	time.Sleep(100 * time.Millisecond)

	fmt.Println("\n-> Phase 3: Nodes Reactively Match via Gossip")
	fmt.Println("   (Nodes calculate matches locally -> submit to Snowball Consensus)")

	// Wait for consensus to settle
	time.Sleep(3 * time.Second)

	fmt.Println("\n-> Phase 4: Chaos Mode Injection during Market Cycle")
	fmt.Println("-> Killing 40% of the nodes, then adding new late demands...")
	orch.KillPercentage(40)
	time.Sleep(200 * time.Millisecond)

	l4 := auction.FarmerListing{ListingID: "L4", FarmerNodeID: "farmer-4", Crop: "Corn", Quantity: 500, ExpectedPrice: 1000, Timestamp: time.Now()}
	injectGossip(orch, network.MsgListing, l4.ListingID, l4, l4.Timestamp)

	d5 := auction.BuyerDemand{DemandID: "D5", BuyerNodeID: "buyer-8", Crop: "Corn", RequiredQuantity: 500, MaxPrice: 2000, Timestamp: time.Now()}
	injectGossip(orch, network.MsgDemand, d5.DemandID, d5, d5.Timestamp)

	o3 := auction.TransportOffer{OfferID: "O3", TransporterNodeID: "transporter-4", AvailableCapacity: 1000, CostPerKm: 10, Timestamp: time.Now()}
	injectGossip(orch, network.MsgOffer, o3.OfferID, o3, o3.Timestamp)

	// Wait for consensus to settle under degraded network conditions
	time.Sleep(3 * time.Second) // wait for consensus

	fmt.Println("\n-> Phase 5: Settlement & Reputation Simulation")
	fmt.Println("   (Simulating successful delivery for first trade, failure for second)")
	
	t1ID := fmt.Sprintf("trade-%s-%s-%s", "L1", "D1", "O1")
	fmt.Printf("   [Simulating] Trade %s -> SUCCESSFUL DELIVERY\n", t1ID)
	orch.SimulateSettlement(t1ID, "farmer-0", "buyer-0", "transporter-0", true)

	t2ID := fmt.Sprintf("trade-%s-%s-%s", "L4", "D5", "O3")
	fmt.Printf("   [Simulating] Trade %s -> FAILED DELIVERY\n", t2ID)
	orch.SimulateSettlement(t2ID, "farmer-4", "buyer-8", "transporter-4", false)
	time.Sleep(200 * time.Millisecond)

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
	fmt.Printf("\n--- Settlement Metrics ---\n")
	fmt.Printf("Successful Deliveries:  %d\n", m.SuccessfulDeliveries)
	fmt.Printf("Failed Deliveries:      %d\n", m.FailedDeliveries)
	fmt.Printf("Settlement Rate:        %.1f%%\n", m.SettlementSuccessRate)
	fmt.Printf("Avg Network Reputation: %.1f\n", orch.RepManager.GetAverageReputation())
	fmt.Printf("Blacklisted Nodes:      %d\n", m.BlacklistedNodes)
	m.Mu.RUnlock()

	score := orch.GetHealthScore()
	fmt.Printf("\n-> Final Network Health Score: %d / 100\n", score)
	fmt.Println("=======================================")

	orch.StopNetwork()
}
