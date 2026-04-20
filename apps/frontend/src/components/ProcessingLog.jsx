import { useEffect, useRef } from 'react'

const LOG_ICONS = {
  info:    '💬',
  success: '✅',
  error:   '❌',
  upload:  '📤',
  process: '⚙️',
}

export default function ProcessingLog({ logs }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  if (!logs || logs.length === 0) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: 'rgba(255,255,255,0.2)',
        fontSize: '0.85rem',
      }}>
        처리 로그가 없습니다.
      </div>
    )
  }

  return (
    <div style={{
      maxHeight: 220,
      overflowY: 'auto',
      padding: '4px 0',
    }}>
      {logs.map((log, i) => (
        <div
          key={i}
          className="animate-fade-in"
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '7px 12px',
            borderRadius: 8,
            background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
            transition: 'background 0.2s',
          }}
        >
          <span style={{ fontSize: 14, flexShrink: 0, lineHeight: '20px' }}>
            {LOG_ICONS[log.type] || '•'}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{
              fontSize: '0.78rem',
              color: log.type === 'error' ? '#f87171'
                   : log.type === 'success' ? '#34d399'
                   : 'rgba(255,255,255,0.6)',
              wordBreak: 'break-word',
              lineHeight: 1.5,
            }}>
              {log.message}
            </span>
          </div>
          <span style={{
            fontSize: '0.65rem',
            color: 'rgba(255,255,255,0.2)',
            flexShrink: 0, lineHeight: '20px',
            fontFamily: 'var(--font-mono)',
          }}>
            {log.time}
          </span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
