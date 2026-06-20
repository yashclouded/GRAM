package node

import (
	"sync"
	"sync/atomic"

	"github.com/yashsingh/agrinerve/node/internal/auction"
	"github.com/yashsingh/agrinerve/node/internal/consensus"
	"github.com/yashsingh/agrinerve/node/internal/events"
	"github.com/yashsingh/agrinerve/node/internal/network"
	"github.com/yashsingh/agrinerve/node/internal/oracle"
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
	ID             string
	Type           NodeType
	status         int32 // atomic usage
	Mailbox        chan network.Message
	router         *network.Router
	seenMsgs       sync.Map // Duplicate suppression
	engines        sync.Map // tradeID -> *consensus.SnowballEngine
	stopCh         chan struct{}
	listings       []auction.FarmerListing
	demands        []auction.BuyerDemand
	offers         []auction.TransportOffer
	stateMu        sync.RWMutex
	proposedTrades sync.Map
	Oracle         *oracle.PriceOracle
}

func NewNode(id string, nType NodeType, router *network.Router, oracle *oracle.PriceOracle) *Node {
	n := &Node{
		ID:       id,
		Type:     nType,
		status:   int32(Alive),
		Mailbox:  make(chan network.Message, 100),
		router:   router,
		stopCh:   make(chan struct{}),
		listings: make([]auction.FarmerListing, 0),
		demands:  make([]auction.BuyerDemand, 0),
		offers:   make([]auction.TransportOffer, 0),
		Oracle:   oracle,
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
	} else if msg.Type == network.MsgListing {
		if l, ok := msg.Payload.(auction.FarmerListing); ok {
			n.stateMu.Lock()
			n.listings = append(n.listings, l)
			n.stateMu.Unlock()
			n.runLocalMatcher()
		}
	} else if msg.Type == network.MsgDemand {
		if d, ok := msg.Payload.(auction.BuyerDemand); ok {
			n.stateMu.Lock()
			n.demands = append(n.demands, d)
			n.stateMu.Unlock()
			n.runLocalMatcher()
		}
	} else if msg.Type == network.MsgOffer {
		if o, ok := msg.Payload.(auction.TransportOffer); ok {
			n.stateMu.Lock()
			n.offers = append(n.offers, o)
			n.stateMu.Unlock()
			n.runLocalMatcher()
		}
	}
}

func (n *Node) runLocalMatcher() {
	n.stateMu.RLock()
	listingsCopy := make([]auction.FarmerListing, len(n.listings))
	copy(listingsCopy, n.listings)
	demandsCopy := make([]auction.BuyerDemand, len(n.demands))
	copy(demandsCopy, n.demands)
	offersCopy := make([]auction.TransportOffer, len(n.offers))
	copy(offersCopy, n.offers)
	n.stateMu.RUnlock()

	// Pure matching algorithm on local view
	trades := auction.GenerateMatches(listingsCopy, demandsCopy, offersCopy, nil, n.Oracle)

	for _, t := range trades {
		if _, proposed := n.proposedTrades.LoadOrStore(t.TradeID, true); !proposed {
			tp := consensus.TradeProposal{
				ID:             t.TradeID,
				ProposerNodeID: n.ID,
				Crop:           t.Crop,
				Quantity:       t.Quantity,
				Price:          t.AgreedPrice,
			}
			events.Emit(events.MatchGenerated, t)
			n.ProposeTrade(tp)
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
