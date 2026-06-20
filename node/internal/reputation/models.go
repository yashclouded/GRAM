package reputation

import "time"

const (
	StartingScore         = 50
	ScoreDelivered        = 2
	ScoreSettled          = 3
	PenaltyFailed         = -5
	PenaltyConsensusAbuse = -10
	PenaltyDishonest      = -15
)

type ReputationProfile struct {
	NodeID             string
	Score              int
	CompletedTrades    int
	FailedTrades       int
	DishonestIncidents int
	LastUpdated        time.Time
}

func NewProfile(nodeID string) *ReputationProfile {
	return &ReputationProfile{
		NodeID:      nodeID,
		Score:       StartingScore,
		LastUpdated: time.Now(),
	}
}

