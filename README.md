# GRAM Protocol: Gossip-based Resilient Agricultural Mesh

**GRAM** is a leaderless, decentralized coordination protocol designed for agricultural trade. It enables Farmers, Buyers, and Transporters to negotiate, match, and finalize trades without relying on a central server. 

Built as a robust, resilient distributed system, GRAM can tolerate massive network failures (up to 40% of nodes suddenly dropping offline) and gracefully degrade during API failures, guaranteeing that local agriculture markets never completely halt due to central point-of-failure outages.

---

## 🌟 Core Capabilities

### 1. Decentralized Snowball Consensus
GRAM does not have a "leader" or "master" node. Instead, it utilizes a custom implementation of **Snowball Consensus** (inspired by Avalanche). Nodes continuously sample a random subset of peers (gossip protocol) to vote on trade proposals. The network rapidly converges on a decision, achieving agreement even when nodes are dishonest or offline.

### 2. Combinatorial Trade Matching Engine
GRAM features an integrated matching engine that matches supply, demand, and logistics simultaneously.
- **Farmers** list crops with expected prices.
- **Buyers** list demands with maximum acceptable prices.
- **Transporters** offer logistical capacity.
The deterministic engine pairs these efficiently in an $O(F \times B \times T)$ combinatorial cycle and immediately submits candidate trades to the network for decentralized approval.

### 3. AI Crop Quality Grading (Hack Club AI)
Before a crop enters the market, farmers can submit a photo for automated grading.
- Integrated directly with the **Hack Club AI Proxy** (`openai/gpt-chat-latest` Vision).
- The AI evaluates visual quality, contamination, discoloration, and visible damage, outputting a strict JSON schema containing a `Grade`, `Confidence`, and `Reasoning`.
- **Graceful Degradation:** If the API fails or the API key is missing, the node degrades to a grade of `"Unknown"` and the market cycle continues unblocked. 

### 4. Chaos Engine & Simulation Orchestrator
GRAM includes a purpose-built Chaos Engine to prove its resilience. The Orchestrator spins up local goroutine-based nodes and simulates an active market, while the Chaos Engine actively kills up to 40% of the network mid-consensus to prove that the trades still finalize correctly.

---

## 🚀 Getting Started

### Prerequisites
- Go 1.21+

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd agrinerve
   ```

2. **Configure Environment Variables:**
   Navigate into the `node` directory and set up your Hack Club AI API key.
   ```bash
   cd node
   cp .env.example .env
   ```
   Open `.env` and add your key:
   ```env
   HACKCLUB_AI_API_KEY="your_api_key_here"
   ```
   *(Note: If you skip this step, the demo will still work perfectly, but the AI grading will gracefully degrade to "Unknown".)*

3. **Run the Demonstration:**
   GRAM includes a full terminal-based demonstration that orchestrates 25 nodes, creates trades, grades images, runs the matching engine, and survives a 40% node chaos event.
   
   ```bash
   go run cmd/demo/main.go
   ```

### Running Tests
The network includes rigorous distributed systems testing for consensus convergence under failure states.
```bash
cd node
go test ./... -v
```

---

## 🏗️ Architecture

```text
/node
├── cmd/
│   └── demo/main.go           # The main simulation execution
├── internal/
│   ├── ai/                    # Hack Club AI Vision proxy and rigid JSON prompts
│   ├── auction/               # Deterministic matching engine and market cycle
│   ├── consensus/             # Snowball consensus algorithms and trade proposals
│   ├── events/                # Internal event bus for metrics and tracing
│   ├── network/               # P2P Gossip simulator and message routing
│   ├── node/                  # Base node definitions for Farmers, Buyers, Transporters
│   └── orchestrator/          # Chaos engine and network health metric calculation
```

## 🛡️ Design Philosophy
GRAM is built for **resilience above all**. Agricultural markets are time-sensitive; a central server going down shouldn't prevent a farmer from securing transport for expiring goods. By utilizing gossip networks, probabilistic consensus, and decoupled AI services, GRAM ensures the market stays alive even in extreme infrastructure-degraded environments.
