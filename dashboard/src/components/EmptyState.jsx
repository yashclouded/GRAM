export default function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '3rem 1rem',
      color: '#888',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.75rem'
    }}>
      {Icon && <Icon size={40} strokeWidth={1.2} color="#bbb" />}
      <p style={{ fontWeight: 600, color: '#555', margin: 0 }}>{title}</p>
      {subtitle && <p style={{ fontSize: '0.85rem', margin: 0 }}>{subtitle}</p>}
    </div>
  );
}
