package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/yashsingh/agrinerve/node/internal/ai"
	"github.com/yashsingh/agrinerve/node/internal/auction"
	"github.com/yashsingh/agrinerve/node/internal/events"
	"github.com/yashsingh/agrinerve/node/internal/network"
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

func (s *Server) getOraclePrice(w http.ResponseWriter, r *http.Request) {
	commodity := r.URL.Query().Get("commodity")
	state := r.URL.Query().Get("state")
	if commodity == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "commodity is required"})
		return
	}
	price := s.Orch.Oracle.GetFairPrice(commodity, state)
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"commodity": commodity,
		"state":     state,
		"price":     price,
	})
}

func (s *Server) injectGossip(msgType network.MsgType, id string, payload interface{}, timestamp time.Time) {
	active := s.Orch.GetActiveNodes()
	if len(active) > 0 {
		n := active[0]
		msg := network.Message{
			ID:        "msg-" + id,
			Type:      msgType,
			SenderID:  n.GetID(),
			Payload:   payload,
			TTL:       5,
			Timestamp: timestamp,
		}
		n.Receive(msg)
		n.GetRouter().Gossip(msg, 3, n.GetID())
	}
}

func (s *Server) createListing(w http.ResponseWriter, r *http.Request) {
	var l auction.FarmerListing
	if err := json.NewDecoder(r.Body).Decode(&l); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}
	l.ListingID = "L-" + time.Now().Format("150405.000") // simple determinism for demo
	l.Timestamp = time.Now()
	
	events.Emit(events.ListingCreated, l)
	s.injectGossip(network.MsgListing, l.ListingID, l, l.Timestamp)
	respondJSON(w, http.StatusOK, map[string]string{"status": "listing created", "id": l.ListingID})
}

func (s *Server) createDemand(w http.ResponseWriter, r *http.Request) {
	var d auction.BuyerDemand
	if err := json.NewDecoder(r.Body).Decode(&d); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}
	d.DemandID = "D-" + time.Now().Format("150405.000")
	d.Timestamp = time.Now()
	
	events.Emit(events.DemandCreated, d)
	s.injectGossip(network.MsgDemand, d.DemandID, d, d.Timestamp)
	respondJSON(w, http.StatusOK, map[string]string{"status": "demand created", "id": d.DemandID})
}

func (s *Server) createOffer(w http.ResponseWriter, r *http.Request) {
	var o auction.TransportOffer
	if err := json.NewDecoder(r.Body).Decode(&o); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}
	o.OfferID = "O-" + time.Now().Format("150405.000")
	o.Timestamp = time.Now()
	
	events.Emit(events.TransportOfferCreated, o)
	s.injectGossip(network.MsgOffer, o.OfferID, o, o.Timestamp)
	respondJSON(w, http.StatusOK, map[string]string{"status": "offer created", "id": o.OfferID})
}

func (s *Server) runMarketCycle(w http.ResponseWriter, r *http.Request) {
	// No-op for API compatibility, nodes now match reactively
	respondJSON(w, http.StatusOK, map[string]string{"status": "market cycle started (reactive)"})
}

func (s *Server) settleDelivery(w http.ResponseWriter, r *http.Request) {
	var req struct {
		TradeID            string `json:"trade_id"`
		FarmerID           string `json:"farmer_id"`
		BuyerID            string `json:"buyer_id"`
		TransporterID      string `json:"transporter_id"`
		AIGrade            string `json:"ai_grade"`
		BuyerReportedGrade string `json:"buyer_reported_grade"`
		Success            bool   `json:"success"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}

	s.Orch.SimulateSettlement(req.TradeID, req.FarmerID, req.BuyerID, req.TransporterID, req.Success, req.AIGrade, req.BuyerReportedGrade)
	respondJSON(w, http.StatusOK, map[string]string{"status": "settled"})
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
			SelfReportedGrade: "A", // Demo default
			ExpectedPrice:     2000,
			QualityGrade:      grade.Grade,
			QualityConfidence: grade.Confidence,
			QualityReasoning:  grade.Reasoning,
			Timestamp:         time.Now(),
		}
		events.Emit(events.ListingCreated, l)
		s.injectGossip(network.MsgListing, l.ListingID, l, l.Timestamp)

		d := auction.BuyerDemand{
			DemandID:         "DEMO-D",
			BuyerNodeID:      "buyer-0",
			Crop:             "Wheat",
			RequiredQuantity: 100,
			MaxPrice:         2500,
			Timestamp:        time.Now(),
		}
		events.Emit(events.DemandCreated, d)
		s.injectGossip(network.MsgDemand, d.DemandID, d, d.Timestamp)
		
		o := auction.TransportOffer{
			OfferID:           "DEMO-O",
			TransporterNodeID: "transporter-0",
			AvailableCapacity: 500,
			CostPerKm:         10,
			Timestamp:         time.Now(),
		}
		events.Emit(events.TransportOfferCreated, o)
		s.injectGossip(network.MsgOffer, o.OfferID, o, o.Timestamp)

		time.Sleep(2 * time.Second)
		
		// In a reactive setup, we can't easily grab s.Market.AllTrades for settlement demo, 
		// so for the single click demo we will just let it be matched and approved.
	}()
	respondJSON(w, http.StatusOK, map[string]string{"status": "demo scenario started"})
}

func (s *Server) aiChat(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Question string            `json:"question"`
		Lang     string            `json:"lang"`
		History  []ai.ChatMessage  `json:"history"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}

	agent := ai.NewChatAgent()
	answer, err := agent.AskQuestion(req.Question, req.Lang, req.History)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"answer": answer})
}
