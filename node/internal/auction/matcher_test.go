package auction

import (
	"testing"
	"time"

	"github.com/yashsingh/agrinerve/node/internal/reputation"
)

func TestContinuousTrustWeighting(t *testing.T) {
	// Scenario: Two identical farmers competing for the same demand/offer.
	// Farmer 1 has a normal trust score (50/100)
	// Farmer 2 is a historically dishonest actor (5/100)

	ts := time.Now()

	listings := []FarmerListing{
		{ListingID: "L1-Honest", FarmerNodeID: "f1-honest", Crop: "Wheat", Quantity: 100, ExpectedPrice: 1000, Timestamp: ts},
		{ListingID: "L2-Dishonest", FarmerNodeID: "f2-dishonest", Crop: "Wheat", Quantity: 100, ExpectedPrice: 1000, Timestamp: ts},
	}

	demands := []BuyerDemand{
		{DemandID: "D1", BuyerNodeID: "b1", Crop: "Wheat", RequiredQuantity: 100, MaxPrice: 1500, Timestamp: ts},
	}

	offers := []TransportOffer{
		{OfferID: "O1", TransporterNodeID: "t1", AvailableCapacity: 100, CostPerKm: 10, Timestamp: ts},
	}

	// Mock reputation profiles
	repMap := map[string]*reputation.ReputationProfile{
		"f1-honest":    {NodeID: "f1-honest", Score: 50},
		"f2-dishonest": {NodeID: "f2-dishonest", Score: 5},
		"b1":           {NodeID: "b1", Score: 50},
		"t1":           {NodeID: "t1", Score: 50},
	}

	// 1. Basic Matching
	trades := GenerateMatches(listings, demands, offers, repMap, nil)
	if len(trades) != 1 {
		t.Fatalf("Expected exactly 1 trade to clear, got %d", len(trades))
	}

	// The honest farmer should overwhelmingly outcompete the dishonest one without explicit blacklists
	if trades[0].FarmerNodeID != "f1-honest" {
		t.Errorf("Expected honest farmer to win the auction, but got %s", trades[0].FarmerNodeID)
	}
}
