package node

import (
	"testing"
	"time"

	"github.com/yashsingh/agrinerve/node/internal/network"
)

func TestNetworkAndGossip(t *testing.T) {
	router := network.NewRouter()
	var nodes []*Node
	for i := 0; i < 10; i++ {
		id := "node-" + string(rune('A'+i))
		n := NewNode(id, Farmer, router, nil)
		n.Start()
		nodes = append(nodes, n)
	}

	// Node 0 sends a message
	msg := network.Message{
		ID:        "msg-1",
		Type:      network.MsgGossip,
		SenderID:  nodes[0].ID,
		Payload:   "hello mesh",
		TTL:       5,
		Timestamp: time.Now(),
	}

	// Initial gossip from node 0
	router.Gossip(msg, 3, nodes[0].ID)

	// Wait for propagation
	time.Sleep(200 * time.Millisecond)

	// Check if other nodes received it
	receivedCount := 0
	for _, n := range nodes {
		if _, seen := n.seenMsgs.Load("msg-1"); seen {
			receivedCount++
		}
		n.Stop()
	}

	if receivedCount < 3 { // Should at least reach the initial 3
		t.Fatalf("Expected at least 3 nodes to receive message, got %d", receivedCount)
	}
	t.Logf("Message reached %d/10 nodes", receivedCount)
}
