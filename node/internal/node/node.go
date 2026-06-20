package node

import (
	"sync"
	"sync/atomic"

	"github.com/yashsingh/agrinerve/node/internal/consensus"
	"github.com/yashsingh/agrinerve/node/internal/events"
	"github.com/yashsingh/agrinerve/node/internal/network"
)

type NodeType string

const (
	Farmer      NodeType = "Farmer"
	Buyer       NodeType = "Buyer"
	Transporter NodeType = "Transporter"
)

type Status int32

const (
	Alive     Status = 0
	Offline   Status = 1
	Dishonest Status = 2
)

type Node struct {
	ID        string
	Type      NodeType
	status    int32 // atomic usage
	Mailbox   chan network.Message
	router    *network.Router
	seenMsgs  sync.Map // Duplicate suppression
	engines   sync.Map // tradeID -> *consensus.SnowballEngine
	stopCh    chan struct{}
}

func NewNode(id string, nType NodeType, router *network.Router) *Node {
	n := &Node{
		ID:      id,
		Type:    nType,
		status:  int32(Alive),
		Mailbox: make(chan network.Message, 100),
		router:  router,
		stopCh:  make(chan struct{}),
	}
	router.Register(n)
	events.Emit(events.NodeSpawned, n.ID)
	return n
}

func (n *Node) Start() {
	go n.processMailbox()
}

func (n *Node) Stop() {
	close(n.stopCh)
}

func (n *Node) SetStatus(s Status) {
	atomic.StoreInt32(&n.status, int32(s))
	if s == Offline {
		events.Emit(events.NodeKilled, n.ID)
	}
}

func (n *Node) IsAlive() bool {
	return atomic.LoadInt32(&n.status) != int32(Offline)
}

func (n *Node) IsDishonest() bool {
	return atomic.LoadInt32(&n.status) == int32(Dishonest)
}

func (n *Node) GetRouter() *network.Router {
	return n.router
}

func (n *Node) GetID() string {
	return n.ID
}

func (n *Node) PollPreference(tradeID string) (bool, bool) {
	if !n.IsAlive() {
		return false, false
	}
	val, ok := n.engines.Load(tradeID)
	if !ok {
		return false, false
	}
	engine := val.(*consensus.SnowballEngine)
	return engine.GetPreference(), true
}

func (n *Node) Receive(msg network.Message) {
	if !n.IsAlive() {
		return // Drop message
	}
	select {
	case n.Mailbox <- msg:
	default:
		// Mailbox full, drop to simulate congestion
	}
}

func (n *Node) processMailbox() {
	for {
		select {
		case msg := <-n.Mailbox:
			n.handleMessage(msg)
		case <-n.stopCh:
			return
		}
	}
}

func (n *Node) handleMessage(msg network.Message) {
	// Duplicate suppression
	if _, seen := n.seenMsgs.LoadOrStore(msg.ID, true); seen {
		return
	}

	// Gossip propagation (simple epidemic)
	if msg.TTL > 1 {
		msg.TTL--
		n.router.Gossip(msg, 3, n.ID) // Gossip to 3 random peers
	}

	if msg.Type == network.MsgTradeProposal {
		tp, ok := msg.Payload.(consensus.TradeProposal)
		if !ok {
			return
		}
		
		// If we haven't seen this trade before, start a consensus engine
		engine := consensus.NewSnowballEngine(n, tp, consensus.DefaultParams)
		if _, loaded := n.engines.LoadOrStore(tp.ID, engine); !loaded {
			go engine.Run()
		}
	}
}

// ProposeTrade is called by the UI/Orchestrator to start a new trade.
func (n *Node) ProposeTrade(tp consensus.TradeProposal) {
	msg := network.Message{
		ID:        "msg-tp-" + tp.ID,
		Type:      network.MsgTradeProposal,
		SenderID:  n.ID,
		Payload:   tp,
		TTL:       5, // TTL for gossip hops
		Timestamp: tp.Timestamp,
	}
	events.Emit(events.TradeProposalCreated, tp)
	n.Receive(msg)
	n.router.Gossip(msg, 3, n.ID)
}
