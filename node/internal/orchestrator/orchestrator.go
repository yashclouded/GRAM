package orchestrator

import (
	"fmt"
	"math/rand"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/yashsingh/agrinerve/node/internal/consensus"
	"github.com/yashsingh/agrinerve/node/internal/events"
	"github.com/yashsingh/agrinerve/node/internal/network"
	"github.com/yashsingh/agrinerve/node/internal/node"
	"github.com/yashsingh/agrinerve/node/internal/reputation"
)

type Orchestrator struct {
	mu          sync.RWMutex
	Router      *network.Router
	Nodes       []*node.Node
	Metrics     *Metrics
	RepManager  *reputation.Manager
	OnEvent     func(events.Event)
}

func NewOrchestrator() *Orchestrator {
	return &Orchestrator{
		Router:     network.NewRouter(),
		Nodes:      make([]*node.Node, 0),
		RepManager: reputation.NewManager(),
	}
}

func (o *Orchestrator) SpawnNode(id string, nodeType node.NodeType) {
	o.mu.Lock()
	defer o.mu.Unlock()
	n := node.NewNode(id, nodeType, o.Router)
	o.Nodes = append(o.Nodes, n)
}

func (o *Orchestrator) SpawnNodes(count int) {
	o.mu.Lock()
	defer o.mu.Unlock()

	for i := 0; i < count; i++ {
		id := fmt.Sprintf("node-%d", len(o.Nodes))
		n := node.NewNode(id, node.Farmer, o.Router)
		o.Nodes = append(o.Nodes, n)
	}
}

func (o *Orchestrator) StartNetwork() {
	o.mu.RLock()
	defer o.mu.RUnlock()
	for _, n := range o.Nodes {
		n.Start()
	}
}

func (o *Orchestrator) StopNetwork() {
	o.mu.RLock()
	defer o.mu.RUnlock()
	for _, n := range o.Nodes {
		n.Stop()
	}
}

func (o *Orchestrator) GetNodeByID(id string) *node.Node {
	o.mu.RLock()
	defer o.mu.RUnlock()
	for _, n := range o.Nodes {
		if n.GetID() == id {
			return n
		}
	}
	return nil
}

func (o *Orchestrator) GetActiveNodes() []*node.Node {
	o.mu.RLock()
	defer o.mu.RUnlock()
	var active []*node.Node
	for _, n := range o.Nodes {
		if n.IsAlive() {
			active = append(active, n)
		}
	}
	return active
}


func (o *Orchestrator) SubmitTradeProposal(crop string, quantity float64, price float64) string {
	o.mu.RLock()
	defer o.mu.RUnlock()

	// Pick a random alive node to propose
	var aliveNodes []*node.Node
	for _, n := range o.Nodes {
		if n.IsAlive() {
			aliveNodes = append(aliveNodes, n)
		}
	}

	if len(aliveNodes) == 0 {
		return ""
	}

	proposer := aliveNodes[rand.Intn(len(aliveNodes))]

	tp := consensus.TradeProposal{
		ID:             fmt.Sprintf("trade-%s", uuid.New().String()[:8]),
		ProposerNodeID: proposer.GetID(),
		Crop:           crop,
		Quantity:       quantity,
		Price:          price,
		Timestamp:      time.Now(),
	}

	proposer.ProposeTrade(tp)
	return tp.ID
}

// SimulateSettlement mimics the post-trade lifecycle (Transit -> Delivered -> Settled/Failed)
func (o *Orchestrator) SimulateSettlement(tradeID string, farmerID, buyerID, transporterID string, success bool) {
	// Emit Transit
	events.Emit(events.TradeShipped, tradeID)

	// Simulate time passing
	time.Sleep(100 * time.Millisecond)

	if !success {
		events.Emit(events.TradeFailed, tradeID)
		o.RepManager.ApplyScore(farmerID, reputation.PenaltyFailed, "FailedTrade")
		o.RepManager.ApplyScore(transporterID, reputation.PenaltyFailed, "FailedTrade")
		return
	}

	// Emit Delivered
	events.Emit(events.TradeDelivered, tradeID)
	o.RepManager.ApplyScore(farmerID, reputation.ScoreDelivered, "TradeDelivered")
	o.RepManager.ApplyScore(transporterID, reputation.ScoreDelivered, "TradeDelivered")

	time.Sleep(50 * time.Millisecond)

	// Emit Settled
	events.Emit(events.TradeSettled, tradeID)
	o.RepManager.ApplyScore(farmerID, reputation.ScoreSettled, "TradeSettled")
	o.RepManager.ApplyScore(buyerID, reputation.ScoreSettled, "TradeSettled")
	o.RepManager.ApplyScore(transporterID, reputation.ScoreSettled, "TradeSettled")
}
