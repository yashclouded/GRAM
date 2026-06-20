# AGENTS.md

> Drop this at the repo root once you scaffold the actual codebase. It's written for the Phase 0 (hackathon-weekend) build described in `GRAM_Protocol_Moonshot.docx` — adjust paths as the repo evolves; don't treat the structure below as gospel once real code exists.

## Project overview

**GRAM (Gossip-based Resilient Agricultural Mesh)** — a leaderless coordination protocol for farmers, transporters, mandis and buyers. No central server, no leader (even temporary), tolerant of dishonest participants, and resilient to ~40% of nodes being offline at any time.

Full design rationale, constraint mapping, and architecture: see `docs/GRAM_Protocol_Moonshot.docx`. This file is the *build* reference; that doc is the *design* reference. If they ever disagree, this file wins for "how do I run/test this," the doc wins for "why does this layer exist."

The hackathon-weekend scope is the **simulated subset** of the full 8-layer design — not the production system. Don't try to build AgriStack/Beckn integrations for real during the hackathon; mock them.

## Proposed project structure

```
/mesh        # leaderless gossip + consensus (Snowball/Avalanche-style voting over libp2p)
/auction     # market-clearing engine: combinatorial double-auction, VCG pricing, Shapley cost-split
/agents      # simulated farmer / transporter / buyer edge agents for the demo
/oracle      # oracle adapters — mock weather/satellite, real Agmarknet price pull
/dashboard   # React + Recharts live demo UI, incl. the "kill 40% of nodes" control
/docker      # docker-compose.yml spinning up N simulated agent containers
/scripts     # chaos.sh (kill/restore nodes), seed.py (fake listings), demo.sh (one-command run)
/docs        # design doc, glossary, architecture notes
```

## Dev environment setup

```bash
# Python (auction engine, oracle adapters)
python -m venv .venv && source .venv/bin/activate
pip install -r auction/requirements.txt

# Mesh node (Go preferred for the consensus loop — swap if the team picks differently)
cd mesh && go mod tidy

# Dashboard
cd dashboard && npm install

# Full simulated mesh
docker compose -f docker/docker-compose.yml up --build
```

## Build & test

```bash
# Auction engine tests (VCG truthfulness + Shapley split correctness are the ones that matter most)
cd auction && pytest -q

# Mesh consensus tests — run with simulated message loss/delay, not just the happy path
cd mesh && go test ./... -race

# Dashboard
cd dashboard && npm run lint && npm test

# Live demo dry-run (must work with zero internet beyond the one Agmarknet call)
./scripts/demo.sh
```

## Code style

- Python: type-hint everything in `auction/` and `oracle/`; format with `black`; no bare `except:`.
- Go: standard `gofmt`; one package per layer concern (`consensus`, `gossip`, `dag`).
- JS/TS (dashboard): functional components only, Prettier defaults, no class components.
- Commit messages: `<layer>: <what changed>` e.g. `mesh: fix quorum sample size off-by-one`.

## Domain vocabulary (don't reinvent these terms)

- **Node / agent** — one simulated farmer, transporter, or buyer; never call it a "user" in mesh/auction code.
- **Shard** — a region × crop partition of the DAG; the demo can run with one shard.
- **Quorum sample** — the random subset of peers a node polls each consensus round; not "validators," not "miners."
- **Trust score** — Bayesian reputation value per agent per claim type; never "credit score" or "karma."
- **Oracle flag** — a low-confidence signal on a listing; it never blocks a trade, only re-weights it. Don't implement it as a hard block — that breaks the "no enforcement" design constraint.

## Known gotchas

- **Determinism for the demo**: the consensus simulation must be re-runnable with the same seed so the live "kill 40% of nodes" moment is reproducible on stage, not a coin flip. Seed all randomness from one config value.
- **Agmarknet API**: the public data.gov.in endpoint rate-limits and occasionally times out — cache the day's pull at startup, don't call it per-trade live during the demo.
- **VCG pricing**: it's easy to accidentally implement first-price instead of second-price logic. Write the truthfulness test (a bidder shading their bid should never improve their outcome) before wiring it into the auction loop.
- **Don't let the dashboard call the mesh directly** — go through the auction engine's read API, so the demo still reflects "no node is privileged," including the dashboard itself.

## PR instructions

- Title format: `[gram-<layer>] <short description>`
- Run the relevant `Build & test` block above for any layer you touched before opening a PR.
- If a change affects how a constraint from the problem statement is satisfied, note which constraint in the PR description (see the mapping table in the design doc, Section 4).