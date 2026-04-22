import { useState, useEffect, useCallback, useRef } from 'react'
import UploadZone from '../components/UploadZone'
import DocumentCard from '../components/DocumentCard'
import StatsPanel from '../components/StatsPanel'
import ProcessingLog from '../components/ProcessingLog'
import SearchPanel from '../components/SearchPanel'
import { uploadFile, fetchDocuments, fetchStats } from '../api/client'

function nowTime() {
  return new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const POLL_INTERVAL = 3000 // 3초마다 처리중 문서 상태 폴링

export default function Dashboard() {
  const [docs, setDocs] = useState([])
  const [stats, setStats] = useState(null)
  const [logs, setLogs] = useState([])
  const [uploading, setUploading] = useState(false)
  const [docsLoading, setDocsLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('documents') // documents | search
  const [activeCategory, setActiveCategory] = useState(null) // null = 전체
  const [customCategories, setCustomCategories] = useState(() => JSON.parse(localStorage.getItem('knowmine_categories') || '[]'))
  const [newCatName, setNewCatName] = useState('')
  const [isAddingCat, setIsAddingCat] = useState(false)
  const pollRef = useRef(null)

  const addLog = useCallback((message, type = 'info') => {
    setLogs(prev => [...prev.slice(-49), { message, type, time: nowTime() }])
  }, [])

  // 데이터 갱신
  const refresh = useCallback(async () => {
    try {
      const [docsData, statsData] = await Promise.all([
        fetchDocuments(), // 프론트 화면에서 activeCategory로 로컬 필터링을 하기 위해 전체 문서를 받아옵니다
        fetchStats()
      ])
      setDocs(docsData)
      setStats(statsData)
    } catch (err) {
      addLog(`데이터 로드 실패: ${err.message}`, 'error')
    } finally {
      setDocsLoading(false)
      setStatsLoading(false)
    }
  }, [addLog])

  // 처리 중인 문서가 있으면 폴링
  useEffect(() => {
    const hasProcessing = docs.some(d => d.status === 'processing' || d.status === 'pending')
    if (hasProcessing && !pollRef.current) {
      pollRef.current = setInterval(refresh, POLL_INTERVAL)
    } else if (!hasProcessing && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [docs, refresh])

  // 초기 로드
  useEffect(() => {
    addLog('KnowMine 대시보드 시작', 'info')
    refresh()
  }, [])

  // 파일 업로드 처리
  const handleUpload = useCallback(async (files) => {
    if (uploading) return
    setUploading(true)

      for (const file of files) {
        addLog(`업로드 중: ${file.name} (${(file.size / 1024).toFixed(1)} KB) -> [${activeCategory || 'default'}]`, 'upload')
        try {
          const res = await uploadFile(file, activeCategory || 'default')
          addLog(`요청 완료: ${file.name} → ID: ${res.doc_id.slice(0, 8)}...`, 'success')
      } catch (err) {
        addLog(`업로드 실패: ${file.name} — ${err.message}`, 'error')
      }
    }

    setUploading(false)
    addLog('처리 파이프라인 시작됨. 상태를 모니터링합니다...', 'process')

    // 업로드 후 즉시 갱신 + 폴링 시작
    await refresh()
  }, [uploading, addLog, refresh, activeCategory])

  const handleDeleted = useCallback((docId) => {
    setDocs(prev => prev.filter(d => d.doc_id !== docId))
    addLog(`문서 삭제됨: ${docId.slice(0, 8)}...`, 'info')
    refresh()
  }, [addLog, refresh])

  // 현재 카테고리에 맞는 문서만 필터링
  const filteredDocs = activeCategory ? docs.filter(d => (d.category || 'default') === activeCategory) : docs;

  // 문서를 상태별로 정렬 (처리중 먼저)
  const sortedDocs = [...filteredDocs].sort((a, b) => {
    const order = { processing: 0, pending: 1, completed: 2, failed: 3 }
    return (order[a.status] ?? 9) - (order[b.status] ?? 9)
  })

  // 유니크 카테고리
  const uniqueCategories = Array.from(new Set(['default', ...customCategories, ...docs.map(d => d.category || 'default')]))

  const handleAddCategory = () => {
    if (newCatName.trim() && !uniqueCategories.includes(newCatName.trim())) {
      const newCats = [...customCategories, newCatName.trim()]
      setCustomCategories(newCats)
      localStorage.setItem('knowmine_categories', JSON.stringify(newCats))
      setActiveCategory(newCatName.trim())
    }
    setNewCatName('')
    setIsAddingCat(false)
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* 배경 블롭 */}
      <div className="bg-blob" style={{
        width: 500, height: 500,
        top: -100, left: -100,
        background: 'radial-gradient(circle, #6366f1, #4338ca)',
        animationDelay: '0s',
      }} />
      <div className="bg-blob" style={{
        width: 400, height: 400,
        top: 200, right: -100,
        background: 'radial-gradient(circle, #8b5cf6, #7c3aed)',
        animationDelay: '-4s',
        animationDuration: '15s',
      }} />
      <div className="bg-blob" style={{
        width: 350, height: 350,
        bottom: -100, left: '40%',
        background: 'radial-gradient(circle, #06b6d4, #0284c7)',
        animationDelay: '-8s',
        animationDuration: '18s',
        opacity: 0.08,
      }} />

      {/* 메인 레이아웃 */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1300, margin: '0 auto', padding: '24px 20px' }}>

        {/* ── 헤더 ── */}
        <header style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20,
                boxShadow: '0 0 20px rgba(99,102,241,0.4)',
              }}>
                🧠
              </div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1 }}>
                <span className="gradient-text">KnowMine</span>
              </h1>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', paddingLeft: 52 }}>
              AI 기반 사내 지식 자산화 플랫폼 — 로컬 보안 처리
            </p>
          </div>

          {/* 새로고침 */}
          <button
            onClick={refresh}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontSize: '0.8rem', fontWeight: 500,
              fontFamily: 'var(--font-body)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; e.currentTarget.style.color = '#818cf8' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
          >
            🔄 새로고침
          </button>
        </header>

        {/* ── 카테고리(탭) UI ── */}
        <section style={{ marginBottom: 24, display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
          <button
            onClick={() => setActiveCategory(null)}
            style={{
              padding: '8px 16px', borderRadius: 20, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)',
              background: activeCategory === null ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.02)',
              color: activeCategory === null ? '#c4b5fd' : 'rgba(255,255,255,0.6)',
              fontWeight: activeCategory === null ? 700 : 500, transition: 'all 0.2s', whiteSpace: 'nowrap'
            }}
          >
            전체 보기
          </button>
          
          {uniqueCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '8px 16px', borderRadius: 20, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)',
                background: activeCategory === cat ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.02)',
                color: activeCategory === cat ? '#c4b5fd' : 'rgba(255,255,255,0.6)',
                fontWeight: activeCategory === cat ? 700 : 500, transition: 'all 0.2s', whiteSpace: 'nowrap'
              }}
            >
              {cat === 'default' ? '기본 (Default)' : cat}
            </button>
          ))}

          {isAddingCat ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input 
                type="text" 
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                onBlur={() => { if(!newCatName) setIsAddingCat(false) }}
                placeholder="카테고리명..."
                autoFocus
                style={{
                  padding: '6px 12px', borderRadius: 16, border: '1px solid rgba(99,102,241,0.5)', 
                  background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: '0.85rem', width: 120
                }}
              />
              <button 
                onClick={handleAddCategory}
                style={{ padding: '6px 10px', borderRadius: 16, border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer' }}
              >추가</button>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingCat(true)}
              style={{
                padding: '8px 16px', borderRadius: 20, cursor: 'pointer', border: '1px dashed rgba(255,255,255,0.3)',
                background: 'transparent', color: 'rgba(255,255,255,0.6)', fontWeight: 500, transition: 'all 0.2s', whiteSpace: 'nowrap'
              }}
            >
              + 탭 추가
            </button>
          )}
        </section>

        {/* ── 통계 패널 ── */}
        <section style={{ marginBottom: 24 }}>
          <StatsPanel stats={stats} loading={statsLoading} />
        </section>

        {/* ── 2-컬럼 레이아웃 ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, alignItems: 'flex-start' }}>

          {/* 왼쪽: 업로드 + 로그 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* 업로드 */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📤</span> 문서 업로드 {activeCategory && <span style={{fontSize:'0.75rem', fontWeight:'normal', background:'rgba(139,92,246,0.2)', padding:'2px 8px', borderRadius:10, color:'#c4b5fd'}}>[{activeCategory}] 대상</span>}
              </h2>
              <UploadZone onUpload={handleUpload} uploading={uploading} categoryName={activeCategory || '기본 (Default)'} disabled={!activeCategory && false /* 전체상태에서도 default로 업로드되게 처리 */} />
            </div>

            {/* 처리 로그 */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📋</span> 처리 로그
                <span style={{
                  marginLeft: 'auto', fontSize: '0.7rem', fontWeight: 600,
                  color: 'rgba(255,255,255,0.3)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {logs.length}줄
                </span>
              </h2>
              <ProcessingLog logs={logs} />
            </div>
          </div>

          {/* 오른쪽: 탭 (문서 목록 | 검색) */}
          <div className="glass-card" style={{ padding: '20px' }}>
            {/* 탭 헤더 */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4 }}>
              {[
                { key: 'documents', label: '📁 문서 목록', count: filteredDocs.length },
                { key: 'search',    label: '🔍 AI 검색',  count: null },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    flex: 1, padding: '8px 12px',
                    borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.82rem', fontWeight: 600,
                    transition: 'all 0.2s',
                    background: activeTab === tab.key
                      ? 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3))'
                      : 'transparent',
                    color: activeTab === tab.key ? '#c4b5fd' : 'rgba(255,255,255,0.35)',
                    boxShadow: activeTab === tab.key ? '0 2px 10px rgba(99,102,241,0.15)' : 'none',
                  }}
                >
                  {tab.label}
                  {tab.count != null && (
                    <span style={{
                      marginLeft: 6,
                      background: 'rgba(255,255,255,0.1)',
                      padding: '1px 7px', borderRadius: 999,
                      fontSize: '0.68rem',
                    }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* 탭 콘텐츠: 문서 목록 */}
            {activeTab === 'documents' && (
              <div>
                {docsLoading ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="skeleton" style={{ height: 180 }} />
                    ))}
                  </div>
                ) : sortedDocs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.2)' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
                    <p style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 6 }}>문서가 없습니다</p>
                    <p style={{ fontSize: '0.78rem' }}>왼쪽 업로드 영역에서 파일을 추가하세요</p>
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: 12,
                  }}>
                    {sortedDocs.map((doc, i) => (
                      <DocumentCard
                        key={doc.doc_id}
                        doc={doc}
                        onDeleted={handleDeleted}
                        style={{ animationDelay: `${i * 60}ms` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 탭 콘텐츠: AI 검색 */}
            {activeTab === 'search' && (
              <SearchPanel activeCategory={activeCategory} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
