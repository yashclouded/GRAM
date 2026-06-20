# AGENTS.md

> This file is the live build reference for the GRAM Protocol codebase. It reflects the **actual state of the repo**, not the original proposal. If there is ever a conflict between this file and `docs/GRAM_Protocol_Moonshot.docx`, this file wins for "how do I run/test this" — the design doc wins for "why does this layer exist."

---

## Project Overview

**GRAM (Gossip-based Resilient Agricultural Mesh)** — a leaderless coordination protocol for farmers, transporters, mandis, and buyers.

Core guarantees:
- No single entity holds complete information or authority.
- The system continues operating if up to 40% of nodes go offline.
- Dishonest participants are penalised via Bayesian trust decay, not hard enforcement.
- Incentive alignment is achieved through mechanism design (VCG auctions), not centralized control.

**Phase 0 (Current: Hackathon MVP)** — A fully functional simulated mesh running Go in the backend. The React frontend connects real users to this simulated P2P network, with Supabase used purely for Auth (not data storage logic). The Go backend simulates N concurrent independent nodes in memory to prove the Snowball consensus and VCG auction math works at scale.

**Phase 1 (Next: Browser-Native Mesh)** — The deterministic protocol core (Snowball consensus, VCG auctioning, Shapley cost split, trust score updates) will move into the React app as a browser-resident node runtime. Each browser tab or device becomes a node. Supabase Auth will be replaced by locally generated cryptographic identity keys. Market state will live in IndexedDB as signed local-first records and gossip over WebRTC directly between browsers. Optional rendezvous or relay helpers may assist connectivity, but they never store market state or act as coordinators.

---

## Actual Project Structure (as built)

```
/node            # Go backend — P2P simulation engine (Phase 0 only)
  /cmd/server    # HTTP + WebSocket API server entry point
  /internal
    /network     # Epidemic gossip router (TTL-limited message propagation)
    /node        # Farmer / Buyer / Transporter agent actors
    /consensus   # Snowball / Avalanche consensus engine
    /auction     # Combinatorial double-auction, VCG pricing, Shapley cost-split
    /reputation  # Bayesian trust scoring per node
    /ai          # Crop grader (vision), conversational AI chat, Gemini fallback
    /api         # REST handlers + Gorilla WebSocket streaming hub
    /events      # In-memory pub-sub event bus (decouples protocol layers)
    /orchestrator# Chaos engine: spawns/kills/marks-dishonest nodes for demo
/dashboard       # React + Vite frontend (the actual user-facing product)
  /src
    /pages       # FarmerApp, BuyerApp, TransporterApp, LandingPage, SciencePage, NetworkConsole
    /components  # AppShell, ChatWidget, NotificationBell, Mermaid
    /contexts    # AuthContext, LanguageContext
/docs            # Design doc, glossary, architecture notes, Phase 1 transition blueprint
```

---

## Dev Environment Setup

```bash
# Go backend (P2P simulation engine)
cd node
cp .env.example .env        # fill in OPENAI_API_KEY and GEMINI_API_KEY
go mod tidy
go run ./cmd/server/main.go # starts on :8080

# React frontend
cd dashboard
npm install
npm run dev                 # starts on :5173
```

The app runs fully locally. The only external calls are:
1. The AI API (Hack Club OpenAI proxy or Gemini fallback) for crop grading and chat.
2. Supabase for user auth only (not data storage).

---

## What Has Been Built (Phase 0 Completed)

### Backend (Go — `node/`)
- [x] Epidemic gossip router with TTL-limited message propagation.
- [x] Independent agent nodes (Farmer, Buyer, Transporter) running concurrently with dedicated state machines and mailboxes.
- [x] Snowball consensus engine: k-sample quorum polling, confidence counters, beta-threshold commit.
- [x] Combinatorial double-auction matcher (greedy, price-overlap and distance minimisation).
- [x] VCG-style truthful pricing (bidder shading bid never improves outcome).
- [x] Shapley value transport cost splitting.
- [x] Bayesian trust scoring: starts at 50, successful trades +5, failed delivery -15.
- [x] Post-trade reputation weighting in auction: `math.Pow(avgTrust/100.0, 2)` polynomial decay.
- [x] Chaos Engine: dynamically forces nodes offline or marks them dishonest to prove resilience.
- [x] Event bus: fully decoupled pub-sub across all layers.
- [x] AI crop grader: Base64 image → GPT vision → structured JSON grade.
- [x] Dual-API fallback: if Hack Club proxy returns 429/500, silently reroutes to Gemini 1.5.
- [x] Stateful AI chat agent with conversation history.
- [x] WebSocket hub: streams live mesh events to the browser without polling.
- [x] REST API: `/api/market/listing`, `/api/market/demand`, `/api/market/offer`, `/api/ai/chat`, `/api/ai/grade`, `/api/reputation`, `/api/metrics`.

### Frontend (React — `dashboard/`)
- [x] Premium dark-mode Landing Page with bilingual (EN/HI) support and glassmorphic design.
- [x] Supabase Auth with role-based routing (Farmer / Buyer / Transporter / Onboarding).
- [x] AppShell: header with per-role title, sticky footer with live Trust Score and Network Health.
- [x] Farmer App: list crops with AI vision grade check, manage listings (with delete), view incoming offers, counter-bid, accept/reject, track delivery status.
- [x] Buyer App: browse available listings with filters (crop, grade, max price), place bids with confirmation.
- [x] Transporter App: register vehicle info, browse accepted orders needing transport, accept jobs (with confirmation), mark pickup / in-transit / delivered.
- [x] Universal floating AI Chat Widget (all roles) with `react-markdown` formatting and full conversation memory.
- [x] Network Console (`/admin`): live Recharts dashboards, consensus visualiser, chaos engineering controls (kill N% of nodes).
- [x] Science Page (`/science`): academic breakdown of all mathematical methods (Snowball, VCG, Shapley, Bayesian) with Mermaid flowcharts and research paper citations.
- [x] All destructive actions gated behind `window.confirm` dialogs (logout, post listing, delete listing, place order, accept job).
- [x] Notification bell with badge counter.

---

## Phase 1 Theory: Serverless Decentralized Architecture

This section documents the **target production architecture**. Nothing below exists in code yet. It is the blueprint for transforming the Phase 0 hackathon demo into a production-grade, coordinator-free browser mesh.

For the detailed migration plan and feasibility notes, see `docs/PHASE_1_SERVERLESS_TRANSITION.md`.

### The Core Principle

Every device is a node. No machine holds a privileged position. The internet may assist with peer discovery or relay on hostile networks, but it must never hold business state, price a trade, or decide consensus.

```
Phase 0 (Now):                 Phase 1 (Target):
User Phone -> Go Server        User Phone <-> Other User Phone
User Phone -> Supabase Auth       (WebRTC Data Channel — direct)
Go Server  -> In-Memory Mesh   User Phone -> IndexedDB (local)
```

### Layer-by-Layer Transition Plan

**Authentication**
- Phase 0: Supabase Auth (JWT, email/password)
- Phase 1: locally generated cryptographic identity keys. Each device generates a local keypair on first launch, signs its profile and market actions, and can export encrypted recovery material without a central password database.

**Database / State**
- Phase 0: in-memory Go mesh state, plus Supabase PostgreSQL only for auth/profile metadata
- Phase 1: a signed append-only event log stored in `IndexedDB` on each device, with derived local views for listings, demands, trade proposals, deliveries, and trust score history. Data gossips over WebRTC and converges without a coordinator.

**Consensus & Auction Logic**
- Phase 0: Go Snowball engine running on our server, gossiping between in-memory goroutines
- Phase 1: extract the deterministic protocol core from the Go backend and run it in the browser as **WebAssembly (WASM)** or an equivalent TypeScript port. Each browser tab locally executes the consensus math, VCG pricing, Shapley cost split, and trust score updates on signed proposals.

**Networking**
- Phase 0: HTTP REST + Gorilla WebSockets to our server
- Phase 1: `js-libp2p` with WebRTC transport. Browsers connect directly where possible. Discovery and NAT traversal can use optional signaling, STUN, or relay helpers, but those helpers remain outside the authority and storage path.

**AI / Oracle**
- Phase 0: Go server proxies image to Hack Club / Gemini API
- Phase 1: Browser AI is advisory only. Agents may use bring-your-own-key inference or a small offline model for crop grading, but the oracle flag remains non-blocking and never becomes a centralized enforcement point.

### Known Risks for Phase 1

- **NAT Traversal**: Strict WiFi networks (conference centers, hotels) often block direct WebRTC. Relay assistance may be needed, but it must remain a dumb packet forwarder with zero protocol authority.
- **Cold Start / Peer Discovery**: On an empty network (first user), there are no peers to gossip to. Manual invite links, QR pairing, or community-run signaling endpoints can bootstrap connections, after which state lives only on agents.
- **Mobile Safari**: IndexedDB storage limits on iOS are aggressive. We will need compact shard retention, snapshot pruning, and export/import recovery instead of assuming deep offline history on every device.
- **WASM Binary Size**: Shipping the entire backend would be too large. Only the deterministic protocol core should move into WASM, and it should be Brotli-compressed and cached aggressively with Service Workers.
- **Identity Recovery**: Serverless identity improves autonomy but makes account recovery harder. Exportable encrypted recovery bundles are required for non-technical agents.

---

## Commit Convention (Atomic Commits)

Every commit must touch **one logical concern**. Never bundle a bug fix in the same commit as a feature or a style change.

Format: `<layer>: <imperative verb> <what changed>`

| Layer | Scope |
|-------|-------|
| `mesh` | Gossip router, network topology |
| `consensus` | Snowball engine, quorum sampling |
| `auction` | VCG, Shapley, matcher |
| `reputation` | Bayesian trust, post-trade accounting |
| `ai` | Crop grader, chat, oracle |
| `api` | REST handlers, WebSocket hub |
| `dashboard` | Any React/CSS frontend change |
| `auth` | Authentication, profile management |
| `docs` | README, AGENTS.md, design docs |
| `ci` | GitHub Actions, Docker, scripts |

Good examples:
```
consensus: fix off-by-one in quorum sample size
auction: implement VCG second-price truthfulness check
dashboard: move trust score to sticky footer
docs: update AGENTS.md with Phase 1 P2P blueprint
```

Bad examples:
```
fixes                          # no layer, no description
dashboard: fix bugs            # vague
update everything              # never do this
```

---

## Code Style

- **Go**: `gofmt` always. One package per layer concern (`consensus`, `gossip`, `auction`). Type-hint all exported functions with godoc comments. No bare `error` returns without context.
- **React/JS**: Functional components only. No class components. No inline styles for layout (use CSS classes). Keep components under 200 lines — split if larger.
- **CSS**: Vanilla CSS only. All design tokens in `:root`. No magic numbers inline.
- **Python** (if/when oracle adapters are added): Type-hint everything. `black` formatter. No bare `except:`.

---

## Domain Vocabulary

Do not rename these terms in code, comments, or UI copy:

| Term | Meaning |
|------|---------|
| **Node / agent** | One participant (farmer, buyer, transporter). Never call it a "user" inside mesh/auction code. |
| **Shard** | A region × crop partition of the DAG. The demo runs with one shard. |
| **Quorum sample** | The random subset of peers a node polls each consensus round. Not "validators," not "miners." |
| **Trust score** | Bayesian reputation value per agent per claim type. Not "credit score" or "karma." |
| **Oracle flag** | A low-confidence signal on a listing. It never blocks a trade, only re-weights it. Hard-blocking breaks the "no enforcement" constraint. |
| **Listing** | A farmer's offer to sell a specific crop quantity at a price. |
| **Demand** | A buyer's request to purchase. |
| **Trade proposal** | A matched listing + demand that enters the consensus round. |

---

## PR Instructions

- Title: `[gram-<layer>] <short description>`
- Run the build and tests for every layer you touched before opening a PR.
- If your change affects how a constraint from the Problem Statement 3.2 is satisfied, call out which constraint in the PR description.
- Link to the relevant section of `docs/GRAM_Protocol_Moonshot.docx` for any algorithmic change.
