"""
파일 업로드 및 처리 파이프라인 라우터

POST /api/upload
- 파일을 받아 비동기 백그라운드 태스크로 처리
- 파이프라인: 파싱 → 청킹 → 임베딩 → ChromaDB 저장
"""
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.responses import JSONResponse

from models.schemas import (
    DocumentMeta, ProcessingStatus, UploadResponse
)
from services.parser import parse_file, detect_file_type
from services.chunker import semantic_chunk
from services.embedder import embed_texts
from services.ai_service import enrich_chunk, is_enrichment_enabled
from services import vector_store

router = APIRouter()

# 허용 확장자
ALLOWED_EXTENSIONS = {
    ".xlsx", ".xls", ".xlsm",
    ".pptx", ".ppt",
    ".pdf",
}

UPLOAD_DIR = Path(__file__).parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    """파일 업로드 및 파이프라인 시작"""
    filename = file.filename or "unknown"
    ext = Path(filename).suffix.lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"지원하지 않는 파일 형식입니다: {ext}. 지원 형식: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # 문서 ID 생성
    doc_id = str(uuid.uuid4())
    file_bytes = await file.read()
    file_size = len(file_bytes)

    # 초기 메타데이터 저장
    file_type = detect_file_type(filename)
    meta = DocumentMeta(
        doc_id=doc_id,
        filename=filename,
        file_type=file_type,
        status=ProcessingStatus.PENDING,
        uploaded_at=datetime.now().isoformat(),
        file_size=file_size,
    )
    vector_store.save_document_meta(meta)

    # 백그라운드에서 파이프라인 실행
    background_tasks.add_task(
        process_document_pipeline,
        doc_id=doc_id,
        file_bytes=file_bytes,
        filename=filename,
    )

    return UploadResponse(
        doc_id=doc_id,
        filename=filename,
        message="파일이 업로드되었습니다. 처리가 시작됩니다.",
        status=ProcessingStatus.PENDING,
    )


async def process_document_pipeline(doc_id: str, file_bytes: bytes, filename: str):
    """
    전체 문서 처리 파이프라인 (백그라운드 태스크)
    1. 파싱 (Excel/PPT/PDF → Markdown)
    2. Semantic Chunking
    3. BGE-M3 임베딩
    4. ChromaDB 저장
    """
    try:
        # 상태: 처리중
        vector_store.update_document_status(doc_id, ProcessingStatus.PROCESSING)
        print(f"[{doc_id}] 🔄 Processing: {filename}")

        # 1단계: 파싱
        markdown_content, file_type = parse_file(file_bytes, filename)
        print(f"[{doc_id}] ✅ Parsed ({file_type}): {len(markdown_content)} chars")

        # 2단계: 청킹
        chunks = semantic_chunk(markdown_content, doc_id, filename)
        print(f"[{doc_id}] ✅ Chunked: {len(chunks)} chunks")

        if not chunks:
            raise ValueError("파싱된 청크가 없습니다. 파일 내용을 확인해주세요.")

        # 2.5단계: AI 정제 (선택적)
        if is_enrichment_enabled():
            print(f"[{doc_id}] 🤖 AI 정제 시작 ({len(chunks)} chunks)...")
            enriched_count = 0
            for i, chunk in enumerate(chunks):
                original_text = chunk["text"]
                enriched_text = enrich_chunk(original_text, filename)
                if enriched_text != original_text:
                    chunk["text"] = enriched_text
                    chunk["char_count"] = len(enriched_text)
                    enriched_count += 1
            print(f"[{doc_id}] ✅ AI 정제 완료: {enriched_count}/{len(chunks)} chunks enriched")

        # 3단계: 임베딩
        texts = [c["text"] for c in chunks]
        embeddings = embed_texts(texts)
        print(f"[{doc_id}] ✅ Embedded: {len(embeddings)} vectors")

        # 4단계: ChromaDB 저장
        vector_store.save_chunks(chunks, embeddings)
        print(f"[{doc_id}] ✅ Saved to ChromaDB")

        # 상태: 완료
        vector_store.update_document_status(
            doc_id,
            ProcessingStatus.COMPLETED,
            total_chunks=len(chunks),
        )
        print(f"[{doc_id}] 🎉 DONE: {filename} ({len(chunks)} chunks)")

    except Exception as e:
        print(f"[{doc_id}] ❌ ERROR: {str(e)}")
        vector_store.update_document_status(
            doc_id,
            ProcessingStatus.FAILED,
            error_message=str(e),
        )


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """문서 및 관련 청크 삭제"""
    meta = vector_store.get_document_meta(doc_id)
    if not meta:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")

    # 청크 삭제
    vector_store.delete_document_chunks(doc_id)

    # 메타 컬렉션에서도 삭제
    col = vector_store.get_meta_collection()
    col.delete(ids=[doc_id])

    return {"message": f"문서 '{meta.filename}'이 삭제되었습니다."}
