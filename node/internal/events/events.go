package events

import "time"

type EventType string

const (
	NodeSpawned             EventType = "NodeSpawned"
	NodeKilled              EventType = "NodeKilled"
	MessagePropagated       EventType = "MessagePropagated"
	TradeProposalCreated    EventType = "TradeProposalCreated"
	VotingStarted           EventType = "VotingStarted"
	VoteCast                EventType = "VoteCast"
	ConsensusRoundCompleted EventType = "ConsensusRoundCompleted"
	ConsensusAccepted       EventType = "ConsensusAccepted"
	ConsensusRejected       EventType = "ConsensusRejected"
	ChaosTriggered          EventType = "ChaosTriggered"
	DishonestNodeInjected   EventType = "DishonestNodeInjected"
	NodeRecovered           EventType = "NodeRecovered"
	MetricsUpdated          EventType = "MetricsUpdated"

	// Auction & Market Events
	ListingCreated            EventType = "ListingCreated"
	DemandCreated             EventType = "DemandCreated"
	TransportOfferCreated     EventType = "TransportOfferCreated"
	MatchGenerated            EventType = "MatchGenerated"
	TradeSubmittedToConsensus EventType = "TradeSubmittedToConsensus"
	MarketCycleCompleted      EventType = "MarketCycleCompleted"

	// AI Events
	CropImageUploaded      EventType = "CropImageUploaded"
	CropGraded             EventType = "CropGraded"
	GradeAttachedToListing EventType = "GradeAttachedToListing"
	AIGradingFailed        EventType = "AIGradingFailed"
)

type Event struct {
	Type      EventType
	Timestamp time.Time
	Payload   interface{}
}

// Global Event Bus (simple for simulation)
var Bus = make(chan Event, 10000)

func Emit(eventType EventType, payload interface{}) {
	select {
	case Bus <- Event{Type: eventType, Timestamp: time.Now(), Payload: payload}:
	default:
		// Drop events if channel is full to prevent simulation hang
	}
}
