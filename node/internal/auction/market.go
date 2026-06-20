package auction

import (
	"time"

	"github.com/yashsingh/agrinerve/node/internal/consensus"
	"github.com/yashsingh/agrinerve/node/internal/events"
	"github.com/yashsingh/agrinerve/node/internal/orchestrator"
)

type Market struct {
	Orch      *orchestrator.Orchestrator
	Listings  []FarmerListing
	Demands   []BuyerDemand
	Offers    []TransportOffer
	AllTrades []Trade
}

func NewMarket(orch *orchestrator.Orchestrator) *Market {
	return &Market{
		Orch:      orch,
		Listings:  make([]FarmerListing, 0),
		Demands:   make([]BuyerDemand, 0),
		Offers:    make([]TransportOffer, 0),
		AllTrades: make([]Trade, 0),
	}
}

func (m *Market) AddListing(l FarmerListing) {
	m.Listings = append(m.Listings, l)
	events.Emit(events.ListingCreated, l)
}

func (m *Market) AddDemand(d BuyerDemand) {
	m.Demands = append(m.Demands, d)
	events.Emit(events.DemandCreated, d)
}

func (m *Market) AddOffer(o TransportOffer) {
	m.Offers = append(m.Offers, o)
	events.Emit(events.TransportOfferCreated, o)
}

func (m *Market) RunMarketCycle() {
	start := time.Now()

	// 1. Generate Matches
	trades := GenerateMatches(m.Listings, m.Demands, m.Offers)

	// 2. Propose to Consensus
	for _, t := range trades {
		events.Emit(events.MatchGenerated, t)

		tp := consensus.TradeProposal{
			ID:             t.TradeID,
			ProposerNodeID: t.FarmerNodeID, // Farmer is technically the consensus proposer here
			Crop:           t.Crop,
			Quantity:       t.Quantity,
			Price:          t.AgreedPrice,
			Timestamp:      time.Now(),
		}

		// Inject directly to orchestrator to trigger gossip & Snowball
		t.Status = StatusConsensusPending
		m.AllTrades = append(m.AllTrades, t)
		
		events.Emit(events.TradeSubmittedToConsensus, tp)
		
		// Find the actual node object to call ProposeTrade
		m.Orch.GetNodeByID(t.FarmerNodeID).ProposeTrade(tp)
	}

	duration := time.Since(start)
	events.Emit(events.MarketCycleCompleted, map[string]interface{}{
		"matchesGenerated": len(trades),
		"durationMs":       duration.Milliseconds(),
	})

	// Clear out matched orders for MVP simplicity (in reality, we'd remove specific IDs)
	m.Listings = nil
	m.Demands = nil
	m.Offers = nil
}
