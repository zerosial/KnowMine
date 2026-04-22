import { useState } from 'react'
import { searchDocuments, askQuestion } from '../api/client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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

function scoreInfo(score) {
  if (score >= 0.65) return { color: '#34d399', label: '높음', bg: 'rgba(52,211,153,0.1)' }
  if (score >= 0.45) return { color: '#fbbf24', label: '보통', bg: 'rgba(251,191,36,0.1)' }
  return { color: '#94a3b8', label: '낮음', bg: 'rgba(148,163,184,0.08)' }
}

// ─────────────────────────────────────────────
// 결과 카드 (벡터 검색 + AI 출처 공용)
// ─────────────────────────────────────────────
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
        <span style={{
          minWidth: 22, height: 22,
          background: 'rgba(99,102,241,0.2)',
          borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.7rem', fontWeight: 700, color: '#818cf8',
          flexShrink: 0, marginTop: 1,
        }}>{index + 1}</span>

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

        <span style={{
          color: 'rgba(255,255,255,0.25)',
          fontSize: 12, flexShrink: 0, marginTop: 2,
          transform: expanded ? 'rotate(90deg)' : 'none',
          transition: 'transform 0.2s',
        }}>▶</span>
      </div>

      {body && !expanded && (
        <div style={{ padding: '0 16px 12px 48px' }}>
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

      {expanded && (
        <div style={{ padding: '0 16px 16px 16px' }}>
          <div style={{
            background: 'rgba(0,0,0,0.2)',
            borderRadius: 8,
            padding: '12px 14px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
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
// AI 답변 표시 컴포넌트
// ─────────────────────────────────────────────
function AiAnswerBox({ answer, model, tokensUsed }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.06))',
      borderRadius: 14,
      border: '1px solid rgba(99,102,241,0.2)',
      padding: '20px',
      marginBottom: 16,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* 장식 라인 */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa)',
      }} />

      {/* 헤더 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, boxShadow: '0 0 12px rgba(99,102,241,0.3)',
        }}>🤖</div>
        <span style={{
          fontSize: '0.82rem', fontWeight: 700,
          color: '#c4b5fd',
        }}>AI 답변</span>
        <span style={{
          marginLeft: 'auto',
          fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)',
          fontFamily: 'var(--font-mono)',
        }}>
          {model} · {tokensUsed} tokens
        </span>
      </div>

      {/* 답변 본문 */}
      <div 
        className="ai-markdown"
        style={{
          fontSize: '0.85rem',
          color: 'rgba(255,255,255,0.85)',
          lineHeight: 1.9,
          wordBreak: 'break-word',
          fontFamily: 'var(--font-body)',
        }}
      >
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({...props}) => <h1 style={{fontSize: '1.2rem', fontWeight: 'bold', color: '#818cf8', marginTop: 16, marginBottom: 8}} {...props} />,
            h2: ({...props}) => <h2 style={{fontSize: '1.1rem', fontWeight: 'bold', color: '#c4b5fd', marginTop: 14, marginBottom: 6}} {...props} />,
            h3: ({...props}) => <h3 style={{fontSize: '1.0rem', fontWeight: 'bold', color: '#ddd6fe', marginTop: 12, marginBottom: 4}} {...props} />,
            p: ({...props}) => <p style={{marginBottom: 10}} {...props} />,
            ul: ({...props}) => <ul style={{listStyleType: 'disc', paddingLeft: 20, marginBottom: 10}} {...props} />,
            ol: ({...props}) => <ol style={{listStyleType: 'decimal', paddingLeft: 20, marginBottom: 10}} {...props} />,
            li: ({...props}) => <li style={{marginBottom: 4}} {...props} />,
            a: ({...props}) => <a target="_blank" rel="noopener noreferrer" style={{color: '#60a5fa', textDecoration: 'underline'}} {...props} />,
            strong: ({...props}) => <strong style={{color: '#fff', fontWeight: 800}} {...props} />,
            table: ({...props}) => <div style={{overflowX: 'auto', marginBottom: 10}}><table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem'}} {...props} /></div>,
            th: ({...props}) => <th style={{border: '1px solid rgba(255,255,255,0.1)', padding: '8px 12px', background: 'rgba(99,102,241,0.1)'}} {...props} />,
            td: ({...props}) => <td style={{border: '1px solid rgba(255,255,255,0.1)', padding: '8px 12px'}} {...props} />,
            blockquote: ({...props}) => <blockquote style={{borderLeft: '3px solid #818cf8', paddingLeft: 10, color: 'rgba(255,255,255,0.6)', margin: '10px 0', background: 'rgba(0,0,0,0.1)', padding: '8px 12px'}} {...props} />,
          }}
        >
          {answer}
        </ReactMarkdown>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 메인 SearchPanel
// ─────────────────────────────────────────────
export default function SearchPanel({ activeCategory }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searched, setSearched] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [topK, setTopK] = useState(5)

  // AI 질문 모드
  const [mode, setMode] = useState('ai') // 'search' | 'ai'
  const [aiAnswer, setAiAnswer] = useState(null) // {answer, model, tokens_used, sources}

  const handleSearch = async (e) => {
    e?.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setExpandedId(null)
    setAiAnswer(null)

    try {
      if (mode === 'ai') {
        // AI 질문 모드
        const data = await askQuestion({ query, topK, category: activeCategory })
        setAiAnswer({
          answer: data.answer,
          model: data.model,
          tokensUsed: data.tokens_used,
        })
        setResults(data.sources || [])
        setSearched(true)
      } else {
        // 벡터 검색 모드
        const data = await searchDocuments({ query, topK, category: activeCategory })
        setResults(data)
        setSearched(true)
        if (data.length > 0) setExpandedId(data[0].chunk_id)
      }
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
      {/* ── 모드 선택 ── */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 14,
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 10, padding: 4,
      }}>
        {[
          { key: 'ai', label: '🤖 AI 질문', desc: 'AI가 문서를 읽고 답변' },
          { key: 'search', label: '🔍 벡터 검색', desc: '유사도 기반 원문 검색' },
        ].map(m => (
          <button
            key={m.key}
            onClick={() => { setMode(m.key); setAiAnswer(null); setResults([]); setSearched(false) }}
            title={m.desc}
            style={{
              flex: 1, padding: '8px 12px',
              borderRadius: 8, border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: '0.82rem', fontWeight: 600,
              transition: 'all 0.2s',
              background: mode === m.key
                ? m.key === 'ai'
                  ? 'linear-gradient(135deg, rgba(99,102,241,0.35), rgba(139,92,246,0.35))'
                  : 'linear-gradient(135deg, rgba(52,211,153,0.25), rgba(16,185,129,0.25))'
                : 'transparent',
              color: mode === m.key ? '#e2e8f0' : 'rgba(255,255,255,0.3)',
              boxShadow: mode === m.key ? '0 2px 10px rgba(99,102,241,0.15)' : 'none',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {activeCategory && (
        <div style={{
          marginBottom: 12, padding: '6px 12px', background: 'rgba(99,102,241,0.1)', 
          borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: '0.75rem', color: '#c4b5fd', border: '1px solid rgba(99,102,241,0.2)'
        }}>
          <span>📌</span> <strong>[{activeCategory === 'default' ? '기본 (Default)' : activeCategory}]</strong> 지식창고 안에서 찾고 있습니다.
        </div>
      )}

      {/* ── 검색 입력 ── */}
      <form onSubmit={handleSearch} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={
              mode === 'ai'
                ? "문서에 대해 질문하세요... (예: 병가 조건이 뭐야?)"
                : "자연어로 검색하세요... (예: 병가, TC 결제 오류)"
            }
            style={{
              flex: 1,
              padding: '10px 16px',
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${mode === 'ai' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 10,
              color: '#e2e8f0',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-body)',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = mode === 'ai' ? 'rgba(99,102,241,0.6)' : 'rgba(52,211,153,0.6)'}
            onBlur={e => e.target.style.borderColor = mode === 'ai' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.1)'}
            disabled={loading}
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !query.trim()}
            style={mode === 'ai' ? {
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            } : undefined}
          >
            {loading
              ? <span className="animate-spin-slow">⚙️</span>
              : mode === 'ai' ? '🤖' : '🔍'}
            {' '}{mode === 'ai' ? '질문' : '검색'}
          </button>
        </div>

        {/* 결과 수 조절 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>참조 문서 수:</span>
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
          {mode === 'ai' && (
            <span style={{
              marginLeft: 'auto', fontSize: '0.68rem',
              color: 'rgba(99,102,241,0.4)',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              ⚡ GPT-4o-mini 응답
            </span>
          )}
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

      {/* ── 로딩 ── */}
      {loading && mode === 'ai' && (
        <div style={{
          padding: '30px 20px', textAlign: 'center',
          color: 'rgba(255,255,255,0.4)',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, marginBottom: 10,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}>🤖</div>
          <p style={{ fontSize: '0.85rem' }}>AI가 문서를 분석하고 있습니다...</p>
          <p style={{ fontSize: '0.72rem', marginTop: 4, opacity: 0.5 }}>벡터 검색 → 컨텍스트 생성 → GPT-4o-mini 답변</p>
        </div>
      )}

      {/* ── AI 답변 ── */}
      {aiAnswer && !loading && (
        <AiAnswerBox
          answer={aiAnswer.answer}
          model={aiAnswer.model}
          tokensUsed={aiAnswer.tokensUsed}
        />
      )}

      {/* ── 결과 없음 ── */}
      {searched && !loading && results.length === 0 && !error && !aiAnswer && (
        <div style={{
          textAlign: 'center', padding: '40px 20px',
          color: 'rgba(255,255,255,0.25)',
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔍</div>
          <p style={{ fontSize: '0.85rem' }}>검색 결과가 없습니다</p>
          <p style={{ fontSize: '0.72rem', marginTop: 4 }}>아직 업로드된 문서가 없거나, 관련 내용이 없습니다</p>
        </div>
      )}

      {/* ── 결과 목록 (벡터 검색) 또는 출처 문서 (AI) ── */}
      {results.length > 0 && !loading && (
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', marginBottom: 10,
            padding: '0 4px',
          }}>
            <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>
              {mode === 'ai' ? '📚 ' : ''}
              <span style={{ color: '#818cf8', fontWeight: 700 }}>{results.length}개</span>
              {mode === 'ai' ? ' 참조 문서' : ' 결과'} — 유사도 높은 순
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
