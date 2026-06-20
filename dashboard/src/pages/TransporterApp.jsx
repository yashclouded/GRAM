import React, { useState, useEffect } from 'react';
import { Truck, Loader2, MapPin, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const dict = {
  en: {
    appTitle: "Gram Logistics",
    availableJobs: "Available Jobs",
    pickup: "Pickup",
    destination: "Destination",
    distance: "Distance",
    acceptJob: "Accept Job"
  },
  hi: {
    appTitle: "ग्राम लॉजिस्टिक्स",
    availableJobs: "उपलब्ध नौकरियां",
    pickup: "पिकअप",
    destination: "गंतव्य",
    distance: "दूरी",
    acceptJob: "नौकरी स्वीकार करें"
  }
};

export default function TransporterApp() {
  const { user, profile, supabase } = useAuth();
  const { lang, setLang } = useLanguage();
  const t = dict[lang];

  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    // Mock jobs
    setJobs([
      { id: '1', crop: 'Wheat', from: 'Pune, MH', to: 'Mumbai, MH', dist: '150 km', pay: 1500, cap: 100 },
    ]);
  }, []);

  const handleAccept = async (job) => {
    setLoading(true);
    try {
      // 1. Submit Offer
      await fetch(`${API_URL}/market/offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          TransporterNodeID: user?.id || "transporter-0",
          AvailableCapacity: job.cap,
          CostPerKm: 10
        })
      });

      // 2. Trigger Market Cycle
      await fetch(`${API_URL}/market/run`, { method: 'POST' });
      alert("Job Accepted! Matching with Trade...");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="farmer-app">
      <header className="farmer-header">
        <h1><Truck size={24} /> {t.appTitle}</h1>
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
        <h2 style={{color: '#444', marginBottom: '0.5rem'}}>{t.availableJobs}</h2>
        
        {jobs.map(j => (
          <div key={j.id} className="farmer-card">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h2 style={{margin: 0}}>{j.crop} <span style={{fontSize: '0.9rem', color: '#666', fontWeight: 'normal'}}>({j.cap} Qtl)</span></h2>
              <span className="grade-badge" style={{background: '#1976d2'}}>₹{j.pay}</span>
            </div>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#555'}}>
                <MapPin size={16} color="#d32f2f"/> <strong>{t.pickup}:</strong> {j.from}
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#555'}}>
                <MapPin size={16} color="#388e3c"/> <strong>{t.destination}:</strong> {j.to}
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#555'}}>
                <Truck size={16} color="#1976d2"/> <strong>{t.distance}:</strong> {j.dist}
              </div>
            </div>

            <button 
              className="sell-btn" 
              onClick={() => handleAccept(j)}
              disabled={loading}
              style={{marginTop: '1.5rem', background: '#1976d2'}}
            >
              {loading ? <Loader2 className="spin" size={20}/> : t.acceptJob}
            </button>
          </div>
        ))}
      </main>
    </div>
  );
}
