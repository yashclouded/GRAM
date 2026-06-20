import React, { useState, useEffect, useRef } from 'react';
import { Camera, CheckCircle2, Truck, IndianRupee, Leaf, Loader2, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import './FarmerApp.css';

const API_URL = 'http://localhost:8080/api';
const WS_URL = 'ws://localhost:8080/ws';

const dict = {
  en: {
    appTitle: "Gram Market",
    uploadPrompt: "Tap to take crop photo",
    analyzing: "Analyzing...",
    grade: "Quality Grade",
    expectedPrice: "Expected Price",
    sellNow: "Find Buyers & Sell",
    statusMatched: "Finding Buyers...",
    statusAccepted: "Trade Accepted",
    statusInTransit: "In Transit",
    statusSettled: "Payment Arrived",
    rupeesPerQuintal: "₹/Quintal",
    cropType: "Wheat"
  },
  hi: {
    appTitle: "ग्राम बाज़ार",
    uploadPrompt: "फसल की फोटो लेने के लिए दबाएं",
    analyzing: "विश्लेषण हो रहा है...",
    grade: "गुणवत्ता श्रेणी",
    expectedPrice: "अनुमानित कीमत",
    sellNow: "खरीदार खोजें और बेचें",
    statusMatched: "खरीदार खोज रहे हैं...",
    statusAccepted: "व्यापार स्वीकृत",
    statusInTransit: "रास्ते में है",
    statusSettled: "भुगतान आ गया",
    rupeesPerQuintal: "₹/क्विंटल",
    cropType: "गेहूँ (Wheat)"
  }
};

export default function FarmerApp() {
  const { user, supabase } = useAuth();
  const { lang, setLang } = useLanguage();
  const [gradeResult, setGradeResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tradeStatus, setTradeStatus] = useState('idle'); // idle, matching, accepted, inTransit, settled
  const [oraclePrice, setOraclePrice] = useState(null);
  const wsRef = useRef(null);

  const t = dict[lang];

  useEffect(() => {
    // Fetch fair price on mount
    fetch(`${API_URL}/oracle/price?commodity=Wheat`)
      .then(res => res.json())
      .then(data => setOraclePrice(data.price))
      .catch(console.error);

    // Connect to WebSocket to listen for trade updates for this specific farmer
    const connectWs = () => {
      const ws = new WebSocket(WS_URL);
      ws.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        const myNodeId = user?.id || "farmer-0";
        if (payload.Type === "TradeAccepted" && payload.Payload?.FarmerID === myNodeId) {
          setTradeStatus('accepted');
          setTimeout(() => setTradeStatus('inTransit'), 2000);
        }
        if (payload.Type === "TradeSettled" && payload.Payload?.FarmerID === myNodeId) {
          setTradeStatus('settled');
        }
        if (payload.Type === "TradeDelivered" && payload.Payload?.FarmerID === myNodeId) {
          setTradeStatus('settled'); 
        }
      };
      ws.onclose = () => setTimeout(connectWs, 3000);
      wsRef.current = ws;
    };
    connectWs();
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setGradeResult(null);
    setTradeStatus('idle');

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
        
        // Calculate a mock price based on grade
        let price = 2200; // Base
        if (data.Grade === 'A') price = 2500;
        if (data.Grade === 'B') price = 2100;
        if (data.Grade === 'C') price = 1800;

        setGradeResult({
          grade: data.Grade,
          confidence: data.Confidence,
          price: price
        });
      } catch (err) {
        console.error(err);
        // Fallback for demo if AI fails
        setGradeResult({ grade: 'Unknown', confidence: 0, price: 2000 });
      }
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSell = async () => {
    if (!gradeResult) return;
    setTradeStatus('matching');

    // 1. Submit Listing
    await fetch(`${API_URL}/market/listing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        FarmerNodeID: user?.id || "farmer-0",
        Crop: "Wheat",
        Quantity: 100,
        ExpectedPrice: gradeResult.price
      })
    });

    // 2. Automatically submit a mock buyer demand so the demo matches instantly
    await fetch(`${API_URL}/market/demand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        BuyerNodeID: "buyer-0",
        Crop: "Wheat",
        RequiredQuantity: 100,
        MaxPrice: gradeResult.price + 500
      })
    });

    // 3. Automatically submit a mock transport offer
    await fetch(`${API_URL}/market/offer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        TransporterNodeID: "transporter-0",
        AvailableCapacity: 500,
        CostPerKm: 10
      })
    });

    // 4. Trigger Market Cycle
    await fetch(`${API_URL}/market/run`, { method: 'POST' });
  };

  return (
    <div className="farmer-app">
      <header className="farmer-header">
        <h1><Leaf size={24} /> {t.appTitle}</h1>
        <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
          <button 
            className="lang-toggle" 
            onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
          >
            {lang === 'en' ? 'हिंदी' : 'English'}
          </button>
          <button className="lang-toggle" onClick={() => supabase.auth.signOut()} style={{background: 'none', padding: '0.2rem'}} title="Logout">
            <LogOut size={20} color="#666"/>
          </button>
        </div>
      </header>

      <main className="farmer-content">
        
        {/* Step 1: Upload */}
        <div className="farmer-card">
          <label className="camera-btn">
            {loading ? <Loader2 size={48} className="spin" /> : <Camera size={48} />}
            <span>{loading ? t.analyzing : t.uploadPrompt}</span>
            <input type="file" accept="image/*" onChange={handleUpload} disabled={loading} capture="environment" />
          </label>
        </div>

        {/* Step 2: Quality & Pricing */}
        {gradeResult && (
          <div className="farmer-card">
            <h2>{t.cropType}</h2>
            {oraclePrice && (
              <div style={{color: '#4caf50', fontSize: '0.9rem', marginBottom: '1rem', fontWeight: '500'}}>
                Today's Mandi Price: ₹{oraclePrice} / Quintal
              </div>
            )}
            <div className="result-box">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <span style={{color: '#666'}}>{t.grade}</span>
                <span className="grade-badge">{gradeResult.grade}</span>
              </div>
              <div style={{marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e0e0e0'}}>
                <span style={{color: '#666'}}>{t.expectedPrice}</span>
                <div className="price-text">₹{gradeResult.price} <span style={{fontSize:'0.9rem', color:'#666', fontWeight:'normal'}}>{t.rupeesPerQuintal}</span></div>
              </div>
            </div>

            <button 
              className="sell-btn" 
              onClick={handleSell}
              disabled={tradeStatus !== 'idle'}
            >
              {tradeStatus === 'idle' ? t.sellNow : t.statusMatched}
            </button>
          </div>
        )}

        {/* Step 3: Tracking (Only shows after selling) */}
        {tradeStatus !== 'idle' && (
          <div className="farmer-card">
            <div className="status-step">
              <div className={`status-icon ${tradeStatus !== 'idle' ? 'active' : ''}`}><CheckCircle2 size={20} /></div>
              <div className={`status-text ${tradeStatus !== 'idle' ? 'active' : ''}`}>{t.statusAccepted}</div>
            </div>
            
            <div className="status-step">
              <div className={`status-icon ${(tradeStatus === 'inTransit' || tradeStatus === 'settled') ? 'active' : ''}`}><Truck size={20} /></div>
              <div className={`status-text ${(tradeStatus === 'inTransit' || tradeStatus === 'settled') ? 'active' : ''}`}>{t.statusInTransit}</div>
            </div>
            
            <div className="status-step">
              <div className={`status-icon ${tradeStatus === 'settled' ? 'active' : ''}`}><IndianRupee size={20} /></div>
              <div className={`status-text ${tradeStatus === 'settled' ? 'active' : ''}`}>{t.statusSettled}</div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
