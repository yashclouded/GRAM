import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Leaf, Loader2, Lock, Phone, ShieldCheck, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LOCAL_PASSPHRASE_MIN } from '../auth/localAuth';

const dict = {
  en: {
    welcome: "Welcome to GRAM",
    subtitle: "The direct agricultural marketplace",
    secureLocal: "Secure Local",
    cloudAuth: "Cloud Auth",
    secureLocalRecommended: "Recommended for serverless mode",
    localSubtitle: "Encrypted on-device vault. Unlock stays in memory only for this tab.",
    localCreate: "Create Secure Device Account",
    localUnlock: "Unlock This Device",
    localExisting: "This device already has a secure local account.",
    localHint: "Stored for",
    localLockedNote: "Your passphrase never leaves this device.",
    email: "Email Address",
    phone: "Phone Number",
    name: "Full Name",
    password: "Password",
    passphrase: "Passphrase",
    confirmPassword: "Confirm Password",
    login: "Log In",
    signup: "Create Account",
    unlock: "Unlock",
    toggleSignup: "Don't have an account? Sign up",
    toggleLogin: "Already have an account? Log in",
    errorDefault: "Authentication failed. Please check your credentials.",
    errorPassMatch: "Passwords do not match.",
    errorPassLen: "Password must be at least 6 characters.",
    errorLocalPassLen: `Passphrase must be at least ${LOCAL_PASSPHRASE_MIN} characters.`,
    errorName: "Please enter your name.",
    errorEmail: "Please enter a valid email.",
    errorLocalUnsupported: "Secure local authentication requires HTTPS or localhost with IndexedDB and Web Crypto.",
    tagline1: "Sell directly to buyers — no middlemen.",
    tagline2: "Fair prices. Real-time tracking.",
    checkEmail: "Account created! Please check your email to verify your account.",
    cloudReady: "Supabase session",
    cloudUnavailable: "Unavailable in this build",
  },
  hi: {
    welcome: "GRAM में आपका स्वागत है",
    subtitle: "सीधा कृषि बाज़ार",
    secureLocal: "सुरक्षित लोकल",
    cloudAuth: "क्लाउड ऑथ",
    secureLocalRecommended: "सर्वरलेस मोड के लिए अनुशंसित",
    localSubtitle: "डिवाइस पर एन्क्रिप्टेड वॉल्ट। यह केवल इस टैब की मेमोरी में अनलॉक रहता है।",
    localCreate: "सुरक्षित डिवाइस खाता बनाएं",
    localUnlock: "इस डिवाइस को अनलॉक करें",
    localExisting: "इस डिवाइस पर पहले से एक सुरक्षित लोकल खाता है।",
    localHint: "इसके लिए संग्रहीत",
    localLockedNote: "आपका पासफ्रेज इस डिवाइस से बाहर नहीं जाता।",
    email: "ईमेल पता",
    phone: "फ़ोन नंबर",
    name: "पूरा नाम",
    password: "पासवर्ड",
    passphrase: "पासफ्रेज",
    confirmPassword: "पासवर्ड की पुष्टि करें",
    login: "लॉग इन करें",
    signup: "खाता बनाएं",
    unlock: "अनलॉक करें",
    toggleSignup: "खाता नहीं है? साइन अप करें",
    toggleLogin: "पहले से खाता है? लॉग इन करें",
    errorDefault: "प्रमाणीकरण विफल रहा। कृपया अपनी साख जांचें।",
    errorPassMatch: "पासवर्ड मेल नहीं खाते।",
    errorPassLen: "पासवर्ड कम से कम 6 अक्षर का होना चाहिए।",
    errorLocalPassLen: `पासफ्रेज कम से कम ${LOCAL_PASSPHRASE_MIN} अक्षरों का होना चाहिए।`,
    errorName: "कृपया अपना नाम दर्ज करें।",
    errorEmail: "कृपया एक वैध ईमेल दर्ज करें।",
    errorLocalUnsupported: "सुरक्षित लोकल प्रमाणीकरण के लिए HTTPS या localhost, IndexedDB और Web Crypto आवश्यक हैं।",
    tagline1: "सीधे खरीदारों को बेचें — कोई बिचौलिया नहीं।",
    tagline2: "उचित मूल्य। रियल-टाइम ट्रैकिंग।",
    checkEmail: "खाता बन गया! कृपया अपना खाता सत्यापित करने के लिए अपना ईमेल जांचें।",
    cloudReady: "Supabase सत्र",
    cloudUnavailable: "इस बिल्ड में उपलब्ध नहीं",
  }
};

export default function Auth() {
  const {
    supabase,
    supabaseEnabled,
    signInLocal,
    signUpLocal,
    localAccountMeta,
    localAuthAvailable,
  } = useAuth();
  const { lang, setLang } = useLanguage();
  const t = dict[lang];

  const [authMethod, setAuthMethod] = useState(localAccountMeta?.exists || !supabaseEnabled ? 'local' : 'cloud');
  const [autoSelectedLocal, setAutoSelectedLocal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const isLocalMode = authMethod === 'local';
  const localAccountExists = Boolean(localAccountMeta?.exists);

  useEffect(() => {
    if (!supabaseEnabled) {
      setAuthMethod('local');
      return;
    }

    if (localAccountExists && !autoSelectedLocal) {
      setAuthMethod('local');
      setAutoSelectedLocal(true);
    }
  }, [autoSelectedLocal, localAccountExists, supabaseEnabled]);

  const validate = () => {
    if (isLocalMode) {
      if (!localAuthAvailable) return t.errorLocalUnsupported;
      if (!password || password.length < LOCAL_PASSPHRASE_MIN) return t.errorLocalPassLen;
      if (!localAccountExists) {
        if (!name.trim()) return t.errorName;
        if (password !== confirmPassword) return t.errorPassMatch;
      }
      return null;
    }

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
    setSuccess('');
    try {
      if (isLocalMode) {
        if (localAccountExists) {
          await signInLocal({ passphrase: password });
        } else {
          await signUpLocal({
            name,
            phone,
            email,
            passphrase: password,
          });
        }
      } else if (isLogin) {
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
        
        if (!data.session) {
          setSuccess(t.checkEmail);
          setLoading(false);
          return;
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
    setSuccess('');
    setName(''); setPhone(''); setEmail(''); setPassword(''); setConfirmPassword('');
  };

  const switchAuthMethod = (method) => {
    setAuthMethod(method);
    setError('');
    setSuccess('');
    setPassword('');
    setConfirmPassword('');
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

        <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <button
            type="button"
            className="text-btn"
            onClick={() => switchAuthMethod('local')}
            disabled={!localAuthAvailable && !localAccountExists}
            style={{
              flex: 1,
              border: '1px solid',
              borderColor: isLocalMode ? '#2e7d32' : '#d6e3d8',
              borderRadius: '12px',
              padding: '0.85rem',
              background: isLocalMode ? '#eef8f0' : 'white',
              textAlign: 'left',
              opacity: localAuthAvailable || localAccountExists ? 1 : 0.55
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, color: '#1f2937' }}>
              <ShieldCheck size={17} /> {t.secureLocal}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#2e7d32', marginTop: '0.3rem', fontWeight: 700 }}>
              {t.secureLocalRecommended}
            </div>
          </button>
          <button
            type="button"
            className="text-btn"
            onClick={() => switchAuthMethod('cloud')}
            disabled={!supabaseEnabled}
            style={{
              flex: 1,
              border: '1px solid',
              borderColor: !isLocalMode ? '#2e7d32' : '#d6e3d8',
              borderRadius: '12px',
              padding: '0.85rem',
              background: !isLocalMode ? '#eef8f0' : 'white',
              textAlign: 'left',
              opacity: supabaseEnabled ? 1 : 0.55
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, color: '#1f2937' }}>
              <Lock size={17} /> {t.cloudAuth}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '0.3rem' }}>
              {supabaseEnabled ? t.cloudReady : t.cloudUnavailable}
            </div>
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.form
            key={`${authMethod}-${isLocalMode ? (localAccountExists ? 'unlock' : 'create') : (isLogin ? 'login' : 'signup')}`}
            onSubmit={handleSubmit}
            className="auth-form"
            initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {error && <div className="auth-error" role="alert">{error}</div>}
            {success && <div className="auth-success" role="status" style={{ marginBottom: '1rem' }}>{success}</div>}

            {isLocalMode && (
              <div style={{ marginBottom: '1rem', padding: '0.9rem 1rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                  {localAccountExists ? t.localUnlock : t.localCreate}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.45 }}>
                  {t.localSubtitle}
                </div>
                {localAccountExists && (
                  <div style={{ marginTop: '0.65rem', fontSize: '0.82rem', color: '#334155' }}>
                    <strong>{t.localHint}:</strong> {localAccountMeta?.label || localAccountMeta?.hint?.name || 'Local agent'}
                  </div>
                )}
                <div style={{ marginTop: '0.55rem', fontSize: '0.78rem', color: '#2e7d32', fontWeight: 700 }}>
                  {t.localLockedNote}
                </div>
              </div>
            )}

            {!isLocalMode && !isLogin && (
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

            {isLocalMode && !localAccountExists && (
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

            {(!isLocalMode || !localAccountExists) && (
              <div className="input-group">
                <label htmlFor="auth-email">{t.email}</label>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required={!isLocalMode}
                />
              </div>
            )}

            <div className="input-group">
              <label htmlFor="auth-password">{isLocalMode ? t.passphrase : t.password}</label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {(isLocalMode ? !localAccountExists : !isLogin) && (
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
              {loading ? <Loader2 className="spin" size={20} /> : (
                isLocalMode
                  ? (localAccountExists ? t.unlock : t.localCreate)
                  : (isLogin ? t.login : t.signup)
              )}
            </button>
          </motion.form>
        </AnimatePresence>

        {!isLocalMode && (
          <button className="text-btn" onClick={switchMode} id="auth-toggle-btn">
            {isLogin ? t.toggleSignup : t.toggleLogin}
          </button>
        )}
      </motion.div>
    </div>
  );
}
