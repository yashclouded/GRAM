// Status badge colours for listing and order statuses
const STATUS_COLORS = {
  available:            { bg: '#e8f5e9', text: '#2e7d32', label_en: 'Available',            label_hi: 'उपलब्ध' },
  offer_received:       { bg: '#fff3e0', text: '#e65100', label_en: 'Offer Received',        label_hi: 'ऑफर आया' },
  sold:                 { bg: '#e3f2fd', text: '#1565c0', label_en: 'Sold',                  label_hi: 'बिक गई' },
  in_transit:           { bg: '#f3e5f5', text: '#6a1b9a', label_en: 'In Transit',            label_hi: 'रास्ते में' },
  delivered:            { bg: '#e8f5e9', text: '#1b5e20', label_en: 'Delivered',             label_hi: 'डिलीवर हुई' },
  pending:              { bg: '#fff8e1', text: '#f57f17', label_en: 'Pending',               label_hi: 'लंबित' },
  accepted:             { bg: '#e8f5e9', text: '#2e7d32', label_en: 'Accepted',              label_hi: 'स्वीकृत' },
  rejected:             { bg: '#ffebee', text: '#c62828', label_en: 'Rejected',              label_hi: 'अस्वीकृत' },
  transporter_assigned: { bg: '#e3f2fd', text: '#1565c0', label_en: 'Transporter Assigned', label_hi: 'ट्रांसपोर्टर नियुक्त' },
  picked_up:            { bg: '#f3e5f5', text: '#6a1b9a', label_en: 'Picked Up',            label_hi: 'उठाया गया' },
  payment_confirmed:    { bg: '#e8f5e9', text: '#1b5e20', label_en: 'Payment Confirmed',    label_hi: 'भुगतान पुष्टि' },
};

export default function StatusBadge({ status, lang = 'en' }) {
  const cfg = STATUS_COLORS[status] || { bg: '#f5f5f5', text: '#666', label_en: status, label_hi: status };
  return (
    <span style={{
      background: cfg.bg,
      color: cfg.text,
      padding: '0.25rem 0.75rem',
      borderRadius: '20px',
      fontSize: '0.78rem',
      fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {lang === 'hi' ? cfg.label_hi : cfg.label_en}
    </span>
  );
}
