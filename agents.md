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

**Phase 1 (Next: True P2P)** — The Go backend will be compiled to WebAssembly and shipped inside the React app itself. Each browser tab becomes a node. Supabase Auth will be replaced by GunDB's cryptographic key pairs (SEA). All data will live in IndexedDB and gossip over WebRTC directly between browsers. No server. No cloud database. Internet is used only for initial WebRTC signaling (peer discovery).

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
/docs            # Design doc, glossary, architecture notes
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

This section documents the **target production architecture**. Nothing below exists in code yet. It is the blueprint for transforming the Phase 0 hackathon demo into a production-grade, zero-server P2P system.

### The Core Principle

Every device is a node. No machine holds a privileged position. The internet is used only for peer discovery (WebRTC signaling) — never for data storage or business logic.

```
Phase 0 (Now):         Phase 1 (Target):
User Phone             User Phone
    |                      |
    v                      | (WebRTC Data Channel — direct)
  Go Server            Other User Phone
    |                      |
  Supabase DB         IndexedDB (local)
```

### Layer-by-Layer Transition Plan

**Authentication**
- Phase 0: Supabase Auth (JWT, email/password)
- Phase 1: GunDB SEA (Security, Encryption, Authorization). Each user generates a local elliptic-curve keypair on first launch. Their public key is their identity. No passwords stored centrally. No email required.

**Database / State**
- Phase 0: Supabase PostgreSQL
- Phase 1: GunDB graph database stored in `IndexedDB` on each device. Writes gossip to all connected peers over WebRTC. CRDTs ensure eventual consistency without a coordinator.

**Consensus & Auction Logic**
- Phase 0: Go Snowball engine running on our server, gossiping between in-memory goroutines
- Phase 1: Compile Go consensus and VCG auction code to **WebAssembly (WASM)** using `GOOS=js GOARCH=wasm`. Load the WASM blob in the React app. Each browser tab locally executes the consensus math and gossips signed proposals via GunDB WebRTC.

**Networking**
- Phase 0: HTTP REST + Gorilla WebSockets to our server
- Phase 1: `js-libp2p` with WebRTC transport. Browsers connect directly. The only external call is an initial connection to a public STUN/TURN server (e.g., Google's public STUN) to negotiate NAT traversal and exchange ICE candidates.

**AI / Oracle**
- Phase 0: Go server proxies image to Hack Club / Gemini API
- Phase 1: Browser calls Gemini API directly with user's own API key, OR we ship a tiny quantized vision model (ONNX Runtime Web) that runs entirely in the browser for offline crop grading.

### Known Risks for Phase 1

- **NAT Traversal**: Strict WiFi networks (conference centers, hotels) often block WebRTC. A fallback TURN relay server is required for these environments. This is the only infrastructure we would need.
- **Cold Start / Peer Discovery**: On an empty network (first user), there are no peers to gossip to. GunDB's relay peers (`gun.js.org/gun/`) serve as bootstrap nodes to introduce peers to each other, after which data flows directly.
- **Mobile Safari**: IndexedDB storage limits on iOS are aggressive. We will need a fallback to `localStorage` with LZ compression for low-storage devices.
- **WASM Binary Size**: A compiled Go WASM binary is typically 5-15MB. This needs to be served with `Content-Encoding: br` (Brotli) and cached aggressively with Service Workers.

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