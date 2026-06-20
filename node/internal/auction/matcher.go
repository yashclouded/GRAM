package auction

import (
	"fmt"
	"math"
	"sort"

	"github.com/yashsingh/agrinerve/node/internal/reputation"
)

type MatchCandidate struct {
	Listing     FarmerListing
	Demand      BuyerDemand
	Offer       TransportOffer
	Score       float64
	Margin      float64
	AgreedPrice float64
}

// GenerateMatches runs the deterministic O(F * B * T) matching algorithm.
func GenerateMatches(listings []FarmerListing, demands []BuyerDemand, offers []TransportOffer, repMap map[string]*reputation.ReputationProfile) []Trade {
	var candidates []MatchCandidate

	for _, l := range listings {
		for _, d := range demands {
			// Constraint: Crop must match
			if l.Crop != d.Crop {
				continue
			}

			// Constraint: Quantity must be compatible (Buyer demands <= Farmer has)
			// For simplicity in the hackathon MVP, we'll only match if the farmer has at least what the buyer wants
			if l.Quantity < d.RequiredQuantity {
				continue
			}

			for _, o := range offers {
				// Constraint: Transport capacity must handle the buyer's required quantity
				if o.AvailableCapacity < d.RequiredQuantity {
					continue
				}

				// Fetch Reputation Profiles
				var fRep, bRep, tRep *reputation.ReputationProfile
				if repMap != nil {
					fRep = repMap[l.FarmerNodeID]
					bRep = repMap[d.BuyerNodeID]
					tRep = repMap[o.TransporterNodeID]
				}

				// Calculate simple flat transport cost (ignoring distance for hackathon scope)
				transportCost := o.CostPerKm * 10 // Assume flat 10km for now

				// Constraint: Economics must work
				// BuyerMaxPrice must be >= FarmerExpectedPrice + TransportCost
				totalCost := l.ExpectedPrice + transportCost
				if d.MaxPrice < totalCost {
					continue
				}

				// Calculate Score (0-100)
				// Margin = how much surplus the buyer has
				margin := d.MaxPrice - totalCost

				// Exact quantity match gets a bonus
				quantityScore := 0.0
				if l.Quantity == d.RequiredQuantity {
					quantityScore = 50.0
				} else {
					// Closer quantity matches score higher
					diff := l.Quantity - d.RequiredQuantity
					quantityScore = math.Max(0, 50.0-diff)
				}

				// Margin score: 1 point per 10 currency units of margin
				marginScore := margin * 0.1

				// Continuous trust weighting instead of hard blacklisting
				trustMultiplier := 1.0
				if fRep != nil && bRep != nil && tRep != nil {
					avgRep := (float64(fRep.Score) + float64(bRep.Score) + float64(tRep.Score)) / 3.0
					// Smooth polynomial decay: score * (trust/100)^2
					trustMultiplier = math.Pow(avgRep/100.0, 2)
				}

				baseScore := quantityScore + marginScore

				candidate := MatchCandidate{
					Listing:     l,
					Demand:      d,
					Offer:       o,
					Score:       baseScore * trustMultiplier,
					Margin:      margin,
					AgreedPrice: l.ExpectedPrice, // Farmer gets exactly what they asked for
				}
				candidates = append(candidates, candidate)
			}
		}
	}

	// Sort candidates by score descending
	sort.SliceStable(candidates, func(i, j int) bool {
		if candidates[i].Score != candidates[j].Score {
			return candidates[i].Score > candidates[j].Score
		}
		// Deterministic tie-breaker
		hashI := candidates[i].Listing.ListingID + candidates[i].Demand.DemandID + candidates[i].Offer.OfferID
		hashJ := candidates[j].Listing.ListingID + candidates[j].Demand.DemandID + candidates[j].Offer.OfferID
		return hashI > hashJ
	})

	// Greedily select non-overlapping matches
	var finalizedTrades []Trade
	usedFarmers := make(map[string]bool)
	usedBuyers := make(map[string]bool)
	usedTransporters := make(map[string]bool)

	for _, c := range candidates {
		// In a real system, partial fills would exist. For MVP, we completely lock the entities.
		if usedFarmers[c.Listing.FarmerNodeID] ||
			usedBuyers[c.Demand.BuyerNodeID] ||
			usedTransporters[c.Offer.TransporterNodeID] {
			continue
		}

		// Mark as used
		usedFarmers[c.Listing.FarmerNodeID] = true
		usedBuyers[c.Demand.BuyerNodeID] = true
		usedTransporters[c.Offer.TransporterNodeID] = true

		// Create Trade
		trade := Trade{
			TradeID:           fmt.Sprintf("trade-%s-%s-%s", c.Listing.ListingID, c.Demand.DemandID, c.Offer.OfferID),
			FarmerNodeID:      c.Listing.FarmerNodeID,
			BuyerNodeID:       c.Demand.BuyerNodeID,
			TransporterNodeID: c.Offer.TransporterNodeID,
			Crop:              c.Listing.Crop,
			Quantity:          c.Demand.RequiredQuantity, // Fulfilling exactly what buyer requested
			AgreedPrice:       c.AgreedPrice,
			QualityGrade:      c.Listing.QualityGrade,
			QualityConfidence: c.Listing.QualityConfidence,
			TransportCost:     c.Offer.CostPerKm * 10,
			Status:            StatusMatched,
		}
		finalizedTrades = append(finalizedTrades, trade)
	}

	return finalizedTrades
}
