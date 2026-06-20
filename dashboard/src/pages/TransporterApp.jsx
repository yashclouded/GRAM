import React, { useState, useEffect } from 'react';
import { Truck, Loader2, Briefcase, Clock, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import AppShell from '../components/AppShell';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';

const dict = {
  en: {
    appTitle: 'GRAM Logistics',
    tabVehicle: 'My Vehicle',
    tabJobs: 'Available Jobs',
    tabMyJobs: 'My Jobs',
    tabHistory: 'History',
    vehicleType: 'Vehicle Type',
    capacity: 'Capacity (Quintal)',
    serviceArea: 'Service Area / Route',
    save: 'Save Info',
    saving: 'Saving...',
    saved: 'Saved!',
    errVehicle: 'Please enter vehicle type.',
    errCap: 'Enter a valid capacity.',
    errArea: 'Please enter your service area.',
    noJobs: 'No available jobs.',
    noJobsSub: 'Jobs appear when farmers and buyers match on a trade.',
    noMyJobs: 'No active jobs.',
    noMyJobsSub: 'Accept a job from Available Jobs tab.',
    noHistory: 'No completed jobs yet.',
    noHistorySub: 'Completed deliveries will appear here.',
    acceptJob: 'Accept Job',
    accepting: 'Accepting...',
    markPickedUp: 'Mark Picked Up',
    markInTransit: 'Mark In Transit',
    markDelivered: 'Mark Delivered',
    crop: 'Crop',
    from: 'From',
    to: 'To (Buyer)',
    qty: 'Qty',
    price: 'Price',
    vehicleTypes: ['Mini Truck', 'Large Truck', 'Pickup Van', 'Tractor-Trolley', 'Two-Wheeler'],
  },
  hi: {
    appTitle: 'ग्राम लॉजिस्टिक्स',
    tabVehicle: 'मेरा वाहन',
    tabJobs: 'उपलब्ध काम',
    tabMyJobs: 'मेरे काम',
    tabHistory: 'इतिहास',
    vehicleType: 'वाहन प्रकार',
    capacity: 'क्षमता (क्विंटल)',
    serviceArea: 'सेवा क्षेत्र / मार्ग',
    save: 'जानकारी सहेजें',
    saving: 'सहेजा जा रहा है...',
    saved: 'सहेज लिया!',
    errVehicle: 'कृपया वाहन प्रकार दर्ज करें।',
    errCap: 'एक वैध क्षमता दर्ज करें।',
    errArea: 'कृपया अपना सेवा क्षेत्र दर्ज करें।',
    noJobs: 'कोई उपलब्ध काम नहीं।',
    noJobsSub: 'जब किसान और खरीदार के बीच सौदा होगा, काम यहाँ दिखेगा।',
    noMyJobs: 'कोई सक्रिय काम नहीं।',
    noMyJobsSub: '"उपलब्ध काम" टैब से काम स्वीकार करें।',
    noHistory: 'अभी तक कोई पूर्ण काम नहीं।',
    noHistorySub: 'पूर्ण डिलीवरी यहाँ दिखेंगी।',
    acceptJob: 'काम स्वीकार करें',
    accepting: 'स्वीकार हो रहा है...',
    markPickedUp: 'उठाया गया चिह्नित करें',
    markInTransit: 'रास्ते में चिह्नित करें',
    markDelivered: 'डिलीवर हो गया चिह्नित करें',
    crop: 'फसल',
    from: 'से',
    to: 'को',
    qty: 'मात्रा',
    price: 'कीमत',
    vehicleTypes: ['मिनी ट्रक', 'बड़ा ट्रक', 'पिकअप वैन', 'ट्रैक्टर-ट्रॉली', 'दो-पहिया'],
  }
};

// ─── Vehicle Info Tab ─────────────────────────────────────────────────────────
function VehicleInfoTab({ supabase, user, lang, t }) {
  const [form, setForm] = useState({ vehicle_type: '', capacity: '', service_area: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    supabase.from('transporter_profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) setForm({ vehicle_type: data.vehicle_type || '', capacity: data.capacity || '', service_area: data.service_area || '' });
        setLoading(false);
      });
  }, []);

  const validate = () => {
    if (!form.vehicle_type.trim()) return t.errVehicle;
    if (!form.capacity || isNaN(form.capacity) || +form.capacity <= 0) return t.errCap;
    if (!form.service_area.trim()) return t.errArea;
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true); setError(''); setSuccess('');
    const { error: dbErr } = await supabase.from('transporter_profiles').upsert({
      id: user.id,
      vehicle_type: form.vehicle_type.trim(),
      capacity: +form.capacity,
      service_area: form.service_area.trim(),
      updated_at: new Date().toISOString()
    });
    setSaving(false);
    if (dbErr) { setError(dbErr.message); return; }
    setSuccess(t.saved);
    setTimeout(() => setSuccess(''), 2000);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 className="spin" size={28} color="#1976d2" /></div>;

  const vtypes = ['Mini Truck', 'Large Truck', 'Pickup Van', 'Tractor-Trolley', 'Two-Wheeler'];
  const vtypeDisplay = lang === 'hi' ? t.vehicleTypes : vtypes;

  return (
    <div className="listing-form">
      {error && <div className="auth-error">{error}</div>}
      {success && <div className="auth-success">{success}</div>}
      <div className="input-group">
        <label>{t.vehicleType}</label>
        <select id="transporter-vehicle-type" value={form.vehicle_type} onChange={e => set('vehicle_type', e.target.value)}>
          <option value="">{lang === 'en' ? '— Select —' : '— चुनें —'}</option>
          {vtypes.map((v, i) => <option key={v} value={v}>{vtypeDisplay[i]}</option>)}
        </select>
      </div>
      <div className="input-group">
        <label>{t.capacity}</label>
        <input id="transporter-capacity" type="number" min="1" value={form.capacity} onChange={e => set('capacity', e.target.value)} placeholder="50" />
      </div>
      <div className="input-group">
        <label>{t.serviceArea}</label>
        <input id="transporter-area" type="text" value={form.service_area} onChange={e => set('service_area', e.target.value)} placeholder={lang === 'en' ? 'e.g. Pune to Mumbai' : 'जैसे पुणे से मुंबई'} />
      </div>
      <button id="transporter-save-vehicle" className="sell-btn" style={{ background: '#1976d2' }} onClick={save} disabled={saving}>
        {saving ? <><Loader2 className="spin" size={16} /> {t.saving}</> : t.save}
      </button>
    </div>
  );
}

// ─── Available Jobs Tab ─────────────────────────────────────────────────────────
function AvailableJobsTab({ supabase, user, lang, t }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);

  useEffect(() => {
    fetchJobs();
    const ch = supabase.channel('avail-jobs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchJobs())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, listings(crop, quantity, unit, price_per_unit, location)')
      .eq('status', 'accepted')
      .is('transporter_id', null)
      .order('created_at', { ascending: false });
    setJobs(data || []);
    setLoading(false);
  };

  const acceptJob = async (job) => {
    if (!window.confirm(lang === 'hi' ? 'क्या आप इस काम को स्वीकार करना चाहते हैं?' : 'Are you sure you want to accept this job?')) return;
    setAccepting(job.id);
    await supabase.from('orders').update({
      transporter_id: user.id,
      status: 'transporter_assigned'
    }).eq('id', job.id);
    setAccepting(null);
    fetchJobs();
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 className="spin" size={28} color="#1976d2" /></div>;
  if (!jobs.length) return <EmptyState icon={Briefcase} title={t.noJobs} subtitle={t.noJobsSub} />;

  return (
    <div className="listings-grid">
      {jobs.map(j => (
        <div key={j.id} className="farmer-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>{j.listings?.crop}</h3>
            <span className="grade-badge" style={{ background: '#e3f2fd', color: '#1565c0' }}>₹{j.agreed_price}</span>
          </div>
          <p style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            {t.qty}: {j.quantity} {j.listings?.unit} · {t.from}: {j.listings?.location}
          </p>
          <button
            id={`accept-job-${j.id}`}
            className="sell-btn"
            style={{ marginTop: '1rem', background: '#1976d2', padding: '0.6rem' }}
            disabled={accepting === j.id}
            onClick={() => acceptJob(j)}
          >
            {accepting === j.id ? <Loader2 className="spin" size={16} /> : t.acceptJob}
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── My Jobs Tab ──────────────────────────────────────────────────────────────
function MyJobsTab({ supabase, user, lang, t, historyOnly }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    fetchJobs();
    const ch = supabase.channel('my-jobs')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `transporter_id=eq.${user.id}` },
        () => fetchJobs())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [historyOnly]);

  const fetchJobs = async () => {
    setLoading(true);
    let query = supabase
      .from('orders')
      .select('*, listings(crop, quantity, unit, location)')
      .eq('transporter_id', user.id)
      .order('updated_at', { ascending: false });

    if (historyOnly) {
      query = query.in('status', ['delivered', 'payment_confirmed']);
    } else {
      query = query.in('status', ['transporter_assigned', 'picked_up', 'in_transit']);
    }

    const { data } = await query;
    setJobs(data || []);
    setLoading(false);
  };

  const advance = async (jobId, nextStatus) => {
    setUpdating(jobId);
    await supabase.from('orders').update({ status: nextStatus }).eq('id', jobId);
    setUpdating(null);
    fetchJobs();
  };

  const NEXT_STATUS = {
    transporter_assigned: 'picked_up',
    picked_up: 'in_transit',
    in_transit: 'delivered',
  };
  const NEXT_LABEL = {
    transporter_assigned: t.markPickedUp,
    picked_up: t.markInTransit,
    in_transit: t.markDelivered,
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 className="spin" size={28} color="#1976d2" /></div>;
  if (!jobs.length) return <EmptyState icon={historyOnly ? Clock : Truck} title={historyOnly ? t.noHistory : t.noMyJobs} subtitle={historyOnly ? t.noHistorySub : t.noMyJobsSub} />;

  return (
    <div className="listings-grid">
      {jobs.map(j => (
        <div key={j.id} className="farmer-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>{j.listings?.crop}</h3>
            <StatusBadge status={j.status} lang={lang} />
          </div>
          <p style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            {j.quantity} {j.listings?.unit} · {j.listings?.location}
          </p>
          {!historyOnly && NEXT_STATUS[j.status] && (
            <button
              id={`advance-job-${j.id}`}
              className="sell-btn"
              style={{ marginTop: '1rem', background: '#1976d2', padding: '0.6rem' }}
              disabled={updating === j.id}
              onClick={() => advance(j.id, NEXT_STATUS[j.status])}
            >
              {updating === j.id ? <Loader2 className="spin" size={16} /> : NEXT_LABEL[j.status]}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const TABS = ['vehicle', 'jobs', 'myjobs', 'history'];
const TAB_ICONS = [User, Briefcase, Truck, Clock];

export default function TransporterApp() {
  const { user, supabase } = useAuth();
  const { lang } = useLanguage();
  const t = dict[lang];
  const [tab, setTab] = useState('jobs');
  const tabLabels = [t.tabVehicle, t.tabJobs, t.tabMyJobs, t.tabHistory];

  return (
    <AppShell icon={Truck} title={t.appTitle}>
      <div className="tab-bar">
        {TABS.map((id, i) => {
          const Icon = TAB_ICONS[i];
          return (
            <button key={id} id={`transporter-tab-${id}`} className={`tab-btn ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
              <Icon size={15} /><span>{tabLabels[i]}</span>
            </button>
          );
        })}
      </div>
      {tab === 'vehicle' && <VehicleInfoTab supabase={supabase} user={user} lang={lang} t={t} />}
      {tab === 'jobs' && <AvailableJobsTab supabase={supabase} user={user} lang={lang} t={t} />}
      {tab === 'myjobs' && <MyJobsTab supabase={supabase} user={user} lang={lang} t={t} historyOnly={false} />}
      {tab === 'history' && <MyJobsTab supabase={supabase} user={user} lang={lang} t={t} historyOnly={true} />}
    </AppShell>
  );
}
