package orchestrator

import (
	"fmt"
	"math/rand"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/yashsingh/agrinerve/node/internal/consensus"
	"github.com/yashsingh/agrinerve/node/internal/network"
	"github.com/yashsingh/agrinerve/node/internal/node"
)

type Orchestrator struct {
	mu      sync.RWMutex
	Router  *network.Router
	Nodes   []*node.Node
	Metrics *Metrics
}

func NewOrchestrator() *Orchestrator {
	return &Orchestrator{
		Router: network.NewRouter(),
		Nodes:  make([]*node.Node, 0),
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
