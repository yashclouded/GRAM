package auction

import "time"

type FarmerListing struct {
	ListingID         string
	FarmerNodeID      string
	Crop              string
	Quantity          float64
	QualityGrade      string
	QualityConfidence float64
	QualityReasoning  string
	ExpectedPrice     float64
	Location          string
	Timestamp         time.Time
}

type BuyerDemand struct {
	DemandID         string
	BuyerNodeID      string
	Crop             string
	RequiredQuantity float64
	MaxPrice         float64
	Location         string
	Timestamp        time.Time
}

type TransportOffer struct {
	OfferID           string
	TransporterNodeID string
	AvailableCapacity float64
	CostPerKm         float64
	OperatingRegion   string
	Timestamp         time.Time
}

type TradeStatus string

const (
	StatusProposed  TradeStatus = "Proposed"
	StatusMatched   TradeStatus = "Matched"
	StatusPending   TradeStatus = "Pending"
	StatusAccepted  TradeStatus = "Accepted"
	StatusRejected  TradeStatus = "Rejected"
	StatusInTransit TradeStatus = "InTransit"
	StatusDelivered TradeStatus = "Delivered"
	StatusSettled   TradeStatus = "Settled"
	StatusFailed    TradeStatus = "Failed"
)

type Trade struct {
	TradeID           string
	FarmerNodeID      string
	BuyerNodeID       string
	TransporterNodeID string
	Crop              string
	Quantity          float64
	AgreedPrice       float64
	QualityGrade      string
	QualityConfidence float64
	TransportCost     float64
	Status            TradeStatus
}
