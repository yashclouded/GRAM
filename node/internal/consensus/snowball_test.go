package consensus_test

import (
	"testing"
	"time"

	"github.com/yashsingh/agrinerve/node/internal/consensus"
	"github.com/yashsingh/agrinerve/node/internal/network"
	"github.com/yashsingh/agrinerve/node/internal/node"
)

func TestSnowballConsensus_HonestNetwork(t *testing.T) {
	router := network.NewRouter()
	var nodes []*node.Node
	for i := 0; i < 20; i++ {
		id := "node-" + string(rune('A'+i))
		n := node.NewNode(id, node.Farmer, router)
		n.Start()
		nodes = append(nodes, n)
	}

	tp := consensus.TradeProposal{
		ID:             "trade-1",
		ProposerNodeID: nodes[0].ID,
		Crop:           "Wheat",
		Quantity:       100,
		Price:          20,
		Timestamp:      time.Now(),
	}

	nodes[0].ProposeTrade(tp)

	// Wait for consensus
	time.Sleep(2 * time.Second)

	acceptedCount := 0
	for _, n := range nodes {
		// Just a simple check, in a real test we'd expose the result safely
		if pref, known := n.PollPreference(tp.ID); known && pref {
			acceptedCount++
		}
		n.Stop()
	}

	if acceptedCount < 15 {
		t.Fatalf("Expected network to reach consensus, got %d/20", acceptedCount)
	}
	t.Logf("Consensus reached on valid trade: %d/20 nodes accepted", acceptedCount)
}

func TestSnowballConsensus_OfflineNodes(t *testing.T) {
	router := network.NewRouter()
	var nodes []*node.Node
	for i := 0; i < 20; i++ {
		id := "node-" + string(rune('A'+i))
		n := node.NewNode(id, node.Farmer, router)
		n.Start()
		nodes = append(nodes, n)
	}

	// Kill 40% of nodes (8 nodes)
	for i := 0; i < 8; i++ {
		nodes[i].SetStatus(node.Offline)
	}

	tp := consensus.TradeProposal{
		ID:             "trade-2",
		ProposerNodeID: nodes[10].ID, // active node
		Crop:           "Rice",
		Quantity:       50,
		Price:          30,
		Timestamp:      time.Now(),
	}

	nodes[10].ProposeTrade(tp)

	// Wait for consensus
	time.Sleep(3 * time.Second)

	acceptedCount := 0
	for _, n := range nodes {
		if pref, known := n.PollPreference(tp.ID); n.IsAlive() && known && pref {
			acceptedCount++
		}
		n.Stop()
	}

	// Out of 12 alive nodes, we expect majority to accept
	if acceptedCount < 10 {
		t.Fatalf("Expected active network to reach consensus despite offline nodes, got %d/12", acceptedCount)
	}
	t.Logf("Consensus reached on valid trade with 40%% OFFLINE: %d/%d active nodes accepted", acceptedCount, 20-8)
}

func TestSnowballConsensus_InvalidTrade(t *testing.T) {
	router := network.NewRouter()
	var nodes []*node.Node
	for i := 0; i < 20; i++ {
		id := "node-" + string(rune('A'+i))
		n := node.NewNode(id, node.Farmer, router)
		n.Start()
		nodes = append(nodes, n)
	}

	tp := consensus.TradeProposal{
		ID:             "trade-3",
		ProposerNodeID: nodes[0].ID,
		Crop:           "Wheat",
		Quantity:       -100, // INVALID
		Price:          20,
		Timestamp:      time.Now(),
	}

	nodes[0].ProposeTrade(tp)

	time.Sleep(2 * time.Second)

	acceptedCount := 0
	for _, n := range nodes {
		if pref, known := n.PollPreference(tp.ID); known && pref {
			acceptedCount++
		}
		n.Stop()
	}

	if acceptedCount > 5 {
		t.Fatalf("Expected network to REJECT invalid trade, got %d/20 acceptances", acceptedCount)
	}
	t.Logf("Consensus successfully REJECTED invalid trade. Accepted by: %d/20", acceptedCount)
}

func TestSnowballConsensus_DishonestNodes(t *testing.T) {
	router := network.NewRouter()
	var nodes []*node.Node
	for i := 0; i < 20; i++ {
		id := "node-" + string(rune('A'+i))
		n := node.NewNode(id, node.Farmer, router)
		n.Start()
		nodes = append(nodes, n)
	}

	// 25% Dishonest nodes
	for i := 0; i < 5; i++ {
		nodes[i].SetStatus(node.Dishonest)
	}

	tp := consensus.TradeProposal{
		ID:             "trade-4",
		ProposerNodeID: nodes[10].ID,
		Crop:           "Corn",
		Quantity:       50,
		Price:          30,
		Timestamp:      time.Now(),
	}

	nodes[10].ProposeTrade(tp)

	time.Sleep(3 * time.Second)

	acceptedCount := 0
	for _, n := range nodes {
		if pref, known := n.PollPreference(tp.ID); !n.IsDishonest() && known && pref {
			acceptedCount++
		}
		n.Stop()
	}

	if acceptedCount < 10 {
		t.Fatalf("Expected honest network to reach consensus despite dishonest nodes, got %d/15 honest acceptances", acceptedCount)
	}
	t.Logf("Consensus reached on valid trade with 25%% DISHONEST: %d/15 honest nodes accepted", acceptedCount)
}
