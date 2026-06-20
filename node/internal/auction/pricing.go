package auction

// clearPrice implements true second-price (VCG-style) logic.
// The price paid for the listing is set by the highest losing bid for that same supply.
func clearPrice(winner MatchCandidate, allCandidates []MatchCandidate) float64 {
	// The farmer's reserve price is the minimum they will accept.
	secondHighestBid := winner.Listing.ExpectedPrice

	for _, c := range allCandidates {
		// Look at competing candidates for the EXACT same listing, but a DIFFERENT demand (buyer)
		if c.Listing.ListingID == winner.Listing.ListingID && c.Demand.DemandID != winner.Demand.DemandID {
			// A competitor's effective bid for the crop itself is their max price minus the transport cost they need to pay
			competitorTransportCost := c.Offer.CostPerKm * 10
			competitorCropBid := c.Demand.MaxPrice - competitorTransportCost

			if competitorCropBid > secondHighestBid {
				secondHighestBid = competitorCropBid
			}
		}
	}

	// In VCG, the winner never pays more than their own maximum bid.
	winnerMaxCropBid := winner.Demand.MaxPrice - (winner.Offer.CostPerKm * 10)
	if secondHighestBid > winnerMaxCropBid {
		secondHighestBid = winnerMaxCropBid
	}

	return secondHighestBid
}

// splitCost implements the exact Shapley value for a small-coalition cost-sharing case.
// costs is a characteristic function map where the key is a bitmask of players (1<<i),
// and the value is the total cost for that sub-coalition.
func splitCost(numPlayers int, costs map[int]float64) []float64 {
	shares := make([]float64, numPlayers)

	// Simple factorial helper for small coalitions
	fact := func(n int) float64 {
		f := 1.0
		for i := 1; i <= n; i++ {
			f *= float64(i)
		}
		return f
	}

	for i := 0; i < numPlayers; i++ {
		playerBit := 1 << i
		for mask := 0; mask < (1 << numPlayers); mask++ {
			// Iterate over coalitions S that DO NOT contain player i
			if mask&playerBit == 0 {
				subsetSize := 0
				for j := 0; j < numPlayers; j++ {
					if mask&(1<<j) != 0 {
						subsetSize++
					}
				}

				// Standard Shapley weight formula: |S|! * (|N| - |S| - 1)! / |N|!
				weight := (fact(subsetSize) * fact(numPlayers-subsetSize-1)) / fact(numPlayers)

				costWith := costs[mask|playerBit]
				costWithout := costs[mask]
				marginalCost := costWith - costWithout

				shares[i] += weight * marginalCost
			}
		}
	}
	return shares
}
