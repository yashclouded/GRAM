package node

import (
	"testing"
	"time"

	"github.com/yashsingh/agrinerve/node/internal/auction"
	"github.com/yashsingh/agrinerve/node/internal/network"
)

func TestNodeLocalMatcherDeterministic(t *testing.T) {
	router := network.NewRouter()

	nodeA := NewNode("node-a", Farmer, router)
	nodeB := NewNode("node-b", Buyer, router)
	nodeC := NewNode("node-c", Transporter, router)

	nodeA.Start()
	nodeB.Start()
	nodeC.Start()
	defer nodeA.Stop()
	defer nodeB.Stop()
	defer nodeC.Stop()

	ts := time.Now()

	listing := auction.FarmerListing{ListingID: "L1", FarmerNodeID: "f1", Crop: "Wheat", Quantity: 100, ExpectedPrice: 1000, Timestamp: ts}
	demand := auction.BuyerDemand{DemandID: "D1", BuyerNodeID: "b1", Crop: "Wheat", RequiredQuantity: 100, MaxPrice: 1500, Timestamp: ts}
	offer := auction.TransportOffer{OfferID: "O1", TransporterNodeID: "t1", AvailableCapacity: 100, CostPerKm: 10, Timestamp: ts}

	// We inject the same raw network messages to all 3 nodes directly.
	nodes := []*Node{nodeA, nodeB, nodeC}

	for _, n := range nodes {
		n.Receive(network.Message{ID: "m1-" + n.ID, Type: network.MsgListing, Payload: listing})
		n.Receive(network.Message{ID: "m2-" + n.ID, Type: network.MsgDemand, Payload: demand})
		n.Receive(network.Message{ID: "m3-" + n.ID, Type: network.MsgOffer, Payload: offer})
	}

	// Wait for local matchers to process the inbox and run GenerateMatches
	time.Sleep(200 * time.Millisecond)

	expectedTradeID := "trade-L1-D1-O1"

	for _, n := range nodes {
		// Verify node independently matched and proposed it
		_, proposed := n.proposedTrades.Load(expectedTradeID)
		if !proposed {
			t.Errorf("Node %s failed to propose deterministic trade %s independently", n.ID, expectedTradeID)
		}

		// Since ProposeTrade was called, a MsgTradeProposal was gossiped.
		// Ensure the node received the proposal and spawned the Snowball Engine.
		_, engineExists := n.engines.Load(expectedTradeID)
		if !engineExists {
			t.Errorf("Node %s did not start consensus engine for deterministic trade %s", n.ID, expectedTradeID)
		}
	}
}
