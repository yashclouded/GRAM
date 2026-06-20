import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMesh } from '../contexts/MeshContext';
import { useLanguage } from '../contexts/LanguageContext';
import { User, Loader2, ArrowLeft } from 'lucide-react';
import AppShell from '../components/AppShell';

const dict = {
  en: {
    title: 'Profile & Settings',
    name: 'Full Name',
    phone: 'Phone Number',
    village: 'Village',
    district: 'District',
    state: 'State',
    language: 'Language',
    save: 'Save Changes',
    saving: 'Saving...',
    saved: 'Profile updated!',
    logout: 'Log Out',
    role: 'Role',
    roles: { farmer: 'Farmer', buyer: 'Buyer', transporter: 'Transporter' },
    back: 'Back',
    errName: 'Name is required.',
    localAccount: 'Local secure account',
  },
  hi: {
    title: 'प्रोफ़ाइल और सेटिंग्स',
    name: 'पूरा नाम',
    phone: 'फ़ोन नंबर',
    village: 'गांव',
    district: 'जिला',
    state: 'राज्य',
    language: 'भाषा',
    save: 'बदलाव सहेजें',
    saving: 'सहेजा जा रहा है...',
    saved: 'प्रोफ़ाइल अपडेट हुई!',
    logout: 'लॉग आउट',
    role: 'भूमिका',
    roles: { farmer: 'किसान', buyer: 'खरीदार', transporter: 'ट्रांसपोर्टर' },
    back: 'वापस',
    errName: 'नाम आवश्यक है।',
    localAccount: 'लोकल सुरक्षित खाता',
  }
};

export default function ProfilePage() {
  const { user, profile, updateProfile, signOut } = useAuth();
  const mesh = useMesh();
  const { lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const t = dict[lang];

  const [form, setForm] = useState({
    name: profile?.name || '',
    phone: profile?.phone || '',
    village: profile?.village || '',
    district: profile?.district || '',
    state: profile?.state || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) { setError(t.errName); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      await updateProfile({
        name: form.name.trim(),
        phone: form.phone.trim(),
        village: form.village.trim(),
        district: form.district.trim(),
        state: form.state.trim(),
      });
      setSuccess(t.saved);
      setTimeout(() => setSuccess(''), 2500);
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  };

  const roleLabel = profile?.role ? (t.roles[profile.role] || profile.role) : '—';

  return (
    <AppShell icon={User} title={t.title}>
      <button
        id="profile-back-btn"
        onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', color: '#2e7d32', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, marginBottom: '1rem', padding: 0 }}
      >
        <ArrowLeft size={18} /> {t.back}
      </button>

      <div className="farmer-card" style={{ maxWidth: '480px' }}>
        {/* Email + Role (non-editable) */}
        <div style={{ marginBottom: '1.25rem', padding: '0.75rem', background: '#f8f9fa', borderRadius: '10px' }}>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#888' }}>{user?.email || t.localAccount}</p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#555', fontWeight: 600 }}>
            {t.role}: {roleLabel}
          </p>
        </div>

        <div style={{ marginBottom: '1.25rem', padding: '0.85rem', background: '#eef6ff', borderRadius: '10px', border: '1px solid #d8e9ff' }}>
          <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
            Phase 1 Local Node
          </p>
          <p style={{ margin: '0.45rem 0 0', fontSize: '0.9rem', color: '#0f172a', fontWeight: 700 }}>
            {mesh?.shortAgentId || 'Initializing...'}
          </p>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: '#475569' }}>
            Storage: {mesh?.storageMode || 'loading'} · Signed events: {mesh?.eventCount ?? 0} · Local peers: {mesh?.peerCount ?? 0}
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        <div className="listing-form" style={{ padding: 0 }}>
          <div className="input-group">
            <label>{t.name}</label>
            <input id="profile-name" type="text" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="input-group">
            <label>{t.phone}</label>
            <input id="profile-phone" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
          <div className="form-row">
            <div className="input-group">
              <label>{t.village}</label>
              <input id="profile-village" type="text" value={form.village} onChange={e => set('village', e.target.value)} />
            </div>
            <div className="input-group">
              <label>{t.district}</label>
              <input id="profile-district" type="text" value={form.district} onChange={e => set('district', e.target.value)} />
            </div>
          </div>
          <div className="input-group">
            <label>{t.state}</label>
            <input id="profile-state" type="text" value={form.state} onChange={e => set('state', e.target.value)} />
          </div>

          {/* Language toggle */}
          <div className="input-group">
            <label>{t.language}</label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {['en', 'hi'].map(l => (
                <button
                  key={l}
                  id={`lang-${l}-btn`}
                  onClick={() => setLang(l)}
                  style={{
                    flex: 1,
                    padding: '0.6rem',
                    borderRadius: '8px',
                    border: '2px solid',
                    borderColor: lang === l ? '#2e7d32' : '#e0e0e0',
                    background: lang === l ? '#e8f5e9' : 'white',
                    color: lang === l ? '#2e7d32' : '#555',
                    fontWeight: lang === l ? 700 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {l === 'en' ? 'English' : 'हिंदी'}
                </button>
              ))}
            </div>
          </div>

          <button id="profile-save-btn" className="sell-btn" onClick={save} disabled={saving}>
            {saving ? <><Loader2 className="spin" size={16} /> {t.saving}</> : t.save}
          </button>

          <button
            id="profile-logout-btn"
            onClick={() => signOut()}
            style={{ marginTop: '0.5rem', background: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2', borderRadius: '10px', padding: '0.75rem', fontWeight: 600, cursor: 'pointer', width: '100%' }}
          >
            {t.logout}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
