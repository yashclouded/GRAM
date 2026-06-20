package consensus

import (
	"math/rand"
	"time"

	"github.com/yashsingh/agrinerve/node/internal/events"
	"github.com/yashsingh/agrinerve/node/internal/network"
)

// SnowballParams defines the constants for the consensus loop.
type SnowballParams struct {
	K     int // Sample size (e.g., 5)
	Alpha int // Quorum threshold (e.g., 4)
	Beta  int // Decision threshold / Confidence (e.g., 10)
}

var DefaultParams = SnowballParams{
	K:     5,
	Alpha: 4,
	Beta:  10,
}

// NodeInterface defines the capabilities the Snowball engine needs from the local Node.
type NodeInterface interface {
	GetID() string
	IsDishonest() bool
	GetRouter() *network.Router
}

type SnowballEngine struct {
	trade       TradeProposal
	node        NodeInterface
	params      SnowballParams
	preference  bool
	confidence  int
	lastSuccess bool
	done        chan struct{}
	finalized   bool
	accepted    bool
}

func NewSnowballEngine(n NodeInterface, tp TradeProposal, params SnowballParams) *SnowballEngine {
	// Honest initial preference is based on validity
	initialPref := tp.IsValid()

	// Dishonest nodes randomly flip their initial preference
	if n.IsDishonest() {
		initialPref = rand.Intn(2) == 0
	}

	return &SnowballEngine{
		trade:      tp,
		node:       n,
		params:     params,
		preference: initialPref,
		done:       make(chan struct{}),
	}
}

func (s *SnowballEngine) GetPreference() bool {
	if s.node.IsDishonest() {
		// Dishonest nodes return random junk to disrupt consensus
		return rand.Intn(2) == 0
	}
	return s.preference
}

func (s *SnowballEngine) Run() {
	events.Emit(events.VotingStarted, map[string]interface{}{
		"nodeID":  s.node.GetID(),
		"tradeID": s.trade.ID,
	})

	round := 0
	for {
		if s.confidence >= s.params.Beta {
			s.finalize(s.preference)
			return
		}

		round++
		s.doRound(round)

		// Hard stop if consensus never converges (e.g., network fragmented forever)
		if round > 50 {
			s.finalize(false)
			return
		}

		// Small delay to simulate RTT and prevent CPU spinning
		time.Sleep(10 * time.Millisecond)
	}
}

func (s *SnowballEngine) doRound(round int) {
	peers := s.node.GetRouter().GetRandomPeers(s.params.K, s.node.GetID())

	yesVotes := 0
	noVotes := 0

	for _, p := range peers {
		// Synchronous RPC call simulation
		pref, known := p.PollPreference(s.trade.ID)
		if known {
			if pref {
				yesVotes++
			} else {
				noVotes++
			}
		}
	}

	events.Emit(events.VoteCast, map[string]interface{}{
		"nodeID":  s.node.GetID(),
		"tradeID": s.trade.ID,
		"round":   round,
		"yes":     yesVotes,
		"no":      noVotes,
	})

	var majorityPref bool
	var achievedQuorum bool

	if yesVotes >= s.params.Alpha {
		majorityPref = true
		achievedQuorum = true
	} else if noVotes >= s.params.Alpha {
		majorityPref = false
		achievedQuorum = true
	}

	if achievedQuorum {
		s.preference = majorityPref
		if majorityPref == s.lastSuccess {
			s.confidence++
		} else {
			s.confidence = 1
			s.lastSuccess = majorityPref
		}
	} else {
		s.confidence = 0
	}

	events.Emit(events.ConsensusRoundCompleted, map[string]interface{}{
		"nodeID":     s.node.GetID(),
		"tradeID":    s.trade.ID,
		"round":      round,
		"preference": s.preference,
		"confidence": s.confidence,
	})
}

func (s *SnowballEngine) finalize(accepted bool) {
	s.finalized = true
	s.accepted = accepted
	if accepted {
		events.Emit(events.ConsensusAccepted, map[string]interface{}{
			"nodeID":  s.node.GetID(),
			"tradeID": s.trade.ID,
		})
	} else {
		events.Emit(events.ConsensusRejected, map[string]interface{}{
			"nodeID":  s.node.GetID(),
			"tradeID": s.trade.ID,
		})
	}
	close(s.done)
}

func (s *SnowballEngine) Wait() bool {
	<-s.done
	return s.accepted
}
