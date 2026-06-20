import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Leaf, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const dict = {
  en: {
    welcome: "Welcome to Gram",
    subtitle: "The decentralized agricultural network",
    email: "Email Address",
    password: "Password",
    login: "Log In",
    signup: "Create Account",
    toggleSignup: "Don't have an account? Sign up",
    toggleLogin: "Already have an account? Log in",
    error: "Authentication failed. Please check your credentials."
  },
  hi: {
    welcome: "ग्राम में आपका स्वागत है",
    subtitle: "विकेंद्रीकृत कृषि नेटवर्क",
    email: "ईमेल पता",
    password: "पासवर्ड",
    login: "लॉग इन करें",
    signup: "खाता बनाएं",
    toggleSignup: "खाता नहीं है? साइन अप करें",
    toggleLogin: "पहले से खाता है? लॉग इन करें",
    error: "प्रमाणीकरण विफल रहा। कृपया अपनी साख जांचें।"
  }
};

export default function Auth() {
  const { supabase } = useAuth();
  const { lang, setLang } = useLanguage();
  const t = dict[lang];

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message || t.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <header className="auth-header">
        <button className="lang-toggle" onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}>
          {lang === 'en' ? 'हिंदी' : 'English'}
        </button>
      </header>
      
      <motion.div 
        className="auth-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="auth-brand">
          <div className="auth-logo"><Leaf size={32} /></div>
          <h1>{t.welcome}</h1>
          <p>{t.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          
          <div className="input-group">
            <label>{t.email}</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              required 
            />
          </div>
          
          <div className="input-group">
            <label>{t.password}</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              required 
            />
          </div>

          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? <Loader2 className="spin" /> : (isLogin ? t.login : t.signup)}
          </button>
        </form>

        <button className="text-btn" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? t.toggleSignup : t.toggleLogin}
        </button>
      </motion.div>
    </div>
  );
}
