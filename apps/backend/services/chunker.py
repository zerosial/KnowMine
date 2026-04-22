"""
Semantic Chunking 서비스

전략:
- LangChain RecursiveCharacterTextSplitter 기반
- Markdown 구조(##, ###) 우선 분할
- chunk_size=512 tokens (한국어 고려해 chars 기준 1200자)
- overlap=150자로 컨텍스트 연속성 보장
"""
from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter
from typing import List


# Markdown 헤더 기반 1차 분할
HEADERS_TO_SPLIT_ON = [
    ("#", "h1"),
    ("##", "h2"),
    ("###", "h3"),
]

# 2차 분할: 긴 섹션을 추가로 분할
recursive_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1200,       # 한국어 약 400~600 토큰 기준
    chunk_overlap=150,
    separators=["\n\n", "\n", "。", ".", " ", ""],
    length_function=len,
)


def semantic_chunk(markdown_text: str, doc_id: str, filename: str, category: str = "default") -> List[dict]:
    """
    Markdown 텍스트를 의미 단위로 분할.

    Returns:
        List of dicts: {
            "text": str,
            "doc_id": str,
            "filename": str,
            "category": str,
            "chunk_index": int,
            "headers": dict (h1, h2, h3 등),
            "chunk_id": str,
        }
    """
    chunks = []

    # 1단계: 헤더 기반 분할
    md_splitter = MarkdownHeaderTextSplitter(
        headers_to_split_on=HEADERS_TO_SPLIT_ON,
        strip_headers=False,
    )

    try:
        header_splits = md_splitter.split_text(markdown_text)
    except Exception:
        # 헤더 분할 실패 시 전체를 하나의 청크로
        header_splits = []

    if not header_splits:
        # 헤더 없는 문서: recursive 분할만 적용
        raw_chunks = recursive_splitter.split_text(markdown_text)
        for i, text in enumerate(raw_chunks):
            if text.strip():
                chunks.append(_make_chunk(text, doc_id, filename, i, {}, category))
        return chunks

    # 2단계: 각 헤더 섹션을 재귀적으로 추가 분할
    chunk_idx = 0
    for doc in header_splits:
        text = doc.page_content.strip()
        metadata = doc.metadata  # {h1: "...", h2: "..."} 등

        if not text:
            continue

        if len(text) <= 1200:
            chunks.append(_make_chunk(text, doc_id, filename, chunk_idx, metadata, category))
            chunk_idx += 1
        else:
            # 너무 긴 섹션은 재귀 분할
            sub_texts = recursive_splitter.split_text(text)
            for sub_text in sub_texts:
                if sub_text.strip():
                    chunks.append(_make_chunk(sub_text, doc_id, filename, chunk_idx, metadata, category))
                    chunk_idx += 1

    return chunks


def _make_chunk(text: str, doc_id: str, filename: str, idx: int, headers: dict, category: str) -> dict:
    chunk_id = f"{doc_id}_chunk_{idx:04d}"
    return {
        "chunk_id": chunk_id,
        "doc_id": doc_id,
        "filename": filename,
        "category": category,
        "chunk_index": idx,
        "text": text,
        "headers": headers,
        "char_count": len(text),
    }
