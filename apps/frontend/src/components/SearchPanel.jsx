import { useState } from 'react'
import { searchDocuments } from '../api/client'

// ─────────────────────────────────────────────
// 청크 텍스트에서 마크다운 헤더(##, ###)를 파싱해
// 위치 정보와 본문을 분리합니다
// ─────────────────────────────────────────────
function parseChunkText(rawText) {
  const lines = rawText.split('\n')
  const locationParts = []
  const bodyLines = []

  for (const line of lines) {
    const trimmed = line.trim()
    // 마크다운 헤더는 위치 정보로 분류
    if (/^#{1,4}\s/.test(trimmed)) {
      const label = trimmed.replace(/^#{1,4}\s+/, '')
      if (label) locationParts.push(label)
    } else if (trimmed) {
      bodyLines.push(trimmed)
    }
  }

  return {
    location: locationParts.join(' › '),
    body: bodyLines.join('\n'),
  }
}

// 유사도 점수 → 색상 + 텍스트
function scoreInfo(score) {
  if (score >= 0.65) return { color: '#34d399', label: '높음', bg: 'rgba(52,211,153,0.1)' }
  if (score >= 0.45) return { color: '#fbbf24', label: '보통', bg: 'rgba(251,191,36,0.1)' }
  return { color: '#94a3b8', label: '낮음', bg: 'rgba(148,163,184,0.08)' }
}

function ResultCard({ result, index, expanded, onToggle }) {
  const { location, body } = parseChunkText(result.text)
  const si = scoreInfo(result.score)
  const bodyPreview = body.length > 300 ? body.slice(0, 300) + '…' : body

  return (
    <div style={{
      borderRadius: 12,
      border: `1px solid rgba(255,255,255,${expanded ? '0.12' : '0.06'})`,
      background: expanded ? 'rgba(99,102,241,0.04)' : 'rgba(255,255,255,0.02)',
      transition: 'all 0.2s',
      overflow: 'hidden',
    }}>
      {/* ── 카드 헤더 ── */}
      <div
        onClick={onToggle}
        style={{
          padding: '12px 16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          userSelect: 'none',
        }}
      >
        {/* 순위 */}
        <span style={{
          minWidth: 22, height: 22,
          background: 'rgba(99,102,241,0.2)',
          borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.7rem', fontWeight: 700, color: '#818cf8',
          flexShrink: 0, marginTop: 1,
        }}>{index + 1}</span>

        {/* 파일명 + 위치 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: '0.78rem', fontWeight: 600, color: '#c4b5fd',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            marginBottom: 3,
          }} title={result.filename}>
            📄 {result.filename}
          </p>
          {location && (
            <p style={{
              fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap',
            }}>
              {location.split(' › ').map((loc, i, arr) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{
                    background: 'rgba(255,255,255,0.06)',
                    padding: '1px 6px', borderRadius: 4,
                  }}>{loc}</span>
                  {i < arr.length - 1 && <span style={{ opacity: 0.4 }}>›</span>}
                </span>
              ))}
            </p>
          )}
        </div>

        {/* 유사도 뱃지 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
          <span style={{
            fontSize: '0.8rem', fontWeight: 800,
            color: si.color, fontFamily: 'var(--font-mono)',
            background: si.bg,
            padding: '2px 8px', borderRadius: 6,
          }}>
            {(result.score * 100).toFixed(1)}%
          </span>
          <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)' }}>
            유사도 {si.label}
          </span>
        </div>

        {/* 펼치기 화살표 */}
        <span style={{
          color: 'rgba(255,255,255,0.25)',
          fontSize: 12, flexShrink: 0, marginTop: 2,
          transform: expanded ? 'rotate(90deg)' : 'none',
          transition: 'transform 0.2s',
        }}>▶</span>
      </div>

      {/* ── 본문 미리보기 (항상 표시) ── */}
      {body && !expanded && (
        <div style={{
          padding: '0 16px 12px 48px',
        }}>
          <p style={{
            fontSize: '0.78rem',
            color: 'rgba(255,255,255,0.5)',
            lineHeight: 1.7,
            borderLeft: '2px solid rgba(99,102,241,0.3)',
            paddingLeft: 10,
          }}>
            {bodyPreview}
          </p>
        </div>
      )}

      {/* ── 전체 내용 (펼쳤을 때) ── */}
      {expanded && (
        <div style={{ padding: '0 16px 16px 16px' }}>
          <div style={{
            background: 'rgba(0,0,0,0.2)',
            borderRadius: 8,
            padding: '12px 14px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            {/* 원본 위치 태그 */}
            {location && (
              <p style={{
                fontSize: '0.68rem', fontWeight: 600,
                color: '#818cf8', marginBottom: 10,
                padding: '3px 8px', background: 'rgba(99,102,241,0.12)',
                borderRadius: 4, display: 'inline-block',
              }}>
                📍 {location}
              </p>
            )}
            {/* 전체 본문 */}
            <p style={{
              fontSize: '0.8rem',
              color: 'rgba(255,255,255,0.75)',
              lineHeight: 1.8,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: body.length < 200 ? 'var(--font-mono)' : 'var(--font-body)',
            }}>
              {body || '(본문이 없습니다 — 헤더/메타 청크)'}
            </p>
          </div>

          {/* 청크 ID (개발용) */}
          <p style={{
            marginTop: 8, fontSize: '0.62rem',
            color: 'rgba(255,255,255,0.12)',
            fontFamily: 'var(--font-mono)',
          }}>
            chunk: {result.chunk_id}
          </p>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// 메인 SearchPanel
// ─────────────────────────────────────────────
export default function SearchPanel() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searched, setSearched] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [topK, setTopK] = useState(5)

  const handleSearch = async (e) => {
    e?.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setExpandedId(null)
    try {
      const data = await searchDocuments({ query, topK })
      setResults(data)
      setSearched(true)
      // 첫 결과 자동 펼침
      if (data.length > 0) setExpandedId(data[0].chunk_id)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (chunkId) => {
    setExpandedId(prev => prev === chunkId ? null : chunkId)
  }

  return (
    <div>
      {/* ── 검색 입력 ── */}
      <form onSubmit={handleSearch} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="자연어로 검색하세요... (예: 병가 조건, TC 결제 오류, 배너 디폴트 이미지)"
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
        </div>

        {/* 결과 수 조절 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>결과 수:</span>
          {[3, 5, 10].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setTopK(n)}
              style={{
                padding: '2px 10px',
                borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: '0.72rem', fontWeight: 600,
                fontFamily: 'var(--font-body)',
                background: topK === n ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)',
                color: topK === n ? '#c4b5fd' : 'rgba(255,255,255,0.3)',
                transition: 'all 0.15s',
              }}
            >
              {n}개
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)' }}>
            결과 클릭 시 전체 내용 표시
          </span>
        </div>
      </form>

      {/* ── 에러 ── */}
      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: 10, marginBottom: 12,
          background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)',
          color: '#f87171', fontSize: '0.82rem',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── 결과 없음 ── */}
      {searched && !loading && results.length === 0 && !error && (
        <div style={{
          textAlign: 'center', padding: '40px 20px',
          color: 'rgba(255,255,255,0.25)',
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔍</div>
          <p style={{ fontSize: '0.85rem' }}>검색 결과가 없습니다</p>
          <p style={{ fontSize: '0.72rem', marginTop: 4 }}>아직 업로드된 문서가 없거나, 관련 내용이 없습니다</p>
        </div>
      )}

      {/* ── 결과 목록 ── */}
      {results.length > 0 && (
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', marginBottom: 10,
            padding: '0 4px',
          }}>
            <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>
              <span style={{ color: '#818cf8', fontWeight: 700 }}>{results.length}개</span> 결과 — 유사도 높은 순
            </p>
            <button
              onClick={() => setExpandedId(null)}
              style={{
                marginLeft: 'auto',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)',
                fontFamily: 'var(--font-body)',
              }}
            >
              모두 접기
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.map((r, i) => (
              <ResultCard
                key={r.chunk_id}
                result={r}
                index={i}
                expanded={expandedId === r.chunk_id}
                onToggle={() => toggleExpand(r.chunk_id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
