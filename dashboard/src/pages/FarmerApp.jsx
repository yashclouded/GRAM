import React, { useState, useEffect } from 'react';
import { Leaf, Loader2, PackagePlus, List, Inbox, Navigation } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import AppShell from '../components/AppShell';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import './FarmerApp.css';

// ─── i18n ─────────────────────────────────────────────────────────────────────
const dict = {
  en: {
    appTitle: 'GRAM Farmer',
    tabCreate: 'List Crop',
    tabListings: 'My Listings',
    tabOffers: 'Offers',
    tabTracking: 'Tracking',
    // Create listing
    crop: 'Crop Type',
    quantity: 'Quantity',
    unit: 'Unit',
    grade: 'Quality Grade',
    price: 'Expected Price (₹ per unit)',
    location: 'Location',
    description: 'Description (optional)',
    submit: 'List for Sale',
    submitting: 'Listing...',
    successCreate: 'Listing created successfully!',
    // Validations
    errCrop: 'Please select a crop.',
    errQty: 'Enter a valid quantity.',
    errPrice: 'Enter a valid price.',
    errLocation: 'Please enter a location.',
    // Listings
    noListings: 'No listings yet.',
    noListingsSub: 'Create your first listing using the List Crop tab.',
    qty: 'Qty',
    // Offers
    noOffers: 'No pending offers.',
    noOffersSub: 'You will see buyer offers here once your listings receive orders.',
    accept: 'Accept',
    reject: 'Reject',
    buyerOrder: 'Buyer Order',
    // Tracking
    noTracking: 'No active deliveries.',
    noTrackingSub: 'Accepted orders will appear here for tracking.',
    markPayment: 'Mark Payment Received',
    // status steps
    stepAccepted: 'Order Accepted',
    stepTransporter: 'Transporter Assigned',
    stepPickedUp: 'Picked Up',
    stepInTransit: 'In Transit',
    stepDelivered: 'Delivered',
    stepPayment: 'Payment Confirmed',
    // crops
    crops: ['Wheat', 'Rice', 'Cotton', 'Sugarcane', 'Maize', 'Soybean', 'Pulses', 'Onion', 'Potato', 'Tomato'],
    units: ['Quintal', 'Kg', 'Tonne'],
    grades: ['A', 'B', 'C'],
  },
  hi: {
    appTitle: 'ग्राम किसान',
    tabCreate: 'फसल लिस्ट करें',
    tabListings: 'मेरी लिस्टिंग',
    tabOffers: 'ऑफर',
    tabTracking: 'ट्रैकिंग',
    crop: 'फसल का प्रकार',
    quantity: 'मात्रा',
    unit: 'इकाई',
    grade: 'गुणवत्ता श्रेणी',
    price: 'अनुमानित कीमत (₹ प्रति इकाई)',
    location: 'स्थान',
    description: 'विवरण (वैकल्पिक)',
    submit: 'बिक्री के लिए सूचीबद्ध करें',
    submitting: 'सूचीबद्ध हो रहा है...',
    successCreate: 'लिस्टिंग सफलतापूर्वक बनाई गई!',
    errCrop: 'कृपया एक फसल चुनें।',
    errQty: 'एक वैध मात्रा दर्ज करें।',
    errPrice: 'एक वैध कीमत दर्ज करें।',
    errLocation: 'कृपया स्थान दर्ज करें।',
    noListings: 'अभी तक कोई लिस्टिंग नहीं।',
    noListingsSub: '"फसल लिस्ट करें" टैब से अपनी पहली लिस्टिंग बनाएं।',
    qty: 'मात्रा',
    noOffers: 'कोई लंबित ऑफर नहीं।',
    noOffersSub: 'जब आपकी लिस्टिंग को ऑर्डर मिलेंगे, वे यहाँ दिखेंगे।',
    accept: 'स्वीकार करें',
    reject: 'अस्वीकार करें',
    buyerOrder: 'खरीदार का ऑर्डर',
    noTracking: 'कोई सक्रिय डिलीवरी नहीं।',
    noTrackingSub: 'स्वीकृत ऑर्डर ट्रैकिंग के लिए यहाँ दिखेंगे।',
    markPayment: 'भुगतान प्राप्त चिह्नित करें',
    stepAccepted: 'ऑर्डर स्वीकृत',
    stepTransporter: 'ट्रांसपोर्टर नियुक्त',
    stepPickedUp: 'उठाया गया',
    stepInTransit: 'रास्ते में',
    stepDelivered: 'डिलीवर हुआ',
    stepPayment: 'भुगतान पुष्टि',
    crops: ['गेहूँ', 'चावल', 'कपास', 'गन्ना', 'मक्का', 'सोयाबीन', 'दालें', 'प्याज', 'आलू', 'टमाटर'],
    units: ['क्विंटल', 'किग्रा', 'टन'],
    grades: ['A', 'B', 'C'],
  }
};

const TRACKING_STEPS = ['accepted', 'transporter_assigned', 'picked_up', 'in_transit', 'delivered', 'payment_confirmed'];
const STEP_KEYS = ['stepAccepted', 'stepTransporter', 'stepPickedUp', 'stepInTransit', 'stepDelivered', 'stepPayment'];

// ─── Sub-components ────────────────────────────────────────────────────────────

function CreateListingForm({ supabase, user, lang, t, onSuccess }) {
  const [form, setForm] = useState({
    crop: '', quantity: '', unit: 'Quintal', grade: 'A', price_per_unit: '', location: '', description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    if (!form.crop) return t.errCrop;
    if (!form.quantity || isNaN(form.quantity) || +form.quantity <= 0) return t.errQty;
    if (!form.price_per_unit || isNaN(form.price_per_unit) || +form.price_per_unit <= 0) return t.errPrice;
    if (!form.location.trim()) return t.errLocation;
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true); setError(''); setSuccess('');
    const { error: dbErr } = await supabase.from('listings').insert({
      farmer_id: user.id,
      crop: form.crop,
      quantity: +form.quantity,
      unit: form.unit,
      grade: form.grade,
      price_per_unit: +form.price_per_unit,
      location: form.location.trim(),
      description: form.description.trim() || null,
    });
    setLoading(false);
    if (dbErr) { setError(dbErr.message); return; }
    setSuccess(t.successCreate);
    setForm({ crop: '', quantity: '', unit: 'Quintal', grade: 'A', price_per_unit: '', location: '', description: '' });
    setTimeout(() => { setSuccess(''); onSuccess(); }, 1200);
  };

  const cropOptions = ['Wheat', 'Rice', 'Cotton', 'Sugarcane', 'Maize', 'Soybean', 'Pulses', 'Onion', 'Potato', 'Tomato'];
  const cropDisplay = lang === 'hi' ? t.crops : cropOptions;

  return (
    <form onSubmit={handleSubmit} className="listing-form">
      {error && <div className="auth-error">{error}</div>}
      {success && <div className="auth-success">{success}</div>}

      <div className="form-row">
        <div className="input-group">
          <label>{t.crop}</label>
          <select id="farmer-crop" value={form.crop} onChange={e => set('crop', e.target.value)} required>
            <option value="">{lang === 'en' ? '— Select —' : '— चुनें —'}</option>
            {cropOptions.map((c, i) => <option key={c} value={c}>{cropDisplay[i]}</option>)}
          </select>
        </div>
        <div className="input-group">
          <label>{t.grade}</label>
          <select id="farmer-grade" value={form.grade} onChange={e => set('grade', e.target.value)}>
            {['A', 'B', 'C'].map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="input-group">
          <label>{t.quantity}</label>
          <input id="farmer-qty" type="number" min="0.1" step="0.1" value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="100" />
        </div>
        <div className="input-group">
          <label>{t.unit}</label>
          <select id="farmer-unit" value={form.unit} onChange={e => set('unit', e.target.value)}>
            {['Quintal', 'Kg', 'Tonne'].map((u, i) => (
              <option key={u} value={u}>{t.units[i]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="input-group">
        <label>{t.price}</label>
        <input id="farmer-price" type="number" min="1" value={form.price_per_unit} onChange={e => set('price_per_unit', e.target.value)} placeholder="2500" />
      </div>

      <div className="input-group">
        <label>{t.location}</label>
        <input id="farmer-location" type="text" value={form.location} onChange={e => set('location', e.target.value)} placeholder={lang === 'en' ? 'Pune, Maharashtra' : 'पुणे, महाराष्ट्र'} />
      </div>

      <div className="input-group">
        <label>{t.description}</label>
        <textarea id="farmer-desc" value={form.description} onChange={e => set('description', e.target.value)} rows={2} style={{ resize: 'vertical' }} />
      </div>

      <button type="submit" className="sell-btn" disabled={loading} id="farmer-submit-listing">
        {loading ? <><Loader2 className="spin" size={16} /> {t.submitting}</> : t.submit}
      </button>
    </form>
  );
}

function MyListings({ listings, lang, t, loading }) {
  if (loading) return <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 className="spin" size={28} color="#2e7d32" /></div>;
  if (!listings.length) return <EmptyState icon={List} title={t.noListings} subtitle={t.noListingsSub} />;

  return (
    <div className="listings-grid">
      {listings.map(l => (
        <div key={l.id} className="farmer-card listing-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ margin: 0, color: '#1a1a1a' }}>{l.crop}</h3>
              <p style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                {l.quantity} {l.unit} · {l.location}
              </p>
            </div>
            <StatusBadge status={l.status} lang={lang} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
            <span className="grade-badge">{lang === 'en' ? 'Grade' : 'श्रेणी'} {l.grade}</span>
            <span className="price-text" style={{ fontSize: '1.1rem' }}>₹{l.price_per_unit}/{l.unit === 'Quintal' ? (lang === 'hi' ? 'क्विंटल' : 'Qtl') : l.unit}</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '0.5rem' }}>
            {new Date(l.created_at).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN')}
          </p>
        </div>
      ))}
    </div>
  );
}

function OffersTab({ supabase, user, lang, t, onUpdate }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(null);

  useEffect(() => {
    fetchOrders();
    const ch = supabase.channel('farmer-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `farmer_id=eq.${user.id}` },
        () => fetchOrders())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, listings(crop, quantity, unit, price_per_unit, location)')
      .eq('farmer_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  const updateStatus = async (orderId, status) => {
    setActioning(orderId + status);
    await supabase.from('orders').update({ status }).eq('id', orderId);
    setActioning(null);
    onUpdate();
    fetchOrders();
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 className="spin" size={28} color="#2e7d32" /></div>;
  if (!orders.length) return <EmptyState icon={Inbox} title={t.noOffers} subtitle={t.noOffersSub} />;

  return (
    <div className="listings-grid">
      {orders.map(o => (
        <div key={o.id} className="farmer-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>{t.buyerOrder}</h3>
            <StatusBadge status="pending" lang={lang} />
          </div>
          <p style={{ color: '#555', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            {o.listings?.crop} · {o.quantity} {o.listings?.unit} · ₹{o.agreed_price}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              id={`accept-order-${o.id}`}
              className="sell-btn"
              style={{ flex: 1, padding: '0.6rem' }}
              disabled={!!actioning}
              onClick={() => updateStatus(o.id, 'accepted')}
            >
              {actioning === o.id + 'accepted' ? <Loader2 className="spin" size={16} /> : t.accept}
            </button>
            <button
              id={`reject-order-${o.id}`}
              className="sell-btn"
              style={{ flex: 1, padding: '0.6rem', background: '#c62828' }}
              disabled={!!actioning}
              onClick={() => updateStatus(o.id, 'rejected')}
            >
              {actioning === o.id + 'rejected' ? <Loader2 className="spin" size={16} /> : t.reject}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function TrackingTab({ supabase, user, lang, t }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);

  useEffect(() => {
    fetchOrders();
    const ch = supabase.channel('farmer-tracking')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `farmer_id=eq.${user.id}` },
        () => fetchOrders())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, listings(crop, unit)')
      .eq('farmer_id', user.id)
      .not('status', 'in', '("pending","rejected")')
      .order('updated_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  const markPayment = async (orderId) => {
    setPaying(orderId);
    await supabase.from('orders').update({ status: 'payment_confirmed' }).eq('id', orderId);
    setPaying(null);
    fetchOrders();
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 className="spin" size={28} color="#2e7d32" /></div>;
  if (!orders.length) return <EmptyState icon={Navigation} title={t.noTracking} subtitle={t.noTrackingSub} />;

  return (
    <div className="listings-grid">
      {orders.map(o => {
        const stepIdx = TRACKING_STEPS.indexOf(o.status);
        return (
          <div key={o.id} className="farmer-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>{o.listings?.crop} · {o.quantity} {o.listings?.unit}</h3>
              <StatusBadge status={o.status} lang={lang} />
            </div>
            <div className="tracking-steps">
              {STEP_KEYS.map((key, i) => (
                <div key={key} className={`tracking-step ${i <= stepIdx ? 'done' : ''}`}>
                  <div className="tracking-dot" />
                  <span>{t[key]}</span>
                </div>
              ))}
            </div>
            {o.status === 'delivered' && (
              <button
                id={`mark-payment-${o.id}`}
                className="sell-btn"
                style={{ marginTop: '1rem', padding: '0.6rem' }}
                disabled={paying === o.id}
                onClick={() => markPayment(o.id)}
              >
                {paying === o.id ? <Loader2 className="spin" size={16} /> : t.markPayment}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

const TABS = ['create', 'listings', 'offers', 'tracking'];
const TAB_ICONS = [PackagePlus, List, Inbox, Navigation];

export default function FarmerApp() {
  const { user, supabase } = useAuth();
  const { lang } = useLanguage();
  const t = dict[lang];
  const [tab, setTab] = useState('create');
  const [listings, setListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(true);

  const fetchListings = async () => {
    setListingsLoading(true);
    const { data } = await supabase
      .from('listings')
      .select('*')
      .eq('farmer_id', user.id)
      .order('created_at', { ascending: false });
    setListings(data || []);
    setListingsLoading(false);
  };

  useEffect(() => { fetchListings(); }, []);

  const tabLabels = [t.tabCreate, t.tabListings, t.tabOffers, t.tabTracking];

  return (
    <AppShell icon={Leaf} title={t.appTitle}>
      {/* Tab bar */}
      <div className="tab-bar">
        {TABS.map((tabId, i) => {
          const Icon = TAB_ICONS[i];
          return (
            <button
              key={tabId}
              id={`farmer-tab-${tabId}`}
              className={`tab-btn ${tab === tabId ? 'active' : ''}`}
              onClick={() => setTab(tabId)}
            >
              <Icon size={16} />
              <span>{tabLabels[i]}</span>
            </button>
          );
        })}
      </div>

      {tab === 'create' && (
        <CreateListingForm supabase={supabase} user={user} lang={lang} t={t} onSuccess={() => { fetchListings(); setTab('listings'); }} />
      )}
      {tab === 'listings' && (
        <MyListings listings={listings} lang={lang} t={t} loading={listingsLoading} />
      )}
      {tab === 'offers' && (
        <OffersTab supabase={supabase} user={user} lang={lang} t={t} onUpdate={fetchListings} />
      )}
      {tab === 'tracking' && (
        <TrackingTab supabase={supabase} user={user} lang={lang} t={t} />
      )}
    </AppShell>
  );
}
