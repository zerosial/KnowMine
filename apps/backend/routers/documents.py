"""
문서 목록/상태/통계/검색 라우터

GET  /api/documents          - 전체 문서 목록
GET  /api/documents/{doc_id} - 특정 문서 상세
GET  /api/stats              - 전체 통계
POST /api/search             - 유사도 검색
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from models.schemas import DocumentResponse, StatsResponse
from services import vector_store, ai_service
from services.embedder import embed_query

router = APIRouter()


@router.get("/documents", response_model=List[DocumentResponse])
async def list_documents():
    """전체 문서 목록 반환"""
    docs = vector_store.list_documents()
    return [
        DocumentResponse(
            doc_id=d.doc_id,
            filename=d.filename,
            file_type=d.file_type,
            status=d.status,
            total_chunks=d.total_chunks,
            uploaded_at=d.uploaded_at,
            processed_at=d.processed_at,
            error_message=d.error_message,
            file_size=d.file_size,
        )
        for d in docs
    ]


@router.get("/documents/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: str):
    """특정 문서 상세 조회"""
    meta = vector_store.get_document_meta(doc_id)
    if not meta:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")

    return DocumentResponse(
        doc_id=meta.doc_id,
        filename=meta.filename,
        file_type=meta.file_type,
        status=meta.status,
        total_chunks=meta.total_chunks,
        uploaded_at=meta.uploaded_at,
        processed_at=meta.processed_at,
        error_message=meta.error_message,
        file_size=meta.file_size,
    )


@router.delete("/{doc_id}")
async def delete_document_endpoint(doc_id: str):
    """문서 및 관련 청크 삭제"""
    meta = vector_store.get_document_meta(doc_id)
    if not meta:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")

    vector_store.delete_document(doc_id)
    return {"message": f"문서({doc_id})가 삭제되었습니다."}


@router.get("/stats", response_model=StatsResponse)
async def get_stats():
    """전체 통계 반환"""
    return vector_store.get_stats()


class SearchRequest(BaseModel):
    query: str
    top_k: int = 5
    doc_id: Optional[str] = None


class SearchResult(BaseModel):
    chunk_id: str
    text: str
    filename: str
    score: float
    headers: str


@router.post("/search", response_model=List[SearchResult])
async def search_documents(req: SearchRequest):
    """자연어 유사도 검색"""
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="검색어를 입력해주세요.")

    # 쿼리 임베딩
    query_embedding = embed_query(req.query)

    # ChromaDB 검색
    results = vector_store.search_similar(
        query_embedding=query_embedding,
        top_k=req.top_k,
        doc_id=req.doc_id,
    )

    return [
        SearchResult(
            chunk_id=r["chunk_id"],
            text=r["text"],
            filename=r["metadata"].get("filename", ""),
            score=r["score"],
            headers=r["metadata"].get("headers", "{}"),
        )
        for r in results
    ]


# ─────────────────────────────────────────────
# AI 질문 (RAG)
# ─────────────────────────────────────────────

class AskRequest(BaseModel):
    query: str
    top_k: int = 5
    doc_id: Optional[str] = None


class AskResponse(BaseModel):
    answer: str
    sources: List[SearchResult]
    model: str
    tokens_used: int


@router.post("/ask", response_model=AskResponse)
async def ask_question(req: AskRequest):
    """AI 기반 문서 질문 답변 (RAG)"""
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="질문을 입력해주세요.")

    # 1. 벡터 검색
    query_embedding = embed_query(req.query)
    results = vector_store.search_similar(
        query_embedding=query_embedding,
        top_k=req.top_k,
        doc_id=req.doc_id,
    )

    if not results:
        return AskResponse(
            answer="업로드된 문서에서 관련 내용을 찾을 수 없습니다. 먼저 문서를 업로드해주세요.",
            sources=[],
            model=ai_service.get_model(),
            tokens_used=0,
        )

    # 2. 검색 결과를 AI 컨텍스트로 전달
    context_chunks = [
        {
            "text": r["text"],
            "filename": r["metadata"].get("filename", ""),
            "score": r["score"],
        }
        for r in results
    ]

    ai_result = ai_service.generate_answer(req.query, context_chunks)

    # 3. 출처 정보 구성
    sources = [
        SearchResult(
            chunk_id=r["chunk_id"],
            text=r["text"],
            filename=r["metadata"].get("filename", ""),
            score=r["score"],
            headers=r["metadata"].get("headers", "{}"),
        )
        for r in results
    ]

    return AskResponse(
        answer=ai_result["answer"],
        sources=sources,
        model=ai_result["model"],
        tokens_used=ai_result["tokens_used"],
    )
