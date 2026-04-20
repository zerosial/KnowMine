export default function StatsPanel({ stats, loading }) {
  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 90 }} />
        ))}
      </div>
    )
  }

  if (!stats) return null

  const items = [
    {
      label: '총 문서',
      value: stats.total_documents,
      icon: '📁',
      color: '#818cf8',
      glow: 'rgba(129,140,248,0.2)',
    },
    {
      label: '총 청크',
      value: stats.total_chunks,
      icon: '🧩',
      color: '#a78bfa',
      glow: 'rgba(167,139,250,0.2)',
    },
    {
      label: '처리 완료',
      value: stats.completed_documents,
      icon: '✅',
      color: '#34d399',
      glow: 'rgba(52,211,153,0.2)',
    },
    {
      label: '처리 실패',
      value: stats.failed_documents,
      icon: '❌',
      color: '#f87171',
      glow: 'rgba(248,113,113,0.2)',
    },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
      {items.map(({ label, value, icon, color, glow }) => (
        <div
          key={label}
          className="glass-card"
          style={{ padding: '18px 16px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}
        >
          {/* 하단 글로우 */}
          <div style={{
            position: 'absolute', bottom: -20, left: '50%', transform: 'translateX(-50%)',
            width: 80, height: 80, borderRadius: '50%',
            background: glow, filter: 'blur(20px)',
            pointerEvents: 'none',
          }} />

          <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
          <p style={{
            fontSize: '1.8rem', fontWeight: 800,
            color, lineHeight: 1,
            fontFamily: 'var(--font-mono)',
            marginBottom: 4,
          }}>
            {value?.toLocaleString() ?? '-'}
          </p>
          <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
            {label}
          </p>
        </div>
      ))}
    </div>
  )
}
