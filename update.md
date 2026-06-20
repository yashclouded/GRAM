# GRAM Protocol — Comprehensive Project Update

This document provides an exhaustive log of the architecture, modules, and product features implemented in the GRAM Protocol ecosystem to date. 

The project spans a fully simulated peer-to-peer (P2P) Go backend and a production-ready React (Vite) frontend application.

## 1. Backend: Distributed Network & Simulation Engine (`node/`)
Written in Go, the backend simulates a decentralized network of farmers, buyers, and transporters communicating over a gossip protocol.

* **Network Router (`internal/network/`)**: Implements an epidemic gossip router where nodes propagate messages (`network.Message`) to random peers with a Time-To-Live (TTL) constraint to simulate real-world mesh communication.
* **Actor Nodes (`internal/node/`)**: Each participant (Farmer, Buyer, Transporter) is modeled as an independent `Node` running concurrently with its own mailbox, duplicate message suppression, and dedicated consensus state machines.
* **Orchestrator & Chaos Engine (`internal/orchestrator/`)**: The network manager that handles spawning mock nodes for simulation. Includes a **Chaos Engine** (`chaos.go`) which dynamically forces nodes offline or labels them "dishonest" to prove the network's resilience. It strictly tracks health, active nodes, and consensus reliability.
* **Event Bus (`internal/events/`)**: An in-memory publish-subscribe bus (`events.go`) that completely decouples the protocol layers, allowing the API and Orchestrator to react to internal mesh state changes asynchronously.

## 2. Backend: Consensus Layer (`internal/consensus/`)
* **Snowball Engine**: Implements the Avalanche Snowball algorithm for decentralized agreement. When a trade proposal is submitted, nodes independently sample a quorum of peers (e.g., *k=3*), adjust their confidence based on the majority response, and commit the trade only once the confidence counter reaches a secure threshold (beta).

## 3. Backend: Combinatorial Auction & Matching (`internal/auction/`)
* **Market Clearing**: A centralized (for the MVP) greedy matching algorithm (`matcher.go`) that evaluates arrays of `FarmerListing`, `BuyerDemand`, and `TransportOffer`.
* **VCG & Shapley Fundamentals**: Determines the most efficient matches by minimizing transport distances and maximizing overlapping price thresholds. 
* **Seamless Consensus Handoff**: Once matched, the market layer dynamically locates the correct active node and pushes the matched Trade Proposal to the Gossip/Snowball consensus layer.

## 4. Backend: AI Crop Quality Oracle (`internal/ai/`)
* **Vision Processing**: Uses the `Hack Club AI Proxy` (OpenAI `gpt-4o`) to simulate real-time AI grading.
* **Automated Prompts**: Ingests Base64-encoded crop images and evaluates them against strict criteria (coloration, defects, uniformity).
* **Robust Error Handling**: Automatically falls back to a default baseline grade if the AI proxy is rate-limited (e.g., returning 429), ensuring the demo/auction never stalls.

## 5. Backend: Reputation & Settlement (`internal/reputation/`)
* **Post-Trade Accounting**: Tracks the lifecycle of trades (In Transit → Delivered → Settled/Failed).
* **Trust Scoring**: Nodes possess a Bayesian trust score starting at 50/100. Successful trades increase trust (+5), failed deliveries heavily penalize it (-15). The matching engine factors in these scores, blacklisting highly dishonest actors.

## 6. Backend: API & Streaming Server (`cmd/server/` & `internal/api/`)
* **REST Handlers**: Provides endpoints for the React frontend to submit listings (`/api/market/listing`), submit transport offers (`/api/market/offer`), trigger the AI oracle (`/api/ai/grade`), and forcibly trigger network chaos (`/api/chaos/trigger`).
* **WebSocket Streaming**: Uses Gorilla WebSockets (`hub.go`) to stream live internal events (Trade Accepted, Market Cycles, Deliveries, and Settlement) down to the browser without polling.

---

## 7. Frontend: Multi-Actor Platform (`dashboard/`)
The frontend transitioned from an engineer's protocol visualizer to a consumer-facing product built in React, Vite, and Tailwind-equivalent pure CSS.

* **Authentication & Profiles (`Auth.jsx`, `supabase_schema.sql`)**: Integrated Supabase Auth. A custom PostgreSQL trigger automatically generates user profiles upon signup, tracking their role (`Farmer`, `Buyer`, `Transporter`), location data, and reputation scores via Row Level Security (RLS).
* **Onboarding Flow (`Onboarding.jsx`)**: New accounts are forced to identify their role in the ecosystem, writing this data back to the database to govern routing.
* **Bilingual Farmer UI (`FarmerApp.jsx`)**: A mobile-optimized, white/green themed application built for usability. Features instant photo uploads, real-time AI price expectations, and a reactive status tracker that progresses based on WebSocket updates from the Go backend.
* **Buyer & Transporter Views (`BuyerApp.jsx`, `TransporterApp.jsx`)**: Separate isolated interfaces. (Currently scaffolded to support future independent feature additions alongside the Farmer view).
* **Network & Admin Console (`NetworkConsole.jsx`)**: The original distributed systems dashboard was cleanly refactored into an admin view. It provides high-level live charts using `recharts`, displaying consensus rounds, network health, and active node states, while providing manual buttons to inject node failure.

## 8. CI/CD & Hygiene
* **Atomic Version Control**: Clean git history splitting API, Network, Frontend, AI, and Documentation into distinct feature commits.
* **Architecture Documentation**: The `README.md` features full Mermaid.js architecture flowcharts and setup guides mapping the P2P lifecycle.
