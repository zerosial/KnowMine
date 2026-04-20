"""
BGE-M3 로컬 임베딩 서비스

- sentence-transformers로 로컬 실행 (외부 API 없음)
- 모델: BAAI/bge-m3 (다국어, 한국어 최적)
- 배치 처리로 대용량 문서 효율적 처리
"""
from __future__ import annotations
from sentence_transformers import SentenceTransformer
from typing import List, Optional
import numpy as np

# 모델 싱글턴 (앱 전체에서 한 번만 로드)
_model: Optional[SentenceTransformer] = None
MODEL_NAME = "BAAI/bge-m3"


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        print(f"🔄 Loading embedding model: {MODEL_NAME}")
        _model = SentenceTransformer(MODEL_NAME)
        print(f"✅ Model loaded: {MODEL_NAME}")
    return _model


def embed_texts(texts: List[str], batch_size: int = 32) -> List[List[float]]:
    """
    텍스트 리스트를 임베딩 벡터로 변환.

    Args:
        texts: 임베딩할 텍스트 리스트
        batch_size: 배치 크기 (VRAM/RAM에 따라 조정)

    Returns:
        List of embedding vectors (float32)
    """
    model = get_model()

    # BGE-M3 권장: 쿼리는 "query: " 접두어, 문서는 그대로
    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=True,
        normalize_embeddings=True,  # 코사인 유사도 최적화
        convert_to_numpy=True,
    )

    return embeddings.tolist()


def embed_query(query: str) -> List[float]:
    """검색 쿼리 임베딩 (BGE 권장 접두어 포함)"""
    model = get_model()
    embedding = model.encode(
        f"query: {query}",
        normalize_embeddings=True,
        convert_to_numpy=True,
    )
    return embedding.tolist()
