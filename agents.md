# AGENTS.md

## Package Manager
- `dashboard`: use `npm` (`npm install`, `npm run dev`, `npm run build`, `npm run lint`)
- `node`: use Go modules (`go mod tidy`, `go run ./cmd/server/main.go`, `go test ./...`)

## Current State
- Hybrid repo: the Go backend is still the Phase 0 simulated mesh and API surface.
- The dashboard already ships Phase 1 slices: secure local auth, encrypted mesh identity, IndexedDB event log, same-device `BroadcastChannel` gossip, and local-first farmer and buyer flows.
- Transporter flows, AI chat/grading, metrics, chaos controls, and cross-device networking are still backend-backed or mixed-mode.
- Architecture and migration details live in `docs/PHASE_1_SERVERLESS_TRANSITION.md`.

## Key Paths
- `dashboard/src/contexts/AuthContext.jsx`: switches between Supabase auth and secure local auth.
- `dashboard/src/auth/localAuth.js`: local account lifecycle and vault metadata.
- `dashboard/src/auth/secureVault.js`: PBKDF2 + AES-GCM vault primitives.
- `dashboard/src/identity/meshIdentity.js`: browser keypair generation, signatures, encrypted identity storage.
- `dashboard/src/store/meshStore.js`: IndexedDB-backed event log and KV store.
- `dashboard/src/contexts/MeshContext.jsx`: materialized mesh state, trust score, health, and same-device gossip.
- `node/internal/consensus`, `node/internal/auction`, `node/internal/reputation`: deterministic protocol core that still runs server-side today.

## Commands
```bash
cd dashboard && npm install && npm run dev
cd dashboard && npm run build
cd dashboard && npm run lint
cd node && cp .env.example .env && go run ./cmd/server/main.go
cd node && go test ./...
```

## File-Scoped Commands
| Task | Command |
|---|---|
| Lint a frontend file | `cd dashboard && npx eslint src/path/to/file.jsx` |
| Build frontend | `cd dashboard && npm run build` |
| Test a Go package | `cd node && go test ./internal/<package>` |
| Run backend | `cd node && go run ./cmd/server/main.go` |

## Commit Convention
- Format: `<layer>: <imperative change>`
- Layers: `mesh`, `consensus`, `auction`, `reputation`, `ai`, `api`, `dashboard`, `auth`, `docs`, `ci`
- Keep commits atomic: one logical concern per commit.

## Commit Attribution
- AI commits must include:
```text
Co-Authored-By: Codex <noreply@openai.com>
```

## Key Conventions
- Prefer local-first dashboard changes; treat the backend as a bridge or fallback, not the source of truth for mesh state.
- Listings, demands, delivery updates, and trust-affecting actions should flow through signed mesh events before any server sync layer.
- Do not introduce centralized enforcement into helper services; discovery, relay, and AI remain advisory only.
- Use domain terms exactly: `agent`, `shard`, `quorum sample`, `trust score`, `oracle flag`, `listing`, `demand`, `trade proposal`.
- If `agents.md`, `README.md`, and `docs/PHASE_1_SERVERLESS_TRANSITION.md` drift, update them together.
