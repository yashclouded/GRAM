import React, { useState, useEffect } from 'react';
import { Store, Loader2, IndianRupee, MapPin, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const dict = {
  en: {
    appTitle: "Gram Buyer",
    availableCrops: "Available Crops",
    qualityGrade: "Grade",
    placeDemand: "Place Demand",
    rupeesPerQuintal: "₹/Quintal",
    quantity: "Qty: ",
    buyNow: "Buy Now"
  },
  hi: {
    appTitle: "ग्राम खरीदार",
    availableCrops: "उपलब्ध फसलें",
    qualityGrade: "श्रेणी",
    placeDemand: "मांग रखें",
    rupeesPerQuintal: "₹/क्विंटल",
    quantity: "मात्रा: ",
    buyNow: "अभी खरीदें"
  }
};

export default function BuyerApp() {
  const { user, profile, supabase } = useAuth();
  const { lang, setLang } = useLanguage();
  const t = dict[lang];

  const [loading, setLoading] = useState(false);
  const [listings, setListings] = useState([]);
  const [oraclePrice, setOraclePrice] = useState(null);

  // In a real app we'd fetch this from the backend or Supabase
  // For the demo, we show some mock/real active listings
  useEffect(() => {
    // Fetch fair price on mount
    fetch(`${API_URL}/oracle/price?commodity=Wheat`)
      .then(res => res.json())
      .then(data => setOraclePrice(data.price))
      .catch(console.error);

    // Mock listings
    setListings([
      { id: '1', crop: 'Wheat', grade: 'A', price: 2500, qty: 100, location: 'Pune, MH' },
      { id: '2', crop: 'Rice', grade: 'B', price: 2100, qty: 50, location: 'Nashik, MH' }
    ]);
  }, []);

  const handleBuy = async (listing) => {
    setLoading(true);
    try {
      // 1. Submit Demand
      await fetch(`${API_URL}/market/demand`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          BuyerNodeID: user?.id || "buyer-0",
          Crop: listing.crop,
          RequiredQuantity: listing.qty,
          MaxPrice: listing.price + 200 // Buyer is willing to pay a bit more
        })
      });

      // 2. Trigger Market Cycle
      await fetch(`${API_URL}/market/run`, { method: 'POST' });
      alert("Demand Placed! Network matching in progress.");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="farmer-app">
      <header className="farmer-header">
        <h1><Store size={24} /> {t.appTitle}</h1>
        <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
          <button className="lang-toggle" onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}>
            {lang === 'en' ? 'हिंदी' : 'English'}
          </button>
          <button className="lang-toggle" onClick={() => user && supabase.auth.signOut()} style={{background: 'none', padding: '0.2rem'}} title="Logout">
            <LogOut size={20} color="#666"/>
          </button>
        </div>
      </header>

      <main className="farmer-content">
        <h2 style={{color: '#444', marginBottom: '0.5rem'}}>{t.availableCrops}</h2>
        {oraclePrice && (
          <div style={{color: '#2e7d32', fontSize: '0.9rem', marginBottom: '1rem', padding: '0.8rem', backgroundColor: '#e8f5e9', borderRadius: '8px', border: '1px solid #c8e6c9'}}>
            <strong>Fair Market Reference (Wheat):</strong> ₹{oraclePrice} / Quintal
          </div>
        )}
        
        {listings.map(l => (
          <div key={l.id} className="farmer-card">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h2 style={{margin: 0}}>{l.crop}</h2>
              <span className="grade-badge">{l.grade}</span>
            </div>
            
            <div style={{display: 'flex', gap: '1rem', color: '#666', fontSize: '0.9rem', marginTop: '0.5rem'}}>
              <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><MapPin size={14}/> {l.location}</span>
              <span>{t.quantity}{l.qty} Qtl</span>
            </div>

            <div className="price-text" style={{marginTop: '1rem'}}>
              ₹{l.price} <span style={{fontSize:'0.9rem', color:'#666', fontWeight:'normal'}}>{t.rupeesPerQuintal}</span>
            </div>

            <button 
              className="sell-btn" 
              onClick={() => handleBuy(l)}
              disabled={loading}
              style={{marginTop: '1rem'}}
            >
              {loading ? <Loader2 className="spin" size={20}/> : t.buyNow}
            </button>
          </div>
        ))}
      </main>
    </div>
  );
}
