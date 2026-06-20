import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Leaf, ArrowRight, ShieldCheck, TrendingUp, Truck } from 'lucide-react';
import { motion } from 'framer-motion';

const dict = {
  en: {
    tagline: "Agriculture without middlemen.",
    sub: "GRAM connects farmers, buyers, and transporters directly — fair prices, real tracking, no hidden fees.",
    signup: "Get Started",
    login: "Log In",
    f1title: "Fair Prices",
    f1desc: "Prices set by the market, not by middlemen. See today's mandi rates before you sell.",
    f2title: "Direct Trade",
    f2desc: "Farmers list their crop. Buyers browse and order. No broker in between.",
    f3title: "Track Deliveries",
    f3desc: "Watch your order move from farm to your door. Every step confirmed on-chain.",
    note: "Phase 0 Hackathon Demo — Marketplace Layer",
  },
  hi: {
    tagline: "बिचौलियों के बिना खेती।",
    sub: "GRAM किसानों, खरीदारों और ट्रांसपोर्टरों को सीधे जोड़ता है — उचित मूल्य, असली ट्रैकिंग, कोई छुपी फीस नहीं।",
    signup: "शुरू करें",
    login: "लॉग इन करें",
    f1title: "उचित मूल्य",
    f1desc: "कीमतें बाजार तय करता है, बिचौलिए नहीं। बेचने से पहले आज के मंडी भाव देखें।",
    f2title: "सीधा व्यापार",
    f2desc: "किसान फसल लिस्ट करते हैं। खरीदार देखते हैं और ऑर्डर देते हैं। बीच में कोई दलाल नहीं।",
    f3title: "डिलीवरी ट्रैक करें",
    f3desc: "अपने ऑर्डर को खेत से दरवाजे तक देखें। हर कदम कन्फर्म होता है।",
    note: "फेज 0 हैकथॉन डेमो — मार्केटप्लेस लेयर",
  }
};

const features = [
  { icon: TrendingUp, keyTitle: 'f1title', keyDesc: 'f1desc', color: '#2e7d32' },
  { icon: ShieldCheck, keyTitle: 'f2title', keyDesc: 'f2desc', color: '#1565c0' },
  { icon: Truck, keyTitle: 'f3title', keyDesc: 'f3desc', color: '#e65100' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { lang, setLang } = useLanguage();
  const t = dict[lang];

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <div className="landing-logo">
          <Leaf size={24} color="#2e7d32" />
          <span>GRAM</span>
        </div>
        <div className="landing-header-actions">
          <button
            id="lang-toggle-landing"
            className="lang-toggle"
            onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
          >
            {lang === 'en' ? 'हिंदी' : 'English'}
          </button>
          <button
            id="login-btn-landing"
            className="outline-btn"
            onClick={() => navigate('/auth')}
          >
            {t.login}
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="landing-hero">
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="hero-badge">{t.note}</div>
          <h1 className="hero-title">{t.tagline}</h1>
          <p className="hero-sub">{t.sub}</p>
          <div className="hero-actions">
            <button
              id="signup-btn-landing"
              className="primary-btn hero-cta"
              onClick={() => navigate('/auth')}
            >
              {t.signup} <ArrowRight size={18} />
            </button>
          </div>
        </motion.div>

        {/* Feature Cards */}
        <div className="features-grid">
          {features.map((f, i) => (
            <motion.div
              key={f.keyTitle}
              className="feature-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * (i + 1) }}
            >
              <div className="feature-icon" style={{ color: f.color }}>
                <f.icon size={28} />
              </div>
              <h3>{t[f.keyTitle]}</h3>
              <p>{t[f.keyDesc]}</p>
            </motion.div>
          ))}
        </div>
      </main>

      <footer className="landing-footer">
        <p>GRAM Protocol · Phase 0 Demo · Built for hackathon</p>
      </footer>
    </div>
  );
}
