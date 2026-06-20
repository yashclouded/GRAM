import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Leaf, Loader2, Phone, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const dict = {
  en: {
    welcome: "Welcome to GRAM",
    subtitle: "The direct agricultural marketplace",
    email: "Email Address",
    phone: "Phone Number",
    name: "Full Name",
    password: "Password",
    confirmPassword: "Confirm Password",
    login: "Log In",
    signup: "Create Account",
    toggleSignup: "Don't have an account? Sign up",
    toggleLogin: "Already have an account? Log in",
    errorDefault: "Authentication failed. Please check your credentials.",
    errorPassMatch: "Passwords do not match.",
    errorPassLen: "Password must be at least 6 characters.",
    errorName: "Please enter your name.",
    errorEmail: "Please enter a valid email.",
    tagline1: "Sell directly to buyers — no middlemen.",
    tagline2: "Fair prices. Real-time tracking.",
  },
  hi: {
    welcome: "GRAM में आपका स्वागत है",
    subtitle: "सीधा कृषि बाज़ार",
    email: "ईमेल पता",
    phone: "फ़ोन नंबर",
    name: "पूरा नाम",
    password: "पासवर्ड",
    confirmPassword: "पासवर्ड की पुष्टि करें",
    login: "लॉग इन करें",
    signup: "खाता बनाएं",
    toggleSignup: "खाता नहीं है? साइन अप करें",
    toggleLogin: "पहले से खाता है? लॉग इन करें",
    errorDefault: "प्रमाणीकरण विफल रहा। कृपया अपनी साख जांचें।",
    errorPassMatch: "पासवर्ड मेल नहीं खाते।",
    errorPassLen: "पासवर्ड कम से कम 6 अक्षर का होना चाहिए।",
    errorName: "कृपया अपना नाम दर्ज करें।",
    errorEmail: "कृपया एक वैध ईमेल दर्ज करें।",
    tagline1: "सीधे खरीदारों को बेचें — कोई बिचौलिया नहीं।",
    tagline2: "उचित मूल्य। रियल-टाइम ट्रैकिंग।",
  }
};

export default function Auth() {
  const { supabase } = useAuth();
  const { lang, setLang } = useLanguage();
  const t = dict[lang];

  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validate = () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) return t.errorEmail;
    if (!password || password.length < 6) return t.errorPassLen;
    if (!isLogin) {
      if (!name.trim()) return t.errorName;
      if (password !== confirmPassword) return t.errorPassMatch;
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validErr = validate();
    if (validErr) { setError(validErr); return; }

    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name: name.trim(), phone: phone.trim() }
          }
        });
        if (error) throw error;
        // Insert profile row (trigger also handles this, but belt-and-suspenders)
        if (data?.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            name: name.trim(),
            phone: phone.trim()
          });
        }
      }
    } catch (err) {
      setError(err.message || t.errorDefault);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setName(''); setPhone(''); setEmail(''); setPassword(''); setConfirmPassword('');
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
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="auth-brand">
          <div className="auth-logo"><Leaf size={36} /></div>
          <h1>{t.welcome}</h1>
          <p>{t.subtitle}</p>
          <div className="auth-taglines">
            <span>{t.tagline1}</span>
            <span>{t.tagline2}</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.form
            key={isLogin ? 'login' : 'signup'}
            onSubmit={handleSubmit}
            className="auth-form"
            initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {error && <div className="auth-error" role="alert">{error}</div>}

            {!isLogin && (
              <>
                <div className="input-group">
                  <label htmlFor="auth-name">{t.name}</label>
                  <div className="input-icon-wrap">
                    <User size={16} className="input-icon" />
                    <input
                      id="auth-name"
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder={lang === 'en' ? 'Ramesh Kumar' : 'रमेश कुमार'}
                      required
                    />
                  </div>
                </div>
                <div className="input-group">
                  <label htmlFor="auth-phone">{t.phone}</label>
                  <div className="input-icon-wrap">
                    <Phone size={16} className="input-icon" />
                    <input
                      id="auth-phone"
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="input-group">
              <label htmlFor="auth-email">{t.email}</label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="auth-password">{t.password}</label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {!isLogin && (
              <div className="input-group">
                <label htmlFor="auth-confirm">{t.confirmPassword}</label>
                <input
                  id="auth-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            )}

            <button type="submit" className="primary-btn" disabled={loading} id="auth-submit-btn">
              {loading ? <Loader2 className="spin" size={20} /> : (isLogin ? t.login : t.signup)}
            </button>
          </motion.form>
        </AnimatePresence>

        <button className="text-btn" onClick={switchMode} id="auth-toggle-btn">
          {isLogin ? t.toggleSignup : t.toggleLogin}
        </button>
      </motion.div>
    </div>
  );
}
