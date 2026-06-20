package auction

import (
	"testing"
	"time"

	"github.com/yashsingh/agrinerve/node/internal/reputation"
)

func TestMatcher_ValidMatch(t *testing.T) {
	listings := []FarmerListing{
		{ListingID: "L1", FarmerNodeID: "F1", Crop: "Wheat", Quantity: 100, ExpectedPrice: 2000, Timestamp: time.Now()},
	}
	demands := []BuyerDemand{
		{DemandID: "D1", BuyerNodeID: "B1", Crop: "Wheat", RequiredQuantity: 100, MaxPrice: 2500, Timestamp: time.Now()},
	}
	offers := []TransportOffer{
		{OfferID: "O1", TransporterNodeID: "T1", AvailableCapacity: 500, CostPerKm: 10, Timestamp: time.Now()},
	}

	trades := GenerateMatches(listings, demands, offers, reputation.NewManager())
	if len(trades) != 1 {
		t.Fatalf("Expected 1 trade, got %d", len(trades))
	}

	trade := trades[0]
	if trade.FarmerNodeID != "F1" || trade.BuyerNodeID != "B1" || trade.TransporterNodeID != "T1" {
		t.Errorf("Trade participants mismatch: %+v", trade)
	}

	expectedCost := listings[0].ExpectedPrice // 2000
	if trade.AgreedPrice != expectedCost {
		t.Errorf("Expected price %f, got %f", expectedCost, trade.AgreedPrice)
	}
	if trade.TransportCost != 100 { // 10 * 10
		t.Errorf("Expected transport cost 100, got %f", trade.TransportCost)
	}
}

func TestMatcher_InvalidPrice(t *testing.T) {
	listings := []FarmerListing{
		{ListingID: "L1", FarmerNodeID: "F1", Crop: "Wheat", Quantity: 100, ExpectedPrice: 2500, Timestamp: time.Now()},
	}
	demands := []BuyerDemand{
		{DemandID: "D1", BuyerNodeID: "B1", Crop: "Wheat", RequiredQuantity: 100, MaxPrice: 2000, Timestamp: time.Now()},
	}
	offers := []TransportOffer{
		{OfferID: "O1", TransporterNodeID: "T1", AvailableCapacity: 500, CostPerKm: 10, Timestamp: time.Now()},
	}

	trades := GenerateMatches(listings, demands, offers, reputation.NewManager())
	if len(trades) != 0 {
		t.Fatalf("Expected 0 trades due to price mismatch, got %d", len(trades))
	}
}

func TestMatcher_InvalidCapacity(t *testing.T) {
	listings := []FarmerListing{
		{ListingID: "L1", FarmerNodeID: "F1", Crop: "Wheat", Quantity: 100, ExpectedPrice: 1000, Timestamp: time.Now()},
	}
	demands := []BuyerDemand{
		{DemandID: "D1", BuyerNodeID: "B1", Crop: "Wheat", RequiredQuantity: 100, MaxPrice: 2000, Timestamp: time.Now()},
	}
	offers := []TransportOffer{
		{OfferID: "O1", TransporterNodeID: "T1", AvailableCapacity: 50, CostPerKm: 10, Timestamp: time.Now()},
	}

	trades := GenerateMatches(listings, demands, offers, reputation.NewManager())
	if len(trades) != 0 {
		t.Fatalf("Expected 0 trades due to capacity mismatch, got %d", len(trades))
	}
}

func TestMatcher_GreedySelection(t *testing.T) {
	// 1 Farmer, 2 Buyers, 1 Transporter
	listings := []FarmerListing{
		{ListingID: "L1", FarmerNodeID: "F1", Crop: "Rice", Quantity: 50, ExpectedPrice: 1000, Timestamp: time.Now()},
	}
	demands := []BuyerDemand{
		{DemandID: "D1", BuyerNodeID: "B1", Crop: "Rice", RequiredQuantity: 50, MaxPrice: 1500, Timestamp: time.Now()}, // Margin = 1500 - 1100 = 400
		{DemandID: "D2", BuyerNodeID: "B2", Crop: "Rice", RequiredQuantity: 50, MaxPrice: 2000, Timestamp: time.Now()}, // Margin = 2000 - 1100 = 900
	}
	offers := []TransportOffer{
		{OfferID: "O1", TransporterNodeID: "T1", AvailableCapacity: 100, CostPerKm: 10, Timestamp: time.Now()},
	}

	trades := GenerateMatches(listings, demands, offers, reputation.NewManager())
	if len(trades) != 1 {
		t.Fatalf("Expected exactly 1 trade because farmer can only be matched once, got %d", len(trades))
	}

	trade := trades[0]
	// Should match with B2 because B2 provides a larger margin (better score)
	if trade.BuyerNodeID != "B2" {
		t.Errorf("Expected match with B2 (better score), but got %s", trade.BuyerNodeID)
	}
}
