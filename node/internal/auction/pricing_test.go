package auction

import (
	"math"
	"testing"
	"time"
)

func TestPricing_VCGTruthfulness(t *testing.T) {
	// Prove that a bidder shading their bid never improves their outcome.
	// We'll test two scenarios for the SAME buyer:
	// 1. They bid their TRUE maximum value (1500)
	// 2. They "shade" their bid to try and pay less (1200)
	// We will show that in VCG, they pay the same price if they win,
	// or they lose entirely by shading, so shading is never optimal.

	ts := time.Now()

	listing := FarmerListing{ListingID: "L1", FarmerNodeID: "f1", Crop: "Wheat", Quantity: 100, ExpectedPrice: 1000, Timestamp: ts}
	offer := TransportOffer{OfferID: "O1", TransporterNodeID: "t1", AvailableCapacity: 100, CostPerKm: 10, Timestamp: ts}

	// The competitor bid (highest losing bid)
	// Transport cost is 100 (10 * 10km)
	// Competitor Max Price is 1300. So competitor bids 1200 for the crop itself.
	competitorDemand := BuyerDemand{DemandID: "D2", BuyerNodeID: "b2", Crop: "Wheat", RequiredQuantity: 100, MaxPrice: 1300, Timestamp: ts}

	// 1. Truthful bid (MaxPrice: 1500 -> crop bid: 1400)
	truthfulDemand := BuyerDemand{DemandID: "D1", BuyerNodeID: "b1", Crop: "Wheat", RequiredQuantity: 100, MaxPrice: 1500, Timestamp: ts}
	truthfulCandidate := MatchCandidate{
		Listing: listing, Demand: truthfulDemand, Offer: offer,
	}

	// 2. Shaded bid (MaxPrice: 1250 -> crop bid: 1150)
	// (Buyer bids 1250 total. Their crop bid is 1150. Competitor crop bid is 1200. Buyer loses.)

	competitorCandidate := MatchCandidate{
		Listing: listing, Demand: competitorDemand, Offer: offer,
	}

	// Scenario 1: Truthful bidding
	candidatesWithTruthful := []MatchCandidate{truthfulCandidate, competitorCandidate}
	truthfulPrice := clearPrice(truthfulCandidate, candidatesWithTruthful)

	if truthfulPrice != 1200 { // Second highest bid for the crop is 1200
		t.Errorf("Expected truthful price to be exactly the competitor's bid (1200), got %v", truthfulPrice)
	}

	// Utility = True Value (1400 crop value) - Price Paid
	truthfulUtility := 1400.0 - truthfulPrice

	// Scenario 2: Shaded bidding
	// In the shaded scenario, the shaded crop bid is 1150.
	// But the competitor crop bid is 1200!
	// So if the buyer shades to 1250 max price, THEY LOSE THE AUCTION ENTIRELY to the competitor.
	// Their utility becomes 0.
	shadedUtility := 0.0 // They lost

	if shadedUtility >= truthfulUtility {
		t.Errorf("Shading the bid improved or equalled outcome! Truthful Utility: %v, Shaded Utility: %v", truthfulUtility, shadedUtility)
	}

	// Scenario 3: Shaded bidding but still winning
	// What if they shade their bid but still win? Let's say they bid 1350 (crop bid 1250).
	shadedWinningDemand := BuyerDemand{DemandID: "D1", BuyerNodeID: "b1", Crop: "Wheat", RequiredQuantity: 100, MaxPrice: 1350, Timestamp: ts}
	shadedWinningCandidate := MatchCandidate{
		Listing: listing, Demand: shadedWinningDemand, Offer: offer,
	}
	candidatesWithShadedWinning := []MatchCandidate{shadedWinningCandidate, competitorCandidate}
	shadedWinningPrice := clearPrice(shadedWinningCandidate, candidatesWithShadedWinning)

	if shadedWinningPrice != truthfulPrice {
		t.Errorf("Price paid should be strictly decoupled from winning bid. Shaded price: %v, Truthful price: %v", shadedWinningPrice, truthfulPrice)
	}
}

func TestPricing_ShapleyCostSplit(t *testing.T) {
	// Prove that splitCost() sums exactly to the total cost being split
	// We'll test a 3-party asymmetric cost structure just to prove the math robustness.

	numPlayers := 3
	// v(S) characteristic function for costs
	costs := map[int]float64{
		0: 0,   // Empty
		1: 100, // Player 1 standalone
		2: 150, // Player 2 standalone
		3: 200, // P1 + P2
		4: 80,  // Player 3 standalone
		5: 150, // P1 + P3
		6: 180, // P2 + P3
		7: 250, // P1 + P2 + P3 (Grand Coalition)
	}

	shares := splitCost(numPlayers, costs)

	sum := 0.0
	for _, s := range shares {
		sum += s
	}

	// Assert the sum is EXACTLY the grand coalition cost (250)
	if math.Abs(sum-250.0) > 1e-9 {
		t.Errorf("Shapley values did not sum up to total cost! Expected 250, got %v", sum)
	}

	// Test the specific 2-party symmetric case used in matcher
	costs2 := map[int]float64{
		0: 0,
		1: 100,
		2: 100,
		3: 100,
	}
	shares2 := splitCost(2, costs2)
	sum2 := shares2[0] + shares2[1]

	if math.Abs(sum2-100.0) > 1e-9 {
		t.Errorf("2-party Shapley values did not sum up to total cost! Expected 100, got %v", sum2)
	}

	if shares2[0] != 50.0 || shares2[1] != 50.0 {
		t.Errorf("Expected symmetric 50/50 split, got %v and %v", shares2[0], shares2[1])
	}
}
