package api

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/yashsingh/agrinerve/node/internal/events"
	"github.com/yashsingh/agrinerve/node/internal/orchestrator"
)

type Server struct {
	Orch   *orchestrator.Orchestrator
	Router chi.Router
	Hub    *Hub
}

func NewServer(orch *orchestrator.Orchestrator) *Server {
	s := &Server{
		Orch:   orch,
		Hub:    NewHub(),
	}

	// Setup Event Callback to broadcast via WS
	orch.OnEvent = func(ev events.Event) {
		data, err := json.Marshal(ev)
		if err == nil {
			s.Hub.Broadcast(data)
		}
	}

	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"*"}, // Allow all for demo
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
	}))

	r.Get("/ws", s.Hub.ServeWs)
	r.Route("/api", func(r chi.Router) {
		r.Get("/metrics", s.getMetrics)
		r.Get("/nodes", s.getNodes)
		r.Get("/reputation", s.getReputation)
		
		r.Post("/market/listing", s.createListing)
		r.Post("/market/demand", s.createDemand)
		r.Post("/market/offer", s.createOffer)
		r.Post("/market/run", s.runMarketCycle)
		r.Post("/market/settle", s.settleDelivery)
		
		r.Post("/chaos/kill", s.killNodes)
		r.Post("/chaos/recover", s.recoverNodes)
		
		r.Get("/oracle/price", s.getOraclePrice)
		r.Post("/ai/grade", s.gradeCrop)
		
		// For running the full demo scenario via a single click
		r.Post("/demo/run", s.runDemoScenario)
	})

	s.Router = r
	return s
}

func (s *Server) Start(addr string) error {
	log.Printf("Starting API server on %s", addr)
	return http.ListenAndServe(addr, s.Router)
}
