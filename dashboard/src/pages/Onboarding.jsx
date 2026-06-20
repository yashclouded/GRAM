import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { motion } from 'framer-motion';
import { User, Store, Truck, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const dict = {
  en: {
    title: "Who are you?",
    subtitle: "Select your role to continue",
    farmer: "Farmer",
    farmerDesc: "I want to sell my crops",
    buyer: "Buyer",
    buyerDesc: "I want to buy crops",
    transporter: "Transporter",
    transporterDesc: "I want to transport goods",
    continue: "Continue"
  },
  hi: {
    title: "आप कौन हैं?",
    subtitle: "आगे बढ़ने के लिए अपनी भूमिका चुनें",
    farmer: "किसान (Farmer)",
    farmerDesc: "मैं अपनी फसल बेचना चाहता हूँ",
    buyer: "खरीदार (Buyer)",
    buyerDesc: "मैं फसल खरीदना चाहता हूँ",
    transporter: "ट्रांसपोर्टर (Transporter)",
    transporterDesc: "मैं माल परिवहन करना चाहता हूँ",
    continue: "आगे बढ़ें"
  }
};

export default function Onboarding() {
  const { updateProfile } = useAuth();
  const { lang } = useLanguage();
  const t = dict[lang];
  const navigate = useNavigate();

  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!role) return;
    setLoading(true);
    try {
      await updateProfile({ role });
      navigate(`/${role}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-container">
      <motion.div 
        className="onboarding-content"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <h1>{t.title}</h1>
        <p>{t.subtitle}</p>

        <div className="role-grid">
          <div className={`role-card ${role === 'farmer' ? 'selected' : ''}`} onClick={() => setRole('farmer')}>
            <div className="role-icon"><User size={32}/></div>
            <h2>{t.farmer}</h2>
            <p>{t.farmerDesc}</p>
          </div>
          
          <div className={`role-card ${role === 'buyer' ? 'selected' : ''}`} onClick={() => setRole('buyer')}>
            <div className="role-icon"><Store size={32}/></div>
            <h2>{t.buyer}</h2>
            <p>{t.buyerDesc}</p>
          </div>
          
          <div className={`role-card ${role === 'transporter' ? 'selected' : ''}`} onClick={() => setRole('transporter')}>
            <div className="role-icon"><Truck size={32}/></div>
            <h2>{t.transporter}</h2>
            <p>{t.transporterDesc}</p>
          </div>
        </div>

        <button 
          className="primary-btn" 
          disabled={!role || loading} 
          onClick={handleContinue}
          style={{ marginTop: '2rem', width: '100%' }}
        >
          {loading ? <Loader2 className="spin" /> : t.continue}
        </button>
      </motion.div>
    </div>
  );
}
