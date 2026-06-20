import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Leaf, ArrowRight, ShieldCheck, TrendingUp, Truck,
  Zap, Users, Globe, Star, ChevronDown
} from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';

const dict = {
  en: {
    nav: { product: 'Product', mission: 'Mission', science: 'Science', demo: 'Live Demo' },
    badge: 'Hackathon MVP · Live Demo',
    tagline: 'Agriculture,',
    tagline2: 'Reimagined.',
    sub: 'GRAM connects farmers, buyers, and transporters directly — eliminating middlemen, ensuring fair prices, and bringing real-time transparency to every trade.',
    signup: 'Start Trading',
    login: 'Sign In',
    scrollHint: 'Scroll to explore',
    // Stats
    stat1: '0% Commission',
    stat1sub: 'No hidden fees ever',
    stat2: 'Real-time',
    stat2sub: 'Live mandi price sync',
    stat3: 'AI Grading',
    stat3sub: 'Vision-based quality',
    // Section
    howTitle: 'Built for the field,',
    howTitle2: 'not the boardroom.',
    howSub: 'Three roles, one seamless marketplace — built to replace decades of inefficiency.',
    // Cards
    f1title: 'Fair Market Prices',
    f1desc: 'Real mandi rates, live. Prices set by the market — not by brokers who pocket the difference.',
    f2title: 'Direct Trade',
    f2desc: 'Farmers list crops. Buyers bid. Deals happen without a single middleman taking a cut.',
    f3title: 'Live Tracking',
    f3desc: 'Watch your shipment move from farm to warehouse. Every step confirmed in real-time.',
    f4title: 'AI Quality Grade',
    f4desc: 'Upload a crop photo and get an instant AI-powered quality grade — objective, fast, fair.',
    // CTA section
    ctaTitle: 'The future of farming',
    ctaTitle2: 'starts here.',
    ctaSub: 'Join the protocol that gives power back to the people who feed the world.',
    ctaBtn: 'Enter the Marketplace',
    // Roles
    rolesTitle: 'One platform.',
    rolesTitle2: 'Three roles.',
    role1: 'Farmer',
    role1sub: 'List crops, receive bids, track payments.',
    role2: 'Buyer',
    role2sub: 'Browse listings, place orders, confirm delivery.',
    role3: 'Transporter',
    role3sub: 'Find loads, get assigned, deliver efficiently.',
    // Footer
    footerTagline: 'No middlemen. No hidden fees. Just fair trade.',
    footerNote: 'Phase 0 Hackathon Demo · GRAM Protocol',
  },
  hi: {
    nav: { product: 'प्रोडक्ट', mission: 'मिशन', science: 'विज्ञान', demo: 'लाइव डेमो' },
    badge: 'हैकथॉन MVP · लाइव डेमो',
    tagline: 'खेती,',
    tagline2: 'नए सिरे से।',
    sub: 'GRAM किसानों, खरीदारों और ट्रांसपोर्टरों को सीधे जोड़ता है — बिचौलियों को हटाकर, उचित मूल्य सुनिश्चित करके, हर व्यापार में पारदर्शिता लाकर।',
    signup: 'व्यापार शुरू करें',
    login: 'लॉग इन',
    scrollHint: 'स्क्रॉल करें',
    stat1: '0% कमीशन',
    stat1sub: 'कोई छुपी फीस नहीं',
    stat2: 'रियल-टाइम',
    stat2sub: 'लाइव मंडी भाव',
    stat3: 'AI ग्रेडिंग',
    stat3sub: 'विजन-बेस्ड क्वालिटी',
    howTitle: 'खेत के लिए बना,',
    howTitle2: 'बोर्डरूम के लिए नहीं।',
    howSub: 'तीन भूमिकाएं, एक बाज़ार — दशकों की अक्षमता को बदलने के लिए।',
    f1title: 'उचित बाज़ार भाव',
    f1desc: 'सच्चे मंडी दाम, लाइव। कीमतें बाज़ार तय करता है — दलाल नहीं।',
    f2title: 'सीधा व्यापार',
    f2desc: 'किसान फसल लिस्ट करते हैं। खरीदार बोली लगाते हैं। कोई बीच में नहीं।',
    f3title: 'लाइव ट्रैकिंग',
    f3desc: 'खेत से गोदाम तक अपना ऑर्डर देखें। हर कदम रियल-टाइम में।',
    f4title: 'AI क्वालिटी ग्रेड',
    f4desc: 'फसल की फोटो डालें और तुरंत AI ग्रेड पाएं — निष्पक्ष और सटीक।',
    ctaTitle: 'खेती का भविष्य',
    ctaTitle2: 'यहाँ से शुरू होता है।',
    ctaSub: 'उस प्रोटोकॉल से जुड़ें जो दुनिया का पेट भरने वाले लोगों को शक्ति देता है।',
    ctaBtn: 'मार्केटप्लेस में जाएं',
    rolesTitle: 'एक प्लेटफॉर्म।',
    rolesTitle2: 'तीन भूमिकाएं।',
    role1: 'किसान',
    role1sub: 'फसल लिस्ट करें, बोलियां पाएं, भुगतान ट्रैक करें।',
    role2: 'खरीदार',
    role2sub: 'लिस्टिंग देखें, ऑर्डर दें, डिलीवरी कन्फर्म करें।',
    role3: 'ट्रांसपोर्टर',
    role3sub: 'लोड खोजें, असाइन हों, कुशलता से डिलीवरी करें।',
    footerTagline: 'कोई बिचौलिया नहीं। कोई छुपी फीस नहीं। बस उचित व्यापार।',
    footerNote: 'फेज 0 हैकथॉन डेमो · GRAM प्रोटोकॉल',
  }
};

const features = [
  { icon: TrendingUp, key: 'f1', gradient: 'from-emerald-400 to-green-600' },
  { icon: ShieldCheck, key: 'f2', gradient: 'from-blue-400 to-indigo-600' },
  { icon: Truck, key: 'f3', gradient: 'from-orange-400 to-amber-600' },
  { icon: Zap, key: 'f4', gradient: 'from-purple-400 to-violet-600' },
];

// Animated counter
function Counter({ end, suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const observed = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !observed.current) {
        observed.current = true;
        const start = Date.now();
        const step = () => {
          const p = Math.min((Date.now() - start) / duration, 1);
          setCount(Math.floor(p * end));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end, duration]);
  return <span ref={ref}>{count}{suffix}</span>;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { lang, setLang } = useLanguage();
  const t = dict[lang];
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);
  const bgOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div className="lp-root">

      {/* ── NAVBAR ── */}
      <header className={`lp-nav ${scrolled ? 'lp-nav--scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <div className="lp-logo">
            <div className="lp-logo-icon">
              <Leaf size={18} color="#fff" strokeWidth={2.5} />
            </div>
            <span>GRAM</span>
          </div>
          <nav className="lp-nav-links">
            <a href="#features">{t.nav.product}</a>
            <a href="#roles">{t.nav.mission}</a>
            <a href="/science" onClick={(e) => { e.preventDefault(); navigate('/science'); }}>{t.nav.science}</a>
          </nav>
          <div className="lp-nav-right">
            <button className="lp-lang-btn" onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}>
              {lang === 'en' ? 'हिंदी' : 'English'}
            </button>
            <button className="lp-signin-btn" id="login-btn-landing" onClick={() => navigate('/auth')}>
              {t.login}
            </button>
            <button className="lp-cta-btn" id="signup-btn-landing" onClick={() => navigate('/auth')}>
              {t.signup} <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="lp-hero" ref={heroRef}>
        {/* Parallax BG */}
        <motion.div
          className="lp-hero-bg"
          style={{ y: bgY, opacity: bgOpacity }}
        >
          <img src="/herobg.jpg" alt="Aerial farmland" className="lp-hero-bg-img" />
          <div className="lp-hero-bg-overlay" />
        </motion.div>

        {/* Grain texture */}
        <div className="lp-grain" />

        {/* Content */}
        <div className="lp-hero-content">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="lp-hero-badge">
              <span className="lp-badge-dot" />
              {t.badge}
            </div>
          </motion.div>

          <motion.h1
            className="lp-hero-title"
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            {t.tagline}<br />
            <span className="lp-hero-title-accent">{t.tagline2}</span>
          </motion.h1>

          <motion.p
            className="lp-hero-sub"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {t.sub}
          </motion.p>

          <motion.div
            className="lp-hero-actions"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <button className="lp-hero-primary" onClick={() => navigate('/auth')}>
              {t.signup}
              <ArrowRight size={18} />
            </button>
            <button className="lp-hero-secondary" onClick={() => navigate('/auth')}>
              {t.login}
            </button>
          </motion.div>
        </div>

        {/* Stats glass strip */}
        <motion.div
          className="lp-stats-strip"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.55 }}
        >
          {[
            { val: t.stat1, sub: t.stat1sub, icon: ShieldCheck },
            { val: t.stat2, sub: t.stat2sub, icon: Zap },
            { val: t.stat3, sub: t.stat3sub, icon: Star },
          ].map((s, i) => (
            <div key={i} className="lp-stat">
              <s.icon size={18} className="lp-stat-icon" />
              <div className="lp-stat-text">
                <strong>{s.val}</strong>
                <span>{s.sub}</span>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          className="lp-scroll-hint"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        >
          <ChevronDown size={22} />
        </motion.div>
      </section>

      {/* ── FEATURES ── */}
      <section className="lp-features" id="features">
        <div className="lp-section-inner">
          <motion.div
            className="lp-section-header"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7 }}
          >
            <div className="lp-eyebrow">What we built</div>
            <h2 className="lp-section-title">
              {t.howTitle}<br />
              <span className="lp-title-accent">{t.howTitle2}</span>
            </h2>
            <p className="lp-section-sub">{t.howSub}</p>
          </motion.div>

          <div className="lp-features-grid">
            {features.map((f, i) => (
              <motion.div
                key={f.key}
                className="lp-feature-card"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <div className={`lp-feat-icon lp-feat-icon--${f.key}`}>
                  <f.icon size={22} />
                </div>
                <h3>{t[f.key + 'title']}</h3>
                <p>{t[f.key + 'desc']}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── IMMERSIVE DIVIDER ── */}
      <section className="lp-divider-section">
        <div className="lp-divider-img-wrap">
          <img src="/farmer.jpg" alt="Indian farmer at sunset" className="lp-divider-img" />
          <div className="lp-divider-overlay" />
        </div>
        <motion.div
          className="lp-divider-text"
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <blockquote>
            "When a farmer gets a fair price,<br />
            the whole country eats better."
          </blockquote>
          <cite>— The GRAM Principle</cite>
        </motion.div>
      </section>

      {/* ── ROLES ── */}
      <section className="lp-roles" id="roles">
        <div className="lp-section-inner">
          <motion.div
            className="lp-section-header"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7 }}
          >
            <div className="lp-eyebrow">Who it's for</div>
            <h2 className="lp-section-title">
              {t.rolesTitle}<br />
              <span className="lp-title-accent">{t.rolesTitle2}</span>
            </h2>
          </motion.div>

          <div className="lp-roles-grid">
            {[
              { emoji: '🌾', role: t.role1, sub: t.role1sub, color: '#16a34a' },
              { emoji: '🏪', role: t.role2, sub: t.role2sub, color: '#1d4ed8' },
              { emoji: '🚛', role: t.role3, sub: t.role3sub, color: '#ea580c' },
            ].map((r, i) => (
              <motion.div
                key={r.role}
                className="lp-role-card"
                initial={{ opacity: 0, scale: 0.92 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
                onClick={() => navigate('/auth')}
                style={{ cursor: 'pointer' }}
              >
                <div className="lp-role-emoji">{r.emoji}</div>
                <h3 style={{ color: r.color }}>{r.role}</h3>
                <p>{r.sub}</p>
                <div className="lp-role-arrow" style={{ color: r.color }}>
                  <ArrowRight size={16} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="lp-cta-section">
        <div className="lp-cta-bg">
          <div className="lp-cta-glow lp-cta-glow--1" />
          <div className="lp-cta-glow lp-cta-glow--2" />
        </div>
        <motion.div
          className="lp-cta-content"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.8 }}
        >
          <div className="lp-eyebrow lp-eyebrow--light">Ready to join?</div>
          <h2 className="lp-cta-title">
            {t.ctaTitle}<br />
            <span className="lp-cta-title-accent">{t.ctaTitle2}</span>
          </h2>
          <p className="lp-cta-sub">{t.ctaSub}</p>
          <button className="lp-cta-main-btn" onClick={() => navigate('/auth')}>
            {t.ctaBtn} <ArrowRight size={18} />
          </button>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-logo" style={{ opacity: 0.7 }}>
            <div className="lp-logo-icon">
              <Leaf size={16} color="#fff" strokeWidth={2.5} />
            </div>
            <span style={{ color: '#fff' }}>GRAM</span>
          </div>
          <p className="lp-footer-tagline">{t.footerTagline}</p>
          <p className="lp-footer-note">{t.footerNote}</p>
        </div>
      </footer>
    </div>
  );
}
