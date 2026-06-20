import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import NotificationBell from './NotificationBell';
import { LogOut, Settings } from 'lucide-react';

export default function AppShell({ icon: Icon, title, children }) {
  const { supabase } = useAuth();
  const { lang, setLang } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="farmer-app">
      <header className="farmer-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {Icon && <Icon size={22} />} {title}
        </h1>
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
    </div>
  );
}
