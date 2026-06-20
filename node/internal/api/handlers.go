package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/yashsingh/agrinerve/node/internal/ai"
	"github.com/yashsingh/agrinerve/node/internal/auction"
)

// Response Helpers
func respondJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(payload)
}

func (s *Server) getMetrics(w http.ResponseWriter, r *http.Request) {
	m := s.Orch.GetMetrics()
	// Safely copy metrics to avoid holding the lock during serialization
	m.Mu.RLock()
	defer m.Mu.RUnlock()
	respondJSON(w, http.StatusOK, m)
}

func (s *Server) getNodes(w http.ResponseWriter, r *http.Request) {
	s.Orch.GetHealthScore() // Force mu.RLock, but we need to access nodes safely
	
	// Create a safe snapshot
	nodes := s.Orch.GetActiveNodes()
	var response []map[string]interface{}
	for _, n := range nodes {
		response = append(response, map[string]interface{}{
			"id":        n.GetID(),
			"type":      n.Type,
			"dishonest": n.IsDishonest(),
			"alive":     n.IsAlive(),
		})
	}
	respondJSON(w, http.StatusOK, response)
}

func (s *Server) getReputation(w http.ResponseWriter, r *http.Request) {
	profiles := s.Orch.RepManager.GetAllProfiles()
	respondJSON(w, http.StatusOK, profiles)
}

type AIRequest struct {
	ImageBase64 string `json:"image"`
}

func (s *Server) gradeCrop(w http.ResponseWriter, r *http.Request) {
	var req AIRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}

	grader := ai.NewGrader()
	res := grader.GradeCropImage(req.ImageBase64)
	respondJSON(w, http.StatusOK, res)
}

func (s *Server) createListing(w http.ResponseWriter, r *http.Request) {
	var l auction.FarmerListing
	if err := json.NewDecoder(r.Body).Decode(&l); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}
	l.ListingID = "L-" + uuid.New().String()[:6]
	l.Timestamp = time.Now()
	s.Market.AddListing(l)
	respondJSON(w, http.StatusOK, map[string]string{"status": "listing created", "id": l.ListingID})
}

func (s *Server) createDemand(w http.ResponseWriter, r *http.Request) {
	var d auction.BuyerDemand
	if err := json.NewDecoder(r.Body).Decode(&d); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}
	d.DemandID = "D-" + uuid.New().String()[:6]
	d.Timestamp = time.Now()
	s.Market.AddDemand(d)
	respondJSON(w, http.StatusOK, map[string]string{"status": "demand created", "id": d.DemandID})
}

func (s *Server) createOffer(w http.ResponseWriter, r *http.Request) {
	var o auction.TransportOffer
	if err := json.NewDecoder(r.Body).Decode(&o); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}
	o.OfferID = "O-" + uuid.New().String()[:6]
	o.Timestamp = time.Now()
	s.Market.AddOffer(o)
	respondJSON(w, http.StatusOK, map[string]string{"status": "offer created", "id": o.OfferID})
}

func (s *Server) runMarketCycle(w http.ResponseWriter, r *http.Request) {
	go s.Market.RunMarketCycle()
	respondJSON(w, http.StatusOK, map[string]string{"status": "market cycle started"})
}

func (s *Server) killNodes(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Percentage int `json:"percentage"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}
	s.Orch.KillPercentage(req.Percentage)
	respondJSON(w, http.StatusOK, map[string]string{"status": "chaos triggered"})
}

func (s *Server) recoverNodes(w http.ResponseWriter, r *http.Request) {
	s.Orch.RecoverAll()
	respondJSON(w, http.StatusOK, map[string]string{"status": "nodes recovered"})
}

func (s *Server) runDemoScenario(w http.ResponseWriter, r *http.Request) {
	// A helper to automatically inject a trade, run consensus, and settle it
	go func() {
		grader := ai.NewGrader()
		grade := grader.GradeCropImage("") // Uses default demo fallback if empty

		l := auction.FarmerListing{
			ListingID:         "DEMO-L",
			FarmerNodeID:      "farmer-0",
			Crop:              "Wheat",
			Quantity:          100,
			ExpectedPrice:     2000,
			QualityGrade:      grade.Grade,
			QualityConfidence: grade.Confidence,
			QualityReasoning:  grade.Reasoning,
			Timestamp:         time.Now(),
		}
		s.Market.AddListing(l)

		d := auction.BuyerDemand{
			DemandID:         "DEMO-D",
			BuyerNodeID:      "buyer-0",
			Crop:             "Wheat",
			RequiredQuantity: 100,
			MaxPrice:         2500,
			Timestamp:        time.Now(),
		}
		s.Market.AddDemand(d)
		
		o := auction.TransportOffer{
			OfferID:           "DEMO-O",
			TransporterNodeID: "transporter-0",
			AvailableCapacity: 500,
			CostPerKm:         10,
			Timestamp:         time.Now(),
		}
		s.Market.AddOffer(o)

		time.Sleep(500 * time.Millisecond)
		s.Market.RunMarketCycle()
		time.Sleep(2 * time.Second)
		
		// If matched, simulate settlement
		if len(s.Market.AllTrades) > 0 {
			t := s.Market.AllTrades[len(s.Market.AllTrades)-1]
			s.Orch.SimulateSettlement(t.TradeID, t.FarmerNodeID, t.BuyerNodeID, t.TransporterNodeID, true)
		}
	}()
	respondJSON(w, http.StatusOK, map[string]string{"status": "demo scenario started"})
}
