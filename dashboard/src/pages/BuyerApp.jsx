import React, { useMemo, useState, useEffect } from 'react';
import { Store, Loader2, Search, Package, ShoppingBag, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMesh } from '../contexts/MeshContext';
import { useLanguage } from '../contexts/LanguageContext';
import AppShell from '../components/AppShell';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';

const dict = {
  en: {
    appTitle: 'GRAM Buyer',
    tabBrowse: 'Browse',
    tabOrders: 'My Orders',
    searchPlaceholder: 'Search crop...',
    filterGrade: 'Grade',
    filterAll: 'All',
    filterMaxPrice: 'Max Price',
    noListings: 'No listings available.',
    noListingsSub: 'Check back soon — farmers are listing crops.',
    noOrders: 'No orders yet.',
    noOrdersSub: 'Browse listings and place your first order.',
    grade: 'Grade',
    qty: 'Qty',
    placeOrder: 'Place Order',
    placing: 'Placing...',
    confirmDelivery: 'Confirm Delivery',
    confirming: 'Confirming...',
    orderQty: 'Order Quantity',
    maxQty: 'Max',
    cancel: 'Cancel',
    confirm: 'Confirm Order',
    orderSuccess: 'Order placed!',
    orderSavedLocal: 'Order saved on this device. It will sync when the bridge is available.',
    errQty: 'Please enter a valid quantity.',
    errMaxQty: 'Quantity cannot exceed available stock.',
    farmer: 'Farmer',
    transporter: 'Transporter',
    notAssigned: 'Not yet assigned',
    bidPrice: 'Your Bid Price (₹)',
    updateBid: 'Update Bid',
    acceptOffer: 'Accept Offer',
    stepAccepted: 'Order Accepted',
    stepTransporter: 'Transporter Assigned',
    stepPickedUp: 'Picked Up',
    stepInTransit: 'In Transit',
    stepDelivered: 'Delivered',
    stepPayment: 'Payment Confirmed',
  },
  hi: {
    appTitle: 'ग्राम खरीदार',
    tabBrowse: 'देखें',
    tabOrders: 'मेरे ऑर्डर',
    searchPlaceholder: 'फसल खोजें...',
    filterGrade: 'श्रेणी',
    filterAll: 'सभी',
    filterMaxPrice: 'अधिकतम मूल्य',
    noListings: 'कोई लिस्टिंग उपलब्ध नहीं।',
    noListingsSub: 'जल्द देखें — किसान फसल सूचीबद्ध कर रहे हैं।',
    noOrders: 'अभी तक कोई ऑर्डर नहीं।',
    noOrdersSub: 'लिस्टिंग देखें और अपना पहला ऑर्डर दें।',
    grade: 'श्रेणी',
    qty: 'मात्रा',
    placeOrder: 'ऑर्डर दें',
    placing: 'ऑर्डर हो रहा है...',
    confirmDelivery: 'डिलीवरी पुष्टि करें',
    confirming: 'पुष्टि हो रही है...',
    orderQty: 'ऑर्डर मात्रा',
    maxQty: 'अधिकतम',
    cancel: 'रद्द करें',
    confirm: 'ऑर्डर पुष्टि करें',
    orderSuccess: 'ऑर्डर दिया गया!',
    orderSavedLocal: 'ऑर्डर इस डिवाइस पर सहेजा गया है। ब्रिज उपलब्ध होने पर यह सिंक हो जाएगा।',
    errQty: 'एक वैध मात्रा दर्ज करें।',
    errMaxQty: 'मात्रा उपलब्ध स्टॉक से अधिक नहीं हो सकती।',
    farmer: 'किसान',
    transporter: 'ट्रांसपोर्टर',
    notAssigned: 'अभी नियुक्त नहीं',
    bidPrice: 'आपकी बोली (₹)',
    updateBid: 'बोली अपडेट करें',
    acceptOffer: 'ऑफर स्वीकार करें',
    stepAccepted: 'ऑर्डर स्वीकृत',
    stepTransporter: 'ट्रांसपोर्टर नियुक्त',
    stepPickedUp: 'उठाया गया',
    stepInTransit: 'रास्ते में',
    stepDelivered: 'डिलीवर हुआ',
    stepPayment: 'भुगतान पुष्टि',
  }
};

const TRACKING_STEPS = ['accepted', 'transporter_assigned', 'picked_up', 'in_transit', 'delivered', 'payment_confirmed'];
const STEP_KEYS = ['stepAccepted', 'stepTransporter', 'stepPickedUp', 'stepInTransit', 'stepDelivered', 'stepPayment'];

function mergeBrowseListings(remoteListings, meshListings) {
  const merged = new Map()

  remoteListings.forEach((listing) => {
    merged.set(String(listing.id), {
      ...listing,
      sync_state: 'synced',
    })
  })

  meshListings.forEach((listing) => {
    if (listing.server_id && merged.has(String(listing.server_id))) {
      const existing = merged.get(String(listing.server_id))
      merged.set(String(listing.server_id), {
        ...existing,
        sync_state: listing.sync_state || existing.sync_state || 'synced',
      })
      return
    }

    const key = String(listing.local_id || listing.id || listing.server_id)
    merged.set(key, {
      id: listing.local_id || listing.id || key,
      crop: listing.crop,
      quantity: listing.quantity,
      unit: listing.unit,
      grade: listing.grade,
      price_per_unit: listing.price_per_unit,
      location: listing.location,
      status: listing.status || 'available',
      sync_state: listing.sync_state || 'pending',
      local_only: true,
      created_at: listing.created_at,
    })
  })

  return [...merged.values()]
    .filter((listing) => ['available', 'listed'].includes(listing.status))
    .sort((left, right) => (right.created_at || '').localeCompare(left.created_at || ''))
}

function mergeBuyerOrders(remoteOrders, meshOrders) {
  const merged = new Map()

  remoteOrders.forEach((order) => {
    merged.set(String(order.id), {
      ...order,
      sync_state: 'synced',
    })
  })

  meshOrders.forEach((order) => {
    if (order.server_id && merged.has(String(order.server_id))) {
      merged.set(String(order.server_id), {
        ...merged.get(String(order.server_id)),
        sync_state: order.sync_state || 'synced',
        status: order.status || merged.get(String(order.server_id)).status,
      })
      return
    }

    const key = String(order.local_id || order.id || order.server_id)
    merged.set(key, {
      id: order.local_id || order.id || key,
      listing_id: order.listing_id || null,
      quantity: order.quantity,
      agreed_price: order.agreed_price,
      status: order.status || 'pending',
      sync_state: order.sync_state || 'pending',
      local_only: true,
      created_at: order.created_at,
      listings: {
        crop: order.crop,
        unit: order.unit || 'Unit',
        location: order.location,
      },
    })
  })

  return [...merged.values()].sort((left, right) => (right.created_at || '').localeCompare(left.created_at || ''))
}

// ─── Order Modal ───────────────────────────────────────────────────────────────
function OrderModal({ listing, onClose, onPlace, lang, t }) {
  const [qty, setQty] = useState('');
  const [bid, setBid] = useState(String(listing.price_per_unit));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!qty || isNaN(qty) || +qty <= 0) { setError(t.errQty); return; }
    if (+qty > listing.quantity) { setError(t.errMaxQty); return; }
    if (!bid || isNaN(bid) || +bid <= 0) { setError('Please enter a valid bid price.'); return; }
    if (!window.confirm(lang === 'hi' ? 'क्या आप इस ऑर्डर को कन्फर्म करना चाहते हैं?' : 'Are you sure you want to place this order?')) return;
    setLoading(true);
    await onPlace(listing, +qty, +bid);
    setLoading(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>{listing.crop} — {lang === 'en' ? 'Grade' : 'श्रेणी'} {listing.grade}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}><X size={20} /></button>
        </div>
        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
          ₹{listing.price_per_unit}/{listing.unit} · {listing.location}
        </p>
        {error && <div className="auth-error">{error}</div>}
        <div className="input-group">
          <label>{t.orderQty} ({t.maxQty}: {listing.quantity} {listing.unit})</label>
          <input
            id="buyer-order-qty"
            type="number" min="0.1" step="0.1" max={listing.quantity}
            value={qty} onChange={e => { setQty(e.target.value); setError(''); }}
            placeholder={String(listing.quantity)}
          />
        </div>
        <div className="input-group">
          <label>{t.bidPrice} (Listed at ₹{listing.price_per_unit})</label>
          <input
            type="number" min="1"
            value={bid} onChange={e => { setBid(e.target.value); setError(''); }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button className="sell-btn" style={{ flex: 1, background: '#aaa' }} onClick={onClose}>{t.cancel}</button>
          <button id="buyer-confirm-order" className="sell-btn" style={{ flex: 2 }} onClick={submit} disabled={loading}>
            {loading ? <Loader2 className="spin" size={16} /> : t.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Browse Tab ─────────────────────────────────────────────────────────────────
function BrowseTab({ supabase, user, lang, t, mesh }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedListing, setSelectedListing] = useState(null);
  const [toast, setToast] = useState('');
  const mergedListings = useMemo(() => mergeBrowseListings(listings, mesh?.activeListings || []), [listings, mesh?.activeListings]);

  useEffect(() => {
    fetchListings();
    const ch = supabase.channel('listings-browse')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, () => fetchListings())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const fetchListings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('listings')
      .select('*')
      .eq('status', 'available')
      .order('created_at', { ascending: false });
    setListings(data || []);
    setLoading(false);
  };

  const placeOrder = async (listing, qty, bidPrice) => {
    const clientId = crypto.randomUUID();
    await mesh?.recordDemandCreated({
      client_id: clientId,
      listing_id: listing.server_id || listing.id,
      crop: listing.crop,
      quantity: qty,
      unit: listing.unit,
      bid_price: bidPrice,
      location: listing.location,
      buyer_id: user.id,
      farmer_id: listing.farmer_id || null,
      status: 'pending',
      sync_state: 'pending',
    });

    const { data: order, error } = await supabase.from('orders').insert({
      listing_id: listing.id,
      buyer_id: user.id,
      farmer_id: listing.farmer_id,
      quantity: qty,
      agreed_price: bidPrice,
    }).select('*').single();
    if (error) {
      setToast(t.orderSavedLocal);
      setTimeout(() => setToast(''), 2500);
      return;
    }
    if (order) {
      await mesh?.recordDemandSynced(clientId, order);
    }
    setToast(t.orderSuccess);
    setTimeout(() => setToast(''), 2500);
  };

  const visible = mergedListings.filter(l => {
    if (search && !l.crop.toLowerCase().includes(search.toLowerCase())) return false;
    if (gradeFilter && l.grade !== gradeFilter) return false;
    if (maxPrice && l.price_per_unit > +maxPrice) return false;
    return true;
  });

  return (
    <>
      {toast && <div className="auth-success" style={{ marginBottom: '1rem' }}>{toast}</div>}
      {/* Filters */}
      <div className="filter-bar">
        <div className="input-icon-wrap" style={{ flex: 2 }}>
          <Search size={16} className="input-icon" />
          <input
            id="buyer-search"
            type="text" value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
          />
        </div>
        <select id="buyer-grade-filter" value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} style={{ flex: 1 }}>
          <option value="">{t.filterAll}</option>
          {['A', 'B', 'C'].map(g => <option key={g} value={g}>{t.filterGrade} {g}</option>)}
        </select>
        <input
          id="buyer-price-filter"
          type="number" value={maxPrice}
          onChange={e => setMaxPrice(e.target.value)}
          placeholder={`${t.filterMaxPrice} ₹`}
          style={{ flex: 1 }}
        />
      </div>

      {loading
        ? <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 className="spin" size={28} color="#2e7d32" /></div>
        : !visible.length
          ? <EmptyState icon={ShoppingBag} title={t.noListings} subtitle={t.noListingsSub} />
          : (
            <div className="listings-grid">
              {visible.map(l => (
                <div key={l.id} className="farmer-card listing-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ margin: 0 }}>{l.crop}</h3>
                      <p style={{ color: '#666', fontSize: '0.82rem', margin: '0.25rem 0 0' }}>
                        {l.location}
                      </p>
                    </div>
                    <span className="grade-badge">{l.grade}</span>
                  </div>
                  <p style={{ color: '#555', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    {t.qty}: {l.quantity} {l.unit}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                    <span className="price-text" style={{ fontSize: '1.15rem' }}>₹{l.price_per_unit}<span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#888' }}>/{l.unit}</span></span>
                    <button
                      id={`buy-btn-${l.id}`}
                      className="sell-btn"
                      style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}
                      onClick={() => setSelectedListing(l)}
                    >
                      {t.placeOrder}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
      }

      {selectedListing && (
        <OrderModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          onPlace={placeOrder}
          lang={lang}
          t={t}
        />
      )}
    </>
  );
}

// ─── My Orders Tab ─────────────────────────────────────────────────────────────
function MyOrdersTab({ supabase, user, lang, t, mesh }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(null);
  const [editPrice, setEditPrice] = useState({});
  const mergedOrders = useMemo(() => mergeBuyerOrders(orders, mesh?.myDemands || []), [mesh?.myDemands, orders]);

  useEffect(() => {
    fetchOrders();
    const ch = supabase.channel('buyer-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `buyer_id=eq.${user.id}` },
        () => fetchOrders(true))
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const fetchOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, listings(crop, unit, price_per_unit, location)')
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false });
    setOrders(data || []);
    if (!silent) setLoading(false);
  };

  const confirmDelivery = async (orderId) => {
    setConfirming(orderId);
    await supabase.from('orders').update({ status: 'delivered' }).eq('id', orderId);
    const order = mergedOrders.find((item) => String(item.id) === String(orderId));
    if (order) {
      await mesh?.recordDeliveryStatusChanged({
        id: order.id,
        listing_id: order.listing_id,
        crop: order.listings?.crop,
        location: order.listings?.location,
        status: 'delivered',
      });
    }
    setConfirming(null);
    fetchOrders();
  };

  const updateBid = async (orderId, newPrice) => {
    if (!newPrice) return;
    await supabase.from('orders').update({ agreed_price: newPrice }).eq('id', orderId);
    const order = mergedOrders.find((item) => String(item.id) === String(orderId));
    if (order) {
      await mesh?.publishEvent('offer.updated', {
        id: orderId,
        listing_id: order.listing_id,
        crop: order.listings?.crop,
        location: order.listings?.location,
        agreed_price: Number(newPrice),
      });
    }
    fetchOrders();
  };

  const acceptOffer = async (orderId) => {
    await supabase.from('orders').update({ status: 'accepted' }).eq('id', orderId);
    const order = mergedOrders.find((item) => String(item.id) === String(orderId));
    if (order) {
      await mesh?.publishEvent('trade.accepted', {
        id: order.id,
        listing_id: order.listing_id,
        crop: order.listings?.crop,
        location: order.listings?.location,
        quantity: order.quantity,
        agreed_price: order.agreed_price,
      });
    }
    fetchOrders();
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 className="spin" size={28} color="#2e7d32" /></div>;
  if (!mergedOrders.length) return <EmptyState icon={Package} title={t.noOrders} subtitle={t.noOrdersSub} />;

  return (
    <div className="listings-grid">
      {mergedOrders.map(o => (
        <div key={o.id} className="farmer-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ margin: 0 }}>{o.listings?.crop}</h3>
              <p style={{ color: '#666', fontSize: '0.83rem', marginTop: '0.25rem' }}>
                {o.quantity} {o.listings?.unit} · ₹{o.agreed_price}/{o.listings?.unit}
              </p>
            </div>
            <StatusBadge status={o.status} lang={lang} />
          </div>
          <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.5rem' }}>
            {t.farmer}: {o.profiles?.name || '—'}
          </p>
          {o.sync_state && o.sync_state !== 'synced' && (
            <p style={{ fontSize: '0.78rem', color: '#d97706', marginTop: '0.45rem', fontWeight: 700 }}>
              {t.orderSavedLocal}
            </p>
          )}

          {!['pending', 'rejected'].includes(o.status) && (
            <div className="tracking-steps" style={{ marginTop: '1.25rem' }}>
              {STEP_KEYS.map((key, i) => {
                const stepIdx = TRACKING_STEPS.indexOf(o.status);
                return (
                  <div key={key} className={`tracking-step ${i <= stepIdx ? 'done' : ''}`}>
                    <div className="tracking-dot" />
                    <span>{t[key]}</span>
                  </div>
                );
              })}
            </div>
          )}

          {o.status === 'pending' && (
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input 
                type="number" 
                defaultValue={o.agreed_price} 
                onChange={e => setEditPrice({...editPrice, [o.id]: e.target.value})} 
                style={{ width: '80px', padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px' }} 
                disabled={o.local_only}
              />
              <button 
                onClick={() => updateBid(o.id, editPrice[o.id] || o.agreed_price)} 
                className="secondary-btn" 
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                disabled={o.local_only}
              >
                {t.updateBid}
              </button>
              <button 
                onClick={() => acceptOffer(o.id)} 
                className="sell-btn" 
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                disabled={o.local_only}
              >
                {t.acceptOffer}
              </button>
            </div>
          )}

          {o.status === 'in_transit' && (
            <button
              id={`confirm-delivery-${o.id}`}
              className="sell-btn"
              style={{ marginTop: '1rem', padding: '0.55rem' }}
              disabled={confirming === o.id}
              onClick={() => confirmDelivery(o.id)}
            >
              {confirming === o.id ? <Loader2 className="spin" size={16} /> : t.confirmDelivery}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function BuyerApp() {
  const { user, supabase } = useAuth();
  const mesh = useMesh();
  const { lang } = useLanguage();
  const t = dict[lang];
  const [tab, setTab] = useState('browse');

  return (
    <AppShell icon={Store} title={t.appTitle}>
      <div className="tab-bar">
        {[['browse', ShoppingBag, t.tabBrowse], ['orders', Package, t.tabOrders]].map(([id, Icon, label]) => (
          <button key={id} id={`buyer-tab-${id}`} className={`tab-btn ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
            <Icon size={16} /><span>{label}</span>
          </button>
        ))}
      </div>
      {tab === 'browse' && <BrowseTab supabase={supabase} user={user} lang={lang} t={t} mesh={mesh} />}
      {tab === 'orders' && <MyOrdersTab supabase={supabase} user={user} lang={lang} t={t} mesh={mesh} />}
    </AppShell>
  );
}
