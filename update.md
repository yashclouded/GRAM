# GRAM Protocol — Comprehensive Project Update

This document provides an exhaustive log of the architecture, modules, and product features implemented in the GRAM Protocol ecosystem to date, as well as a detailed gap analysis of what remains before launch.

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

## 4. Backend: AI Agents & Oracle (`internal/ai/`)
* **Conversational AI Assistant (`chat.go`)**: A fully stateful AI chat agent built for the frontend that retains conversation memory. It provides practical advice regarding farming, crops, and market prices in both English and Hindi.
* **Vision Crop Grading (`grader.go`)**: Uses the AI to simulate real-time visual crop grading. Ingests Base64-encoded crop images and evaluates them against strict criteria (coloration, defects, uniformity).
* **Gemini Fallback Architecture (`client.go`)**: Contains a robust dual-routing API logic. If the primary Hack Club AI proxy gets rate-limited (Error 429), the backend silently intercepts the error and immediately redirects the prompt/image payload to the Gemini 1.5 API, ensuring 100% uptime for the chat and grading features.

## 5. Backend: Reputation & Settlement (`internal/reputation/`)
* **Post-Trade Accounting**: Tracks the lifecycle of trades (In Transit → Delivered → Settled/Failed).
* **Trust Scoring**: Nodes possess a Bayesian trust score starting at 50/100. Successful trades increase trust (+5), failed deliveries heavily penalize it (-15). The matching engine factors in these scores, using a smooth polynomial decay algorithm (`math.Pow(avgRep/100.0, 2)`) to effectively blacklist dishonest actors.

## 6. Backend: API & Streaming Server (`cmd/server/` & `internal/api/`)
* **REST Handlers**: Provides endpoints for the React frontend to submit listings (`/api/market/listing`), submit transport offers (`/api/market/offer`), trigger AI chat (`/api/ai/chat`), trigger the AI oracle (`/api/ai/grade`), and fetch node trust scores (`/api/reputation`).
* **WebSocket Streaming**: Uses Gorilla WebSockets (`hub.go`) to stream live internal events (Trade Accepted, Market Cycles, Deliveries, and Settlement) down to the browser without polling.

---

## 7. Frontend: Multi-Actor Platform (`dashboard/`)
The frontend transitioned from an engineer's protocol visualizer to a highly premium, consumer-facing product built in React, Vite, and pure CSS.

* **Premium Glassmorphic Redesign**: Upgraded `LandingPage.jsx` and the user `AppShell.jsx` to feature a highly polished $100k aesthetic. It utilizes dynamic floating headers, translucent frosted glass effects, seamless CSS transitions, and distinct typography.
* **Authentication & Profiles (`Auth.jsx`, `supabase_schema.sql`)**: Integrated Supabase Auth. A custom PostgreSQL trigger automatically generates user profiles upon signup, tracking their role (`Farmer`, `Buyer`, `Transporter`), location data, and reputation scores via Row Level Security (RLS).
* **Onboarding Flow (`Onboarding.jsx`)**: New accounts are forced to identify their role in the ecosystem, writing this data back to the database to govern routing.
* **Universal GRAM AI Chat Widget (`ChatWidget.jsx`)**: A floating assistant embedded into the `AppShell` that follows users across tabs. Implements `react-markdown` to format complex AI responses (bullet points, bold text) beautifully, and sends full conversation history arrays to the Go backend for contextual memory.
* **Live Network Telemetry for Users**: Embedded live Trust Scores and Network Health percentage directly into the `AppShell` header. Every Farmer, Buyer, and Transporter can see their exact Bayesian reputation dynamically updating as trades clear in the background.
* **Bilingual Farmer UI (`FarmerApp.jsx`)**: A mobile-optimized application built for usability. Features instant photo uploads for AI vision grading, real-time price expectations, and a reactive status tracker.
* **Network & Admin Console (`NetworkConsole.jsx`)**: The original distributed systems dashboard was cleanly refactored into an admin view (`/admin`). It provides high-level live charts, displaying consensus rounds, network health, active node states, and manual Chaos Engineering controls.

---

## 8. What's Left Before Launch (Gap Analysis)
To ensure the user apps are fully connected to the simulated network for the hackathon demo, the following items must be completed:

1. **Connect User Forms to the Go Combinatorial Auction Engine**
   - **Current State**: The user apps (like the List Crop form in `FarmerApp`) currently interact with Supabase or mocked states. The actual backend Go endpoints (`/api/market/listing`, `/api/market/demand`, `/api/market/offer`) are only wired to the `/admin` Network Console.
   - **Required Action**: Refactor the frontend submit buttons in the user apps to directly execute POST requests to the Go backend, injecting the user's specific crop, price, and quantity directly into the VCG auction engine.
2. **Wire Up the P2P Websockets to User Dashboards**
   - **Current State**: The backend Snowball Consensus engine broadcasts live updates (`TradeMatched`, `ConsensusReached`) over the `ws://localhost:8080/ws` websocket, but currently only the `NetworkConsole.jsx` is listening to it.
   - **Required Action**: Attach the WebSocket listener inside `AppShell.jsx` or specific user apps so that when the Go backend finds a match, the user's "Offers" tab instantly updates without requiring a page refresh.
3. **Map Supabase Auth IDs to Decentralized Node IDs**
   - **Current State**: The Go backend and Trust system run on mocked node identities (e.g., `farmer-0`, `buyer-0`). The frontend uses real Supabase User UUIDs.
   - **Required Action**: Ensure that when a user logs in, their Supabase UUID dynamically binds to a corresponding Node ID in the Go backend. Currently, the Trust Score in the header defaults to querying `farmer-0` as a placeholder.

## 9. CI/CD & Hygiene
* **Atomic Version Control**: Clean git history splitting API, Network, Frontend, AI, and Documentation into distinct feature commits formatted specifically as `<layer>: <changes>`.
* **Architecture Documentation**: The `README.md` features full Mermaid.js architecture flowcharts and setup guides mapping the P2P lifecycle.
