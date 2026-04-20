import { useState } from 'react'
import { searchDocuments } from '../api/client'

export default function SearchPanel() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searched, setSearched] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    try {
      const data = await searchDocuments({ query, topK: 5 })
      setResults(data)
      setSearched(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* 검색 입력 */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="문서 내용을 자연어로 검색하세요... (예: TC 시나리오 목록)"
          style={{
            flex: 1,
            padding: '10px 16px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            color: '#e2e8f0',
            fontSize: '0.875rem',
            fontFamily: 'var(--font-body)',
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.6)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          disabled={loading}
        />
        <button type="submit" className="btn-primary" disabled={loading || !query.trim()}>
          {loading ? <span className="animate-spin-slow">⚙️</span> : '🔍'} 검색
        </button>
      </form>

      {/* 에러 */}
      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: 10, marginBottom: 12,
          background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)',
          color: '#f87171', fontSize: '0.82rem',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* 결과 없음 */}
      {searched && !loading && results.length === 0 && !error && (
        <div style={{
          textAlign: 'center', padding: '30px',
          color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem',
        }}>
          🔍 검색 결과가 없습니다.
        </div>
      )}

      {/* 결과 목록 */}
      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>
            {results.length}개 결과 — 유사도 순
          </p>
          {results.map((r, i) => (
            <div key={r.chunk_id} style={{
              padding: '14px 16px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.07)',
              transition: 'border-color 0.2s',
            }}>
              {/* 헤더 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{
                  width: 20, height: 20,
                  background: 'rgba(99,102,241,0.2)',
                  borderRadius: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 700, color: '#818cf8',
                  flexShrink: 0,
                }}>{i + 1}</span>
                <span style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.filename}
                </span>
                {/* 유사도 스코어 */}
                <span style={{
                  fontSize: '0.7rem', fontWeight: 700,
                  color: r.score > 0.7 ? '#34d399' : r.score > 0.5 ? '#fbbf24' : '#94a3b8',
                  fontFamily: 'var(--font-mono)',
                  background: 'rgba(255,255,255,0.05)',
                  padding: '2px 7px', borderRadius: 6,
                }}>
                  {(r.score * 100).toFixed(1)}%
                </span>
              </div>

              {/* 청크 텍스트 */}
              <p style={{
                fontSize: '0.78rem',
                color: 'rgba(255,255,255,0.6)',
                lineHeight: 1.6,
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                fontFamily: 'var(--font-mono)',
                whiteSpace: 'pre-wrap',
              }}>
                {r.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
