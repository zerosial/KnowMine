import { useCallback, useState } from 'react'

const FILE_ICONS = {
  excel: '📊',
  ppt:   '📑',
  pdf:   '📄',
  unknown: '📁',
}

const ACCEPT_TYPES = [
  '.xlsx', '.xls', '.xlsm',
  '.pptx', '.ppt',
  '.pdf',
].join(',')

export default function UploadZone({ onUpload, uploading, categoryName }) {
  const [dragOver, setDragOver] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])

  const handleFiles = useCallback((files) => {
    const arr = Array.from(files)
    setSelectedFiles(arr)
    if (arr.length > 0) onUpload(arr)
  }, [onUpload])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const onDragOver = (e) => { e.preventDefault(); setDragOver(true) }
  const onDragLeave = () => setDragOver(false)

  const onFileChange = (e) => {
    if (e.target.files?.length) handleFiles(e.target.files)
  }

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      style={{
        border: `2px dashed ${dragOver ? 'rgba(99,102,241,0.7)' : 'rgba(255,255,255,0.12)'}`,
        borderRadius: 16,
        padding: '40px 24px',
        textAlign: 'center',
        cursor: uploading ? 'not-allowed' : 'pointer',
        background: dragOver
          ? 'rgba(99,102,241,0.06)'
          : 'rgba(22,22,31,0.5)',
        transition: 'all 0.25s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onClick={() => !uploading && document.getElementById('file-input').click()}
    >
      {/* 배경 그라데이션 효과 */}
      {dragOver && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at center, rgba(99,102,241,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
      )}

      <input
        id="file-input"
        type="file"
        multiple
        accept={ACCEPT_TYPES}
        style={{ display: 'none' }}
        onChange={onFileChange}
        disabled={uploading}
      />

      {/* 아이콘 */}
      <div style={{ fontSize: 48, marginBottom: 12, lineHeight: 1 }}>
        {uploading ? (
          <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⚙️</span>
        ) : dragOver ? '📂' : '📥'}
      </div>

      <p style={{ fontWeight: 600, fontSize: '1rem', color: '#e2e8f0', marginBottom: 6 }}>
        {uploading
          ? <span><span style={{color: '#c4b5fd'}}>[{categoryName}]</span> 에 탑재 중...</span>
          : dragOver
          ? '여기에 놓으세요!'
          : '파일을 드래그하거나 클릭하여 업로드'}
      </p>

      <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', marginBottom: 20 }}>
        Excel (.xlsx, .xls) · PowerPoint (.pptx) · PDF
      </p>

      {/* 파일 타입 배지 */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        {[
          { label: 'Excel', icon: '📊', color: '#34d399' },
          { label: 'PowerPoint', icon: '📑', color: '#f97316' },
          { label: 'PDF', icon: '📄', color: '#f87171' },
        ].map(({ label, icon, color }) => (
          <span key={label} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 12px',
            borderRadius: 999,
            fontSize: '0.72rem', fontWeight: 600,
            background: `${color}15`,
            color,
            border: `1px solid ${color}30`,
          }}>
            {icon} {label}
          </span>
        ))}
      </div>
    </div>
  )
}
