# GRAM Protocol — Comprehensive Project Update

This document provides an exhaustive log of the architecture, modules, and product features implemented in the GRAM Protocol ecosystem to date, based exactly on the current codebase state.

The project spans a fully simulated peer-to-peer (P2P) Go backend and a production-ready React (Vite) frontend application that is actively transitioning to a Phase 1 local-first browser mesh, with secure local authentication and same-device gossip already implemented.

## 1. Backend: Distributed Network & Simulation Engine (`node/`)
Written in Go, the backend simulates a decentralized network of farmers, buyers, and transporters communicating over a gossip protocol.

* **Network Router (`internal/network/`)**: Implements an epidemic gossip router where nodes propagate messages (`network.Message`) to random peers with a Time-To-Live (TTL) constraint to simulate real-world mesh communication.
* **Actor Nodes (`internal/node/`)**: Each participant (Farmer, Buyer, Transporter) is modeled as an independent `Node` running concurrently with its own mailbox, duplicate message suppression, and dedicated consensus state machines.
* **Orchestrator & Chaos Engine (`internal/orchestrator/`)**: The network manager that handles spawning mock nodes for simulation. Includes a **Chaos Engine** (`chaos.go`) which dynamically forces nodes offline or labels them "dishonest" to prove the network's resilience. It strictly tracks health, active nodes, and consensus reliability.
* **Event Bus (`internal/events/`)**: An in-memory publish-subscribe bus (`events.go`) that completely decouples the protocol layers, allowing the API and Orchestrator to react to internal mesh state changes asynchronously.

## 2. Backend: Consensus Layer (`internal/consensus/`)
* **Snowball Engine**: Implements the Avalanche Snowball algorithm for decentralized agreement. When a trade proposal is submitted, nodes independently sample a quorum of peers (e.g., *k=3*), adjust their confidence based on the majority response, and commit the trade only once the confidence counter reaches a secure threshold (beta).

## 3. Backend: Combinatorial Auction & Matching (`internal/auction/`)
* **Market Clearing**: A centralized (for the MVP simulation) greedy matching algorithm (`matcher.go`) that evaluates arrays of `FarmerListing`, `BuyerDemand`, and `TransportOffer`.
* **VCG & Shapley Fundamentals**: Determines the most efficient matches by minimizing transport distances and maximizing overlapping price thresholds. Implements exact Shapley value cost-sharing for Transport.
* **Seamless Consensus Handoff**: Once matched, the market layer dynamically locates the correct active node and pushes the matched Trade Proposal to the Gossip/Snowball consensus layer.

## 4. Backend: AI Agents & Oracle (`internal/ai/`)
* **Conversational AI Assistant (`chat.go`)**: A fully stateful AI chat agent built for the frontend that retains conversation memory. It provides practical advice regarding farming, crops, and market prices in both English and Hindi.
* **Vision Crop Grading (`grader.go`)**: Uses the AI to simulate real-time visual crop grading. Ingests Base64-encoded crop images and evaluates them against strict criteria (coloration, defects, uniformity).
* **Gemini Fallback Architecture (`client.go`)**: Contains a robust dual-routing API logic. If the primary Hack Club AI proxy gets rate-limited (Error 429), the backend silently intercepts the error and immediately redirects the prompt/image payload to the Gemini 1.5 API (`gemini-2.5-flash`), ensuring 100% uptime for the chat and grading features.

## 5. Backend: Reputation & Settlement (`internal/reputation/`)
* **Post-Trade Accounting**: Tracks the lifecycle of trades (In Transit → Delivered → Settled/Failed).
* **Trust Scoring**: Nodes possess a Bayesian trust score starting at 50/100. Successful trades increase trust (+5), failed deliveries heavily penalize it (-15). The matching engine factors in these scores, using a smooth polynomial decay algorithm (`math.Pow(avgRep/100.0, 2)`) to effectively blacklist dishonest actors.

## 6. Backend: API & Streaming Server (`cmd/server/` & `internal/api/`)
* **REST Handlers**: Provides endpoints for the React frontend to submit listings (`/api/market/listing`), submit transport offers (`/api/market/offer`), trigger AI chat (`/api/ai/chat`), trigger the AI oracle (`/api/ai/grade`), trigger Chaos engineering (`/api/chaos/kill`), and fetch node trust scores (`/api/reputation`).
* **WebSocket Streaming**: Uses Gorilla WebSockets (`hub.go`) to stream live internal events (Trade Accepted, Market Cycles, Deliveries, and Settlement) down to the browser without polling.

---

## 7. Frontend: Multi-Actor Platform (`dashboard/`)
The frontend transitioned from an engineer's protocol visualizer to a highly premium, consumer-facing product built in React, Vite, and pure CSS.

* **Premium Glassmorphic Redesign**: Upgraded `LandingPage.jsx` and the user `AppShell.jsx` to feature a highly polished aesthetic. It utilizes dynamic floating headers, translucent frosted glass effects, seamless CSS transitions, and distinct typography.
* **Authentication & Profiles (`Auth.jsx`, `AuthContext.jsx`, `auth/localAuth.js`, `auth/secureVault.js`)**: The app now supports both Supabase Auth and a **Secure Local** mode. In local mode, accounts are created entirely on-device, stored in IndexedDB, and protected using a PBKDF2-derived AES-GCM vault key. Supabase remains available as an optional legacy bridge when its environment variables are configured.
* **Universal GRAM AI Chat Widget (`ChatWidget.jsx`)**: A floating assistant embedded into the `AppShell` that follows users across tabs. Implements `react-markdown` to format complex AI responses.
* **Bilingual Farmer UI (`FarmerApp.jsx`)**: A mobile-optimized application built for usability. Features instant photo uploads for AI vision grading, real-time price expectations, deleting active listings (with confirmation), and a reactive status tracker.
* **Buyer & Transporter UIs (`BuyerApp.jsx`, `TransporterApp.jsx`)**: Fully integrated order placement, vehicle registration, and job acceptance features. All destructive or state-changing actions (bidding, accepting jobs, logging out) are protected by native `window.confirm` pop-ups dynamically translated into English/Hindi.
* **Science & Architecture Page (`SciencePage.jsx`)**: An academic breakdown of all mathematical methods (Snowball, VCG, Shapley, Bayesian) used in the protocol. Utilizes custom `Mermaid.jsx` component to render real-time interactive flowcharts contrasting Traditional vs. Decentralized supply chains.
* **Network & Admin Console (`NetworkConsole.jsx`)**: Provides high-level live charts, displaying consensus rounds, network health, active node states, and manual Chaos Engineering controls (e.g., kill 40% of nodes).

---

## 8. Frontend: Phase 1 Local-First Mesh Prototype (`dashboard/src/`)
We have successfully started implementing the Phase 1 blueprint directly into the React App, building a local-first mesh that bridges the gap to a serverless state.

* **Mesh Identity (`identity/meshIdentity.js`)**: Users generate local cryptographic keypairs (Ed25519 or ECDSA-P256 via WebCrypto API). Every local action is mathematically signed and hashed to derive a unique `agentId`.
* **Mesh Store (`store/meshStore.js`)**: Supabase relies on network connectivity, so we implemented a local-first Event Store using **IndexedDB**. All state changes (creating listings, bids) are stored locally first via a robust CRDT-like event log. If IndexedDB is blocked, it gracefully degrades to in-memory fallback.
* **Mesh Context & P2P Gossip (`contexts/MeshContext.jsx`)**: The UI listens to `MeshContext` instead of just an API. When a Farmer creates a listing, it is signed and persisted locally, then gossiped to other open tabs using `BroadcastChannel` (simulating WebRTC peer-to-peer messaging). The Trust Score and Network Health in the sticky footer are now mathematically derived dynamically from these local mesh events.
* **Secure Local Auth & Encrypted Identity**: When a local account is active, the mesh identity is automatically encrypted and moved out of plaintext storage. The decrypted vault key is kept in memory for the current tab session only, so the dashboard can sign mesh events without exposing the private identity material to the wider app state.
* **Local-First Market Actions**: Farmer listings and buyer demands now append to the local mesh event log before any backend sync occurs. This gives the app real pending/synced behavior and moves core marketplace flows toward the "device is the node" model instead of treating the backend as the primary ledger.

## 9. What's Left Before Launch
To fully execute Phase 1 and exit Phase 0, the following items remain:

1. **Cross-Device Networking:** Replace the `BroadcastChannel` transport, which only works between tabs on the same device, with real WebRTC peer networking such as `js-libp2p` so the IndexedDB mesh can gossip across the internet.
2. **Broaden Local-First Coverage:** Transporter flows, offer lifecycle changes, notification state, and more trade transitions still need to originate from the local mesh log instead of the backend bridge.
3. **WASM Consensus Runtime:** The dashboard can gossip and materialize events now, but it still does not execute Snowball consensus, VCG pricing, or Shapley cost splitting locally. The deterministic Go core needs to move into the browser via WebAssembly or an equivalent TypeScript port.
4. **Encrypt More Local State:** Secure local auth and mesh identity are protected, but the wider event log is not yet encrypted at rest. Sensitive local data needs a stronger at-rest model before claiming end-to-end device safety.
5. **Deprecate Supabase Completely:** Once cross-device gossip, local recovery/export, and remaining account/profile UX are covered, Supabase can be removed as an auth dependency and the app can rely entirely on browser-held mesh identities.
