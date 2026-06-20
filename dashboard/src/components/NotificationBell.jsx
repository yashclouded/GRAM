import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationBell() {
  const { supabase, user } = useAuth();
  const { lang } = useLanguage();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    // Real-time subscription
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, payload => {
        setNotifications(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setNotifications(data);
  };

  const markAllRead = async () => {
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unread = notifications.filter(n => !n.read).length;

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        id="notification-bell-btn"
        onClick={() => { setOpen(!open); if (!open && unread > 0) markAllRead(); }}
        style={{ background: 'none', border: 'none', padding: '0.25rem', position: 'relative', cursor: 'pointer' }}
        title={lang === 'hi' ? 'सूचनाएं' : 'Notifications'}
      >
        <Bell size={22} color="#555" />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            background: '#e53935', color: 'white',
            borderRadius: '50%', fontSize: '0.65rem',
            width: '16px', height: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            style={{
              position: 'absolute', right: 0, top: '2.5rem',
              background: 'white', borderRadius: '12px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              minWidth: '300px', maxWidth: '340px',
              zIndex: 100, overflow: 'hidden',
              border: '1px solid #e0e0e0'
            }}
          >
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f0f0f0', fontWeight: 600, color: '#333', fontSize: '0.9rem' }}>
              {lang === 'hi' ? 'सूचनाएं' : 'Notifications'}
            </div>
            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <p style={{ padding: '1.5rem', color: '#888', textAlign: 'center', fontSize: '0.85rem' }}>
                  {lang === 'hi' ? 'कोई सूचना नहीं' : 'No notifications yet'}
                </p>
              ) : notifications.map(n => (
                <div key={n.id} style={{
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid #f5f5f5',
                  background: n.read ? 'white' : '#f1f8e9',
                  fontSize: '0.85rem', lineHeight: 1.4, color: '#333'
                }}>
                  {lang === 'hi' ? n.message_hi : n.message_en}
                  <div style={{ fontSize: '0.72rem', color: '#aaa', marginTop: '0.25rem' }}>
                    {new Date(n.created_at).toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
