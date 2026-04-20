import { useState } from 'react'
import { deleteDocument } from '../api/client'

const FILE_TYPE_CONFIG = {
  excel:   { icon: '📊', label: 'Excel',       color: '#34d399', bg: 'rgba(52,211,153,0.08)'  },
  ppt:     { icon: '📑', label: 'PowerPoint',  color: '#f97316', bg: 'rgba(249,115,22,0.08)'  },
  pdf:     { icon: '📄', label: 'PDF',         color: '#f87171', bg: 'rgba(248,113,113,0.08)' },
  unknown: { icon: '📁', label: '기타',         color: '#94a3b8', bg: 'rgba(148,163,184,0.08)' },
}

const STATUS_CONFIG = {
  pending:    { label: '대기중',   cls: 'badge-pending'    },
  processing: { label: '처리중',   cls: 'badge-processing' },
  completed:  { label: '완료',     cls: 'badge-completed'  },
  failed:     { label: '실패',     cls: 'badge-failed'     },
}

function formatBytes(bytes) {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(isoStr) {
  if (!isoStr) return '-'
  return new Date(isoStr).toLocaleString('ko-KR', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function DocumentCard({ doc, onDeleted, style }) {
  const [deleting, setDeleting] = useState(false)
  const ft = FILE_TYPE_CONFIG[doc.file_type] || FILE_TYPE_CONFIG.unknown
  const st = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending

  const handleDelete = async (e) => {
    e.stopPropagation()
    if (!confirm(`"${doc.filename}"을 삭제하시겠습니까?`)) return
    setDeleting(true)
    try {
      await deleteDocument(doc.doc_id)
      onDeleted?.(doc.doc_id)
    } catch (err) {
      alert(`삭제 실패: ${err.message}`)
      setDeleting(false)
    }
  }

  return (
    <div className="glass-card animate-fade-in-up" style={{
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
      ...style,
    }}>
      {/* 파일 타입 컬러 강조선 */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 3,
        background: `linear-gradient(90deg, ${ft.color}80, ${ft.color}20)`,
        borderRadius: '16px 16px 0 0',
      }} />

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        {/* 파일 아이콘 */}
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: ft.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, flexShrink: 0,
          border: `1px solid ${ft.color}25`,
        }}>
          {ft.icon}
        </div>

        {/* 파일명 & 상태 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontWeight: 700, fontSize: '0.9rem',
            color: '#f1f5f9',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            marginBottom: 5,
          }} title={doc.filename}>
            {doc.filename}
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className={`badge ${st.cls}`}>
              {doc.status === 'processing' && <span className="dot" />}
              {st.label}
            </span>
            <span style={{
              fontSize: '0.7rem', color: ft.color, fontWeight: 600,
              background: ft.bg, padding: '2px 8px', borderRadius: 999,
              border: `1px solid ${ft.color}25`,
            }}>
              {ft.label}
            </span>
          </div>
        </div>

        {/* 삭제 버튼 */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          title="삭제"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.25)', fontSize: 16,
            padding: '4px', borderRadius: 6, flexShrink: 0,
            transition: 'color 0.2s, background 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.1)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.25)'; e.currentTarget.style.background = 'none' }}
        >
          {deleting ? '⏳' : '🗑'}
        </button>
      </div>

      {/* 통계 그리드 */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 8, marginBottom: doc.error_message ? 12 : 0,
      }}>
        {[
          { label: '청크 수', value: doc.total_chunks ? `${doc.total_chunks}개` : '-' },
          { label: '파일 크기', value: formatBytes(doc.file_size) },
          { label: '업로드',   value: formatDate(doc.uploaded_at) },
          { label: '완료',     value: formatDate(doc.processed_at) },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 8, padding: '8px 10px',
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginBottom: 2, fontWeight: 500 }}>
              {label}
            </p>
            <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1', fontFamily: 'var(--font-mono)' }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* 에러 메시지 */}
      {doc.error_message && (
        <div style={{
          marginTop: 0,
          padding: '8px 10px',
          background: 'rgba(248,113,113,0.08)',
          borderRadius: 8,
          border: '1px solid rgba(248,113,113,0.2)',
        }}>
          <p style={{ fontSize: '0.72rem', color: '#f87171', lineHeight: 1.5 }}>
            ⚠️ {doc.error_message}
          </p>
        </div>
      )}

      {/* 처리 중 진행바 animation */}
      {doc.status === 'processing' && (
        <div style={{ marginTop: 12 }}>
          <div style={{
            height: 3, borderRadius: 999,
            background: 'rgba(99,102,241,0.15)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', width: '40%',
              background: 'linear-gradient(90deg, #6366f1, #a78bfa)',
              borderRadius: 999,
              animation: 'shimmer 1.8s ease-in-out infinite',
              backgroundSize: '200% 100%',
            }} />
          </div>
        </div>
      )}
    </div>
  )
}
