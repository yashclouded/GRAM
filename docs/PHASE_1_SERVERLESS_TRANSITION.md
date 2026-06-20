# GRAM Phase 1 Serverless Transition

This document turns the Phase 1 idea in `agents.md` into a realistic migration plan for Problem Statement 3.2.

The goal does not change:
- No single entity has complete information or authority.
- Agents coordinate using local knowledge, gossip, trust weighting, and incentive-compatible market design.
- The system remains usable when up to 40% of agents are offline or dishonest.

What changes here is the implementation strategy. The current `agents.md` Phase 1 direction is strong, but three assumptions need refinement:
- Shipping the entire Go backend into the browser as one WebAssembly blob is heavier than necessary and mixes protocol logic with server-only concerns.
- Combining GunDB, js-libp2p, and browser WebAssembly adds too many moving parts for a first decentralized release.
- Internet-scale browser meshes cannot be literally zero-infrastructure in practice because WebRTC still needs rendezvous and, on some networks, relay assistance.

The recommended target is therefore:
- Serverless in the authority, storage, and decision-making path.
- Local-first on every device.
- Direct browser-to-browser for normal operation.
- Optionally assisted by dumb connectivity helpers that never store market state, never participate in consensus, and never become coordinators.

## Problem Statement 3.2 Mapping

| Constraint | Design response |
| --- | --- |
| No single entity has complete information or authority | Every device keeps only its local state plus gossiped shard knowledge. Consensus is quorum-sampled and leaderless. |
| Incentives must align without enforcement | Matching remains VCG-based, transport cost split remains Shapley-based, and dishonest behaviour only reduces trust score weight. |
| The environment is dynamic and uncertain | Listings, demands, deliveries, and trust updates are propagated as signed events and reconciled eventually. |
| The system should remain operational with up to 40% offline agents | The node runtime is local-first, supports delayed sync, and treats partitions as temporary rather than fatal. |

## Recommended Target Architecture

### 1. Identity: device-native cryptographic agents

- Each device generates an Ed25519 keypair on first launch using WebCrypto.
- The public key is the agent identity. There is no central account authority in Phase 1.
- Role, region, crop specialization, and transporter metadata are stored as signed profile records.
- Recovery is handled through an encrypted export bundle or agent-to-agent recovery flow, not a server-held password database.

Why this is better than the current GunDB SEA-only assumption:
- It keeps identity independent from any one database library.
- It maps cleanly to signed gossip messages and trust score accounting.
- It reduces lock-in if the storage layer changes later.

### 2. Local state: IndexedDB plus a signed event log

- Each browser stores a signed append-only event log in IndexedDB.
- Materialized local views are derived from that log for listings, demands, trade proposals, deliveries, trust scores, and peer metadata.
- Events are scoped by shard so agents only replicate the region x crop partitions they care about.
- Conflict handling is explicit: immutable events plus deterministic merge rules are easier to audit than hidden magic in a graph sync layer.

Recommended record types:
- `profile.updated`
- `listing.created`
- `listing.amended`
- `listing.closed`
- `demand.created`
- `offer.created`
- `trade.proposed`
- `trade.accepted`
- `delivery.status_changed`
- `trust.updated`
- `oracle.flagged`

This keeps the system local-first while preserving the protocol language already used in the repo.

### 3. Networking: direct mesh first, assisted connectivity second

- Browser agents connect over WebRTC data channels.
- Peer discovery is pluggable and non-authoritative.
- The minimum viable discovery options are manual invite links, QR pairing, and same-LAN bootstrap.
- Internet mode can add community-run rendezvous endpoints for signaling only.
- Relay assistance is allowed only as packet forwarding when strict NATs make direct peer paths impossible.

Hard rule:
- Discovery services and relays must never store listings, demands, trade proposals, trust scores, or delivery state.
- They must never vote, match, price, or resolve conflicts.

This is the right interpretation of "totally serverless" for browsers:
- No server owns the market.
- No server decides outcomes.
- Optional connectivity helpers exist only to let agents find each other.

### 4. Protocol runtime: move only deterministic core logic into the browser

Do not ship `cmd/server`, REST handlers, WebSocket hub, or the chaos demo server into the browser.

Instead:
- Extract `consensus`, `auction`, and `reputation` into a pure deterministic protocol core.
- Keep networking, storage, UI, and peer lifecycle in JavaScript or TypeScript.
- Compile only the deterministic protocol core to WebAssembly, or port that core to TypeScript if the binary size and interop are materially better.

Why this is more feasible than shipping the full Go backend:
- Smaller browser payload.
- Cleaner boundary between transport and economics.
- Easier testing because inputs and outputs are pure data.
- No browser runtime effort wasted on server-only packages like HTTP routing or Gorilla WebSockets.

Recommended boundary:
- Go or WASM core owns Snowball rounds, VCG pricing, Shapley splits, and trust score updates.
- The browser shell owns IndexedDB persistence, WebRTC peers, UI subscriptions, and background sync.

### 5. Oracle and AI: advisory only

- The oracle remains a low-confidence signal.
- `oracle.flagged` can re-weight listings, but it must never block a trade.
- For the first decentralized release, browser AI should be optional.
- The safest progression is:
  1. Keep the current server-proxied oracle only for demos.
  2. Add bring-your-own-key browser inference for agents who want it.
  3. Add a tiny offline grading model later if bundle size permits.

This keeps the protocol decentralized even if AI capability arrives in stages.

## What Should Change From the Current Phase 1 Story

### Replace

- "Compile the Go backend to WebAssembly and ship it in the React app."

With:

- "Extract and ship the deterministic protocol core in WebAssembly or TypeScript, while browser-native code handles storage, transport, and UX."

### Replace

- "Supabase Auth will be replaced by GunDB's cryptographic key pairs (SEA)."

With:

- "Supabase Auth will be replaced by locally generated cryptographic identity keys. Storage and identity are separate concerns; GunDB may be evaluated, but the identity model should not depend on it."

### Replace

- "All data will live in IndexedDB and gossip over WebRTC directly between browsers. No server."

With:

- "All market state will live in IndexedDB and gossip directly between browsers. Optional rendezvous or relay helpers may assist connectivity, but they hold no state and have no protocol authority."

These changes preserve the spirit of the original plan while avoiding promises that browsers cannot reliably satisfy on hostile networks.

## Transition Roadmap

### Phase 1A: extract the protocol core

Goal:
- Separate deterministic logic from the Phase 0 server shell.

Work:
- Move consensus, auction, and reputation interfaces behind pure data contracts.
- Remove hidden dependencies on in-memory buses or HTTP concerns.
- Add golden tests for Snowball outcomes, VCG pricing, Shapley splits, and trust score updates.

Exit criteria:
- The protocol core can run from test vectors without the API server or orchestrator.

### Phase 1B: add a browser node shell in hybrid mode

Goal:
- Make each browser tab a real node while still allowing the Phase 0 server to coexist during migration.

Work:
- Add local key generation and signed message envelopes.
- Add IndexedDB event log storage.
- Add a browser node lifecycle manager and local materialized views.
- Mirror actions from the current forms into signed local events first, then fan out to the Phase 0 backend as a compatibility bridge.

Exit criteria:
- Listings, demands, and offers originate from the browser node shell even if a bridge still exists.

### Phase 1C: browser-to-browser shard gossip

Goal:
- Move the data path off the centralized API.

Work:
- Add WebRTC peer sessions.
- Add shard subscription logic.
- Gossip signed events between nearby agents.
- Reconstruct materialized views from peer events after reconnect.

Exit criteria:
- Two or more browsers can coordinate within the same shard without the Go API acting as the source of truth.

### Phase 1D: remove centralized auth and control-plane dependence

Goal:
- Remove Supabase from the authority path.

Work:
- Replace login with local key-based identity creation.
- Add profile export and recovery UX.
- Make onboarding write signed profile events instead of rows in a central table.

Exit criteria:
- A new agent can join, declare a role, and trade without creating a centralized account.

### Phase 1E: resilience hardening

Goal:
- Satisfy the 40% offline requirement with evidence.

Work:
- Simulate delayed delivery, duplicate gossip, partial partitions, and dishonest agents in browser-driven tests.
- Add background sync and rejoin behaviour.
- Add caps on local storage growth and shard retention policies.

Exit criteria:
- The browser mesh continues clearing trades and converging after 40% of agents disappear and later rejoin.

## Suggested Repo Shape For Phase 1

Recommended additions:
- `dashboard/src/mesh/` for peer sessions, gossip, shard membership, and message envelopes.
- `dashboard/src/identity/` for local key management and signed profile handling.
- `dashboard/src/store/` for IndexedDB event log and derived local views.
- `shared/protocol/` or `node/internal/protocol/` for deterministic contracts shared by Go tests and browser runtime.

Recommended Phase 0 code that should stay server-only:
- `node/internal/api/`
- `node/cmd/server/`
- `node/internal/orchestrator/`

## Acceptance Criteria

Phase 1 should not be called complete until all of the following are true:
- A listing can be created, matched, and finalized from browser-resident agents without a centralized database.
- Trust score updates are derived from signed trade lifecycle events and are applied locally by every observing agent.
- Trade proposals are decided by quorum sampling among browser agents, not by a server endpoint.
- Agents can disconnect, continue operating on local knowledge, and reconcile later.
- Connectivity helpers can disappear without corrupting state or taking protocol authority with them.

## Non-Negotiable Truths

- Static hosting of the frontend bundle is still infrastructure, but it is not protocol authority.
- Internet-scale browser P2P needs signaling and sometimes relays; the real requirement is that these helpers are not coordinators.
- "No single entity has complete information or authority" is compatible with optional dumb networking helpers, but not with any server that stores the market state or decides outcomes.

## Recommendation

For GRAM, the best next step is not "replace everything with GunDB and hope the browser runtime sorts it out."

The best next step is:
- local cryptographic identity,
- signed event-log state in IndexedDB,
- direct WebRTC gossip,
- deterministic protocol core shared across environments,
- and optional connectivity helpers with zero market authority.

That path matches Problem Statement 3.2 more closely, reduces implementation risk, and gives the team a cleaner bridge from the current Phase 0 demo to a truly decentralized Phase 1 system.
