import React, { useEffect, useState, useRef } from 'react';
import { Activity, ShieldAlert, Cpu, CheckCircle, XCircle, TrendingUp, Shield, Zap, Upload } from 'lucide-react';

const API_URL = 'http://localhost:8080/api';
const WS_URL = 'ws://localhost:8080/ws';

function NetworkConsole() {
  const [metrics, setMetrics] = useState(null);
  const [feed, setFeed] = useState([]);
  const [reputation, setReputation] = useState([]);
  const wsRef = useRef(null);
  const feedEndRef = useRef(null);

  // Connection State
  const [connected, setConnected] = useState(false);

  // Fetch initial data
  const fetchMetrics = async () => {
    try {
      const res = await fetch(`${API_URL}/metrics`);
      const data = await res.json();
      setMetrics(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReputation = async () => {
    try {
      const res = await fetch(`${API_URL}/reputation`);
      const data = await res.json();
      setReputation(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchReputation();

    const connectWs = () => {
      const ws = new WebSocket(WS_URL);
      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        setTimeout(connectWs, 3000);
      };
      ws.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        handleWsEvent(payload);
      };
      wsRef.current = ws;
    };
    connectWs();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const handleWsEvent = (event) => {
    // Add to feed
    setFeed(prev => [...prev, event]);
    
    // Auto-scroll feed
    setTimeout(() => {
      feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    // Refresh specific panels based on event type
    if (event.Type === "MetricsUpdated") {
      fetchMetrics();
    }
    if (event.Type === "ReputationUpdated" || event.Type === "NodeBlacklisted") {
      fetchReputation();
    }
  };

  const handleChaos = async (pct) => {
    await fetch(`${API_URL}/chaos/kill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ percentage: pct })
    });
  };

  const handleRecover = async () => {
    await fetch(`${API_URL}/chaos/recover`, { method: 'POST' });
  };

  const runDemo = async () => {
    await fetch(`${API_URL}/demo/run`, { method: 'POST' });
  };

  return (
    <div className="dark-theme">
      <div className="app-container">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity /> GRAM PROTOCOL
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Resilient Agricultural Mesh Dashboard</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: connected ? 'var(--accent-primary)' : 'var(--accent-danger)' }}></div>
            {connected ? 'Connected' : 'Disconnected'}
          </div>
          <button className="primary" onClick={runDemo}><Zap size={16} style={{display: 'inline', verticalAlign: 'middle', marginRight: '4px'}}/> Run Full Demo Trace</button>
        </div>
      </header>

      <div className="metrics-bar">
        <div className="metric-card">
          <span className="metric-label">Network Health</span>
          <span className="metric-value">{metrics ? metrics.ActiveNodes > 0 ? Math.floor((metrics.ActiveNodes / metrics.TotalNodes) * 100) : 0 : 0}%</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Active Nodes</span>
          <span className="metric-value">{metrics ? metrics.ActiveNodes : 0}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Consensus Reached</span>
          <span className="metric-value">{metrics ? metrics.AcceptedTrades : 0}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Settlement Rate</span>
          <span className="metric-value">{metrics ? metrics.SettlementSuccessRate.toFixed(1) : 0}%</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Blacklisted Nodes</span>
          <span className="metric-value" style={{ color: metrics && metrics.BlacklistedNodes > 0 ? 'var(--accent-danger)' : 'inherit' }}>{metrics ? metrics.BlacklistedNodes : 0}</span>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="panel">
            <div className="panel-header" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Cpu size={18}/> AI Grading</div>
            <AIGradingPanel />
          </div>

          <div className="panel">
            <div className="panel-header" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><TrendingUp size={18}/> Market Entry</div>
            <MarketPanel />
          </div>
          
        </div>

        {/* Middle Column - Feed */}
        <div className="panel" style={{ overflow: 'hidden' }}>
          <div className="panel-header">Live Event Feed</div>
          <div className="feed-list">
            {feed.map((ev, i) => (
              <FeedItem key={i} event={ev} />
            ))}
            <div ref={feedEndRef} />
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="panel">
            <div className="panel-header" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><ShieldAlert size={18}/> Chaos Controls</div>
            <p style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Inject node failures to test consensus resilience.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button className="danger" onClick={() => handleChaos(10)}>Kill 10% Nodes</button>
              <button className="danger" onClick={() => handleChaos(25)}>Kill 25% Nodes</button>
              <button className="danger" onClick={() => handleChaos(40)}>Kill 40% Nodes</button>
              <button onClick={handleRecover} style={{marginTop: '0.5rem'}}>Recover Network</button>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Shield size={18}/> Reputation Board</div>
            <div className="rep-list">
              {reputation.sort((a,b) => b.Score - a.Score).slice(0, 10).map((r, i) => (
                <div key={i} className="rep-item">
                  <span>{r.NodeID}</span>
                  <span className={`rep-score ${r.Score < 20 ? 'bad' : 'good'}`}>{r.Score.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
    </div>
  );
}

function FeedItem({ event }) {
  let cls = "";
  if (event.Type.includes("Accepted") || event.Type.includes("Settled") || event.Type.includes("Delivered")) cls = "accepted";
  if (event.Type.includes("Rejected") || event.Type.includes("Failed") || event.Type.includes("Blacklisted")) cls = "rejected";
  if (event.Type.includes("Chaos") || event.Type.includes("Killed")) cls = "chaos";

  return (
    <div className={`feed-item ${cls}`}>
      <div className="feed-time">{new Date(event.Timestamp).toLocaleTimeString()}</div>
      <strong>{event.Type}</strong>
      {event.Payload && (
        <pre style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', whiteSpace: 'pre-wrap' }}>
          {JSON.stringify(event.Payload, null, 2)}
        </pre>
      )}
    </div>
  );
}

function AIGradingPanel() {
  const [grade, setGrade] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    
    // Read as base64
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(',')[1];
      try {
        const res = await fetch(`${API_URL}/ai/grade`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 })
        });
        const data = await res.json();
        setGrade(data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="file-upload-wrapper">
        <button className="file-upload-btn" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '2rem 1rem'}}>
          <Upload size={20} />
          {loading ? 'Analyzing...' : 'Upload Crop Image'}
        </button>
        <input type="file" accept="image/*" onChange={handleUpload} disabled={loading} />
      </div>

      {grade && (
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
            <strong>Grade: <span style={{color: 'var(--accent-primary)'}}>{grade.Grade}</span></strong>
            <span style={{color: 'var(--text-secondary)'}}>{grade.Confidence}% Conf</span>
          </div>
          <p style={{fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4}}>{grade.Reasoning}</p>
        </div>
      )}
    </div>
  );
}

function MarketPanel() {
  const [crop, setCrop] = useState('Wheat');
  const [qty, setQty] = useState(100);
  const [price, setPrice] = useState(2000);

  const submitListing = async () => {
    await fetch(`${API_URL}/market/listing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        FarmerNodeID: "farmer-0",
        Crop: crop,
        Quantity: parseInt(qty),
        ExpectedPrice: parseInt(price)
      })
    });
  };

  const submitDemand = async () => {
    await fetch(`${API_URL}/market/demand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        BuyerNodeID: "buyer-0",
        Crop: crop,
        RequiredQuantity: parseInt(qty),
        MaxPrice: parseInt(price) + 500
      })
    });
  };

  const submitOffer = async () => {
    await fetch(`${API_URL}/market/offer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        TransporterNodeID: "transporter-0",
        AvailableCapacity: parseInt(qty) * 2,
        CostPerKm: 10
      })
    });
  };

  const runCycle = async () => {
    await fetch(`${API_URL}/market/run`, { method: 'POST' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <label style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Crop Type</label>
        <select value={crop} onChange={e => setCrop(e.target.value)}>
          <option>Wheat</option>
          <option>Rice</option>
          <option>Corn</option>
        </select>
      </div>
      <div style={{display: 'flex', gap: '0.5rem'}}>
        <div style={{flex: 1}}>
          <label style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Quantity</label>
          <input type="number" value={qty} onChange={e => setQty(e.target.value)} />
        </div>
        <div style={{flex: 1}}>
          <label style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Price</label>
          <input type="number" value={price} onChange={e => setPrice(e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
        <button onClick={submitListing}>Add Listing</button>
        <button onClick={submitDemand}>Add Demand</button>
        <button onClick={submitOffer}>Add Offer</button>
      </div>
      <button className="primary" onClick={runCycle}>Run Market Cycle</button>
    </div>
  );
}

export default NetworkConsole;
