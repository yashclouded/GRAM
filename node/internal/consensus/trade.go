package consensus

import "time"

type TradeProposal struct {
	ID             string
	ProposerNodeID string
	Crop           string
	Quantity       float64
	Price          float64
	Timestamp      time.Time
}

func (tp *TradeProposal) IsValid() bool {
	return tp.Quantity > 0 && tp.Price > 0 && tp.Crop != ""
}
