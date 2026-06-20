package network

import (
	"math/rand"
	"sync"
	"time"

	"github.com/yashsingh/agrinerve/node/internal/events"
)

type NodeEndpoint interface {
	Receive(msg Message)
	IsAlive() bool
	GetID() string
	PollPreference(tradeID string) (bool, bool)
}

type Router struct {
	mu    sync.RWMutex
	nodes map[string]NodeEndpoint
}

func NewRouter() *Router {
	return &Router{
		nodes: make(map[string]NodeEndpoint),
	}
}

func (r *Router) Register(n NodeEndpoint) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.nodes[n.GetID()] = n
}

// Gossip forwards a message to k random peers
func (r *Router) Gossip(msg Message, k int, excludeID string) {
	if msg.TTL <= 0 {
		return
	}

	r.mu.RLock()
	var peers []NodeEndpoint
	for id, n := range r.nodes {
		if id != excludeID && id != msg.SenderID && n.IsAlive() {
			peers = append(peers, n)
		}
	}
	r.mu.RUnlock()

	// Randomly shuffle and pick k peers
	rand.Seed(time.Now().UnixNano())
	rand.Shuffle(len(peers), func(i, j int) { peers[i], peers[j] = peers[j], peers[i] })

	targets := k
	if len(peers) < k {
		targets = len(peers)
	}

	for i := 0; i < targets; i++ {
		target := peers[i]
		go func(p NodeEndpoint, m Message) {
			p.Receive(m)
			events.Emit(events.MessagePropagated, map[string]string{"from": m.SenderID, "to": p.GetID()})
		}(target, msg)
	}
}

// GetRandomPeers returns k random active peers, excluding excludeID.
func (r *Router) GetRandomPeers(k int, excludeID string) []NodeEndpoint {
	r.mu.RLock()
	var peers []NodeEndpoint
	for id, n := range r.nodes {
		if id != excludeID && n.IsAlive() {
			peers = append(peers, n)
		}
	}
	r.mu.RUnlock()

	rand.Seed(time.Now().UnixNano())
	rand.Shuffle(len(peers), func(i, j int) { peers[i], peers[j] = peers[j], peers[i] })

	targets := k
	if len(peers) < k {
		targets = len(peers)
	}

	return peers[:targets]
}
