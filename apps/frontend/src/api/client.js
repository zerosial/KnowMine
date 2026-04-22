/**
 * KnowMine API Client
 * FastAPI 백엔드와 통신하는 모든 함수 모음
 */

const BASE_URL = '/api'

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || '서버 오류가 발생했습니다.')
  }
  return res.json()
}

/** 파일 업로드 */
export async function uploadFile(file, category = "default") {
  const formData = new FormData()
  formData.append('category', category)
  formData.append('file', file)

  const res = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  })
  return handleResponse(res)
}

/** 전체 문서 목록 조회 */
export async function fetchDocuments(category = null) {
  const url = category ? `${BASE_URL}/documents?category=${encodeURIComponent(category)}` : `${BASE_URL}/documents`;
  const res = await fetch(url)
  return handleResponse(res)
}

/** 특정 문서 조회 */
export async function fetchDocument(docId) {
  const res = await fetch(`${BASE_URL}/documents/${docId}`)
  return handleResponse(res)
}

/** 전체 통계 조회 */
export async function fetchStats() {
  const res = await fetch(`${BASE_URL}/stats`)
  return handleResponse(res)
}

/** 문서 삭제 */
export async function deleteDocument(docId) {
  const res = await fetch(`${BASE_URL}/documents/${docId}`, {
    method: 'DELETE',
  })
  return handleResponse(res)
}

/** 유사도 검색 */
export async function searchDocuments({ query, topK = 5, docId = null, category = null }) {
  const res = await fetch(`${BASE_URL}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, top_k: topK, doc_id: docId, category }),
  })
  return handleResponse(res)
}

/** AI 질문 답변 (RAG) */
export async function askQuestion({ query, topK = 5, docId = null, category = null }) {
  const res = await fetch(`${BASE_URL}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, top_k: topK, doc_id: docId, category }),
  })
  return handleResponse(res)
}

/** 서버 헬스 체크 */
export async function checkHealth() {
  try {
    const res = await fetch('/health')
    return res.ok
  } catch {
    return false
  }
}
