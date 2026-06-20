import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ArrowRight, BookOpen, AlertTriangle, Cpu, Network, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Mermaid from '../components/Mermaid';

const traditionalFlowchart = `
graph TD
    classDef default fill:#111,stroke:#444,stroke-width:1px,color:#ddd;
    classDef broker fill:#3f1d1d,stroke:#ef4444,stroke-width:2px,color:#f87171;
    
    F[  Farmer  ] -->|Harvest| B[  Broker / Middleman  ]:::broker
    B -->|Price Opacity| M[  Mandi Wholesaler  ]
    M -->|High Margin| T[  Transporter  ]
    T -->|Delayed| C[  End Buyer  ]
    
    B -.->|Takes 20% Cut| F
    M -.->|Takes 15% Cut| C
`;

const gramFlowchart = `
graph TD
    classDef default fill:#111,stroke:#444,stroke-width:1px,color:#ddd;
    classDef protocol fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#6ee7b7;
    
    F[  Farmer  ] <-->|Direct Listing / Bids| P((  GRAM Protocol  )):::protocol
    B[  Buyer  ] <-->|Direct Orders| P
    T[  Transporter  ] <-->|Optimized Routes| P
    
    P -.->|Snowball Consensus| V[Network Nodes]
    P -.->|VCG Auction Clearing| V
`;

const principles = [
  {
    icon: Network,
    title: 'Snowball Consensus (Avalanche)',
    subtitle: 'Scalable and Probabilistic Leaderless BFT Consensus',
    desc: 'GRAM operates without a central server. When a trade occurs, the network validates it using a metastable consensus algorithm. Nodes randomly sample a small subset of peers, asking for their validation. As a quorum is reached, the network state "avalanches" to an irreversible agreement.',
    paper: 'Rocket, T., Yin, M., Sekniqi, K., van Renesse, R., & Sirer, E. G. (2019). Scalable and Probabilistic Leaderless BFT Consensus through Metastability.'
  },
  {
    icon: Cpu,
    title: 'Vickrey-Clarke-Groves (VCG) Auction',
    subtitle: 'Truthful Combinatorial Market Clearing',
    desc: 'To prevent price manipulation, GRAM uses the VCG pricing mechanism. It matches multiple farmers to buyers mathematically to maximize total social welfare. Buyers are charged based on the "social harm" they cause by winning their bids, making truthful bidding the mathematically dominant strategy.',
    paper: 'Vickrey, W. (1961). Counterspeculation, Auctions, and Competitive Sealed Tenders; Clarke (1971); Groves (1973).'
  },
  {
    icon: ArrowRight,
    title: 'Shapley Value Route Optimization',
    subtitle: 'Fair Cost Allocation in Game Theory',
    desc: 'Logistics costs are split using the Shapley Value. When a transporter takes multiple loads from different farmers, the cost is dynamically distributed based on each farmer\'s marginal contribution to the overall route inefficiency, ensuring perfect economic fairness.',
    paper: 'Shapley, L. S. (1953). A Value for n-person Games.'
  },
  {
    icon: ShieldCheck,
    title: 'Bayesian Trust Reputation',
    subtitle: 'Probabilistic Trust over Decentralized Networks',
    desc: 'Every participant has a dynamically calculated trust score. Instead of simple 5-star ratings, GRAM uses a Beta Distribution model. Successful trades increase the alpha parameter, while failures increase beta. Low-trust nodes are mathematically penalized in future auction matchings.',
    paper: 'Jøsang, A., & Ismail, R. (2002). The Beta Reputation System.'
  }
];

export default function SciencePage() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="sci-root">
      <header className="sci-nav">
        <button onClick={() => navigate('/')} className="sci-back-btn">
          <ChevronLeft size={20} /> Back to Home
        </button>
        <div className="sci-logo">GRAM Protocol</div>
      </header>

      <main className="sci-main">
        {/* Hero */}
        <section className="sci-hero">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="sci-title"
          >
            The Science <br />
            <span className="sci-title-accent">Behind GRAM.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="sci-subtitle"
          >
            An exploration of the mathematical mechanisms, distributed consensus algorithms, and game theory replacing traditional agricultural brokers.
          </motion.p>
        </section>

        {/* The Problem */}
        <section className="sci-section">
          <div className="sci-problem-box">
            <div className="sci-problem-header">
              <AlertTriangle className="sci-red-icon" size={28} />
              <h2>The Problem with Traditional Systems</h2>
            </div>
            <p>
              In traditional agricultural supply chains, farmers lack direct access to buyers. Middlemen and commission agents monopolize price discovery, acting as opaque gatekeepers. This centralization creates extreme economic inefficiency: farmers often receive less than 40% of the final retail price, while buyers pay inflated costs to cover broker margins.
            </p>
            <div className="sci-flowchart-wrapper">
              <Mermaid chart={traditionalFlowchart} />
            </div>
          </div>
        </section>

        {/* The Solution */}
        <section className="sci-section">
          <h2 className="sci-section-title">The Decentralized Solution</h2>
          <p className="sci-section-text">
            GRAM replaces human intermediaries with cryptographic truth and algorithmic market clearing. By migrating the agricultural market to a peer-to-peer mesh network, we eliminate the economic rent extracted by brokers.
          </p>
          <div className="sci-flowchart-wrapper">
            <Mermaid chart={gramFlowchart} />
          </div>
        </section>

        {/* Core Principles */}
        <section className="sci-section">
          <h2 className="sci-section-title">Core Academic Principles</h2>
          <div className="sci-principles-grid">
            {principles.map((p, idx) => (
              <motion.div 
                key={idx}
                className="sci-principle-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <div className="sci-principle-icon"><p.icon size={24} /></div>
                <h3>{p.title}</h3>
                <h4>{p.subtitle}</h4>
                <p>{p.desc}</p>
                <div className="sci-paper">
                  <BookOpen size={14} />
                  <span>{p.paper}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

      </main>

      <footer className="sci-footer">
        <p>Built for the Hackathon Phase 0 Demo.</p>
      </footer>
    </div>
  );
}
