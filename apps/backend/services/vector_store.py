"""
ChromaDB 벡터 스토어 서비스

- 영속성(Persistence) 파일 기반 저장
- 컬렉션: 'knowmine_docs'
- 문서 메타데이터 JSON 직렬화 저장
- 통계 집계 지원
"""
from __future__ import annotations
import chromadb
from chromadb.config import Settings
from typing import List, Optional, TYPE_CHECKING
from pathlib import Path
import json
from datetime import datetime

from models.schemas import DocumentMeta, ProcessingStatus, FileType, StatsResponse

# ChromaDB 저장 경로
CHROMA_PATH = Path(__file__).parent.parent / "data" / "chromadb"
COLLECTION_NAME = "knowmine_docs"
META_COLLECTION_NAME = "knowmine_meta"

# 클라이언트 싱글턴
_client: Optional[chromadb.PersistentClient] = None
_docs_collection = None
_meta_collection = None


def initialize_chroma():
    """앱 시작 시 ChromaDB 초기화"""
    global _client, _docs_collection, _meta_collection
    CHROMA_PATH.mkdir(parents=True, exist_ok=True)

    _client = chromadb.PersistentClient(
        path=str(CHROMA_PATH),
        settings=Settings(anonymized_telemetry=False),
    )

    # 문서 청크 컬렉션 (벡터 + 텍스트)
    _docs_collection = _client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )

    # 문서 메타데이터 전용 컬렉션 (상태 추적)
    _meta_collection = _client.get_or_create_collection(
        name=META_COLLECTION_NAME,
    )

    print(f"📦 ChromaDB ready at {CHROMA_PATH}")
    print(f"   - Docs collection: {_docs_collection.count()} chunks")
    print(f"   - Meta collection: {_meta_collection.count()} documents")


def get_docs_collection():
    if _docs_collection is None:
        initialize_chroma()
    return _docs_collection


def get_meta_collection():
    if _meta_collection is None:
        initialize_chroma()
    return _meta_collection


# ─────────────────────────────────────────────
# 문서 메타데이터 CRUD
# ─────────────────────────────────────────────

def save_document_meta(meta: DocumentMeta):
    """문서 메타데이터 저장/업데이트"""
    col = get_meta_collection()
    meta_dict = meta.model_dump()

    # ChromaDB는 중첩 dict를 지원하지 않아 JSON 직렬화
    flat_meta = {k: str(v) if not isinstance(v, str) else v
                 for k, v in meta_dict.items()}

    # upsert: 이미 있으면 업데이트
    col.upsert(
        ids=[meta.doc_id],
        documents=[meta.filename],
        metadatas=[flat_meta],
    )


def get_document_meta(doc_id: str) -> Optional[DocumentMeta]:
    """문서 메타데이터 조회"""
    col = get_meta_collection()
    try:
        result = col.get(ids=[doc_id], include=["metadatas", "documents"])
        if not result["ids"]:
            return None

        m = result["metadatas"][0]
        return DocumentMeta(
            doc_id=m["doc_id"],
            filename=m["filename"],
            file_type=m["file_type"],
            status=m["status"],
            total_chunks=int(m.get("total_chunks", 0)),
            uploaded_at=m["uploaded_at"],
            processed_at=m.get("processed_at"),
            error_message=m.get("error_message"),
            file_size=int(m.get("file_size", 0)),
        )
    except Exception:
        return None


def list_documents() -> List[DocumentMeta]:
    """전체 문서 목록 조회"""
    col = get_meta_collection()
    try:
        result = col.get(include=["metadatas", "documents"])
        docs = []
        for m in result["metadatas"]:
            try:
                docs.append(DocumentMeta(
                    doc_id=m["doc_id"],
                    filename=m["filename"],
                    file_type=m.get("file_type", "unknown"),
                    status=m.get("status", "pending"),
                    total_chunks=int(m.get("total_chunks", 0)),
                    uploaded_at=m.get("uploaded_at", ""),
                    processed_at=m.get("processed_at"),
                    error_message=m.get("error_message"),
                    file_size=int(m.get("file_size", 0)),
                ))
            except Exception:
                continue
        # 최신 업로드 순 정렬
        docs.sort(key=lambda x: x.uploaded_at, reverse=True)
        return docs
    except Exception:
        return []


def update_document_status(
    doc_id: str,
    status: ProcessingStatus,
    total_chunks: int = 0,
    error_message: Optional[str] = None,
):
    """문서 처리 상태 업데이트"""
    meta = get_document_meta(doc_id)
    if not meta:
        return

    meta.status = status
    meta.total_chunks = total_chunks
    if status == ProcessingStatus.COMPLETED:
        meta.processed_at = datetime.now().isoformat()
    if error_message:
        meta.error_message = error_message

    save_document_meta(meta)


# ─────────────────────────────────────────────
# 벡터 청크 저장
# ─────────────────────────────────────────────

def save_chunks(chunks: List[dict], embeddings: List[List[float]]):
    """청크와 임베딩을 ChromaDB에 저장"""
    col = get_docs_collection()

    ids = [c["chunk_id"] for c in chunks]
    documents = [c["text"] for c in chunks]
    metadatas = [
        {
            "doc_id": c["doc_id"],
            "filename": c["filename"],
            "chunk_index": str(c["chunk_index"]),
            "char_count": str(c["char_count"]),
            "headers": json.dumps(c.get("headers", {}), ensure_ascii=False),
        }
        for c in chunks
    ]

    # 배치 upsert (중복 방지)
    BATCH_SIZE = 100
    for i in range(0, len(ids), BATCH_SIZE):
        col.upsert(
            ids=ids[i:i+BATCH_SIZE],
            documents=documents[i:i+BATCH_SIZE],
            embeddings=embeddings[i:i+BATCH_SIZE],
            metadatas=metadatas[i:i+BATCH_SIZE],
        )


def delete_document_chunks(doc_id: str):
    """특정 문서의 모든 청크 삭제"""
    col = get_docs_collection()
    col.delete(where={"doc_id": doc_id})


def delete_document(doc_id: str):
    """문서 메타데이터와 관련된 모든 청크를 삭제"""
    # 1. 청크 삭제
    try:
        delete_document_chunks(doc_id)
    except Exception:
        pass
    
    # 2. 메타데이터 삭제
    meta_col = get_meta_collection()
    try:
        meta_col.delete(ids=[doc_id])
    except Exception:
        pass


# ─────────────────────────────────────────────
# 통계
# ─────────────────────────────────────────────

def get_stats() -> StatsResponse:
    """전체 통계 집계"""
    docs = list_documents()
    docs_col = get_docs_collection()

    total_chunks = docs_col.count()
    total_documents = len(docs)
    completed = sum(1 for d in docs if d.status == ProcessingStatus.COMPLETED)
    processing = sum(1 for d in docs if d.status == ProcessingStatus.PROCESSING)
    failed = sum(1 for d in docs if d.status == ProcessingStatus.FAILED)

    by_type: dict = {}
    for doc in docs:
        ft = doc.file_type
        by_type[ft] = by_type.get(ft, 0) + 1

    return StatsResponse(
        total_documents=total_documents,
        total_chunks=total_chunks,
        completed_documents=completed,
        processing_documents=processing,
        failed_documents=failed,
        by_file_type=by_type,
    )


# ─────────────────────────────────────────────
# 유사도 검색
# ─────────────────────────────────────────────

def search_similar(query_embedding: List[float], top_k: int = 5, doc_id: Optional[str] = None) -> List[dict]:
    """유사 청크 검색"""
    col = get_docs_collection()
    
    count = col.count()
    if count == 0:
        return []

    where = {"doc_id": doc_id} if doc_id else None
    kwargs = {
        "query_embeddings": [query_embedding],
        "include": ["documents", "metadatas", "distances"],
    }
    if where:
        kwargs["where"] = where

    k = min(top_k, count)
    results = None
    while k > 0:
        try:
            kwargs["n_results"] = k
            results = col.query(**kwargs)
            break
        except RuntimeError as e:
            if "contigious 2D array" in str(e) or "ef or M is too small" in str(e):
                k -= 1
            else:
                raise e
                
    if not results or k == 0:
        return []

    output = []
    for i in range(len(results["ids"][0])):
        output.append({
            "chunk_id": results["ids"][0][i],
            "text": results["documents"][0][i],
            "metadata": results["metadatas"][0][i],
            "distance": results["distances"][0][i],
            "score": round(1 - results["distances"][0][i], 4),
        })
    return output
