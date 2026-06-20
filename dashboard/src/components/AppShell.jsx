import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import NotificationBell from './NotificationBell';
import { LogOut, Settings, Activity, ShieldCheck } from 'lucide-react';
import ChatWidget from './ChatWidget';

export default function AppShell({ icon: Icon, title, children }) {
  const { supabase } = useAuth();
  const { lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const [trustScore, setTrustScore] = useState(50.0);
  const [networkHealth, setNetworkHealth] = useState(100);

  useEffect(() => {
    // Fetch live reputation from Go backend
    const fetchRep = async () => {
      try {
        const res = await fetch('http://localhost:8080/api/reputation');
        const data = await res.json();
        // Match mock node ID based on user role (e.g. farmer -> farmer-0)
        const myNodeId = `${profile?.role || 'farmer'}-0`;
        const myRep = data?.find(r => r.NodeID === myNodeId);
        if (myRep) setTrustScore(myRep.Score);
      } catch (err) {}
    };
    
    // Fetch live metrics
    const fetchMetrics = async () => {
      try {
        const res = await fetch('http://localhost:8080/api/metrics');
        const data = await res.json();
        if (data?.TotalNodes > 0) {
          setNetworkHealth(Math.floor((data.ActiveNodes / data.TotalNodes) * 100));
        }
      } catch (err) {}
    };

    fetchRep();
    fetchMetrics();
    const interval = setInterval(() => {
      fetchRep();
      fetchMetrics();
    }, 5000);
    return () => clearInterval(interval);
  }, [profile?.role]);

  return (
    <div className="farmer-app">
      <header className="farmer-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            {Icon && <Icon size={22} />} {title}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingLeft: '1rem', borderLeft: '1px solid rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', color: '#16a34a', fontWeight: '600' }} title="Your Bayesian Reputation Score">
              <ShieldCheck size={16} /> Trust: {trustScore.toFixed(1)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', color: networkHealth > 50 ? '#16a34a' : '#ea580c', fontWeight: '600' }} title="GRAM Protocol Health">
              <Activity size={16} /> Net: {networkHealth}%
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <button
            id="lang-toggle-app"
            className="lang-toggle"
            onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
          >
            {lang === 'en' ? 'हिं' : 'EN'}
          </button>
          <NotificationBell />
          <button
            id="profile-btn"
            onClick={() => navigate('/profile')}
            style={{ background: 'none', border: 'none', padding: '0.25rem', cursor: 'pointer' }}
            title={lang === 'hi' ? 'प्रोफ़ाइल' : 'Profile'}
          >
            <Settings size={20} color="#555" />
          </button>
          <button
            id="logout-btn"
            onClick={() => supabase.auth.signOut()}
            style={{ background: 'none', border: 'none', padding: '0.25rem', cursor: 'pointer' }}
            title={lang === 'hi' ? 'लॉगआउट' : 'Logout'}
          >
            <LogOut size={20} color="#555" />
          </button>
        </div>
      </header>
      <main className="farmer-content">
        {children}
      </main>
      <ChatWidget />
    </div>
  );
}
