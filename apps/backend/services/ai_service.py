"""
OpenAI API 서비스 — RAG 답변 생성 + 청크 품질 정제

- gpt-4o-mini 사용 (가성비 최적)
- 비용 최적화: max_tokens 제한, 청크 정제는 1회만 실행
- 장애 격리: API 실패 시 graceful fallback
"""
from __future__ import annotations
import os
from typing import Optional
from dotenv import load_dotenv
from openai import OpenAI

# .env 로드
load_dotenv()

_client: Optional[OpenAI] = None


def get_client() -> OpenAI:
    """OpenAI 클라이언트 싱글턴"""
    global _client
    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY가 .env에 설정되지 않았습니다.")
        _client = OpenAI(api_key=api_key)
        print(f"✅ OpenAI client initialized (model: {get_model()})")
    return _client


def get_model() -> str:
    return os.getenv("OPENAI_MODEL", "gpt-4o-mini")


def is_enrichment_enabled() -> bool:
    return os.getenv("ENRICH_CHUNKS", "false").lower() == "true"


# ─────────────────────────────────────────────
# RAG 답변 생성
# ─────────────────────────────────────────────

RAG_SYSTEM_PROMPT = """너는 사내 문서를 기반으로 질문에 답변하는 AI 어시스턴트(KnowMine)이다.

규칙:
1. 반드시 아래 제공된 [참조 문서]의 내용만 기반으로 답변하라.
2. 참조 문서에 없는 내용은 "제공된 문서에서 관련 내용을 찾을 수 없습니다."라고 답변하라.
3. 답변은 한국어로, 자연스럽고 명확하게 작성하라.
4. 핵심 내용은 볼드(**) 처리하라.
5. 여러 문서에서 정보를 종합할 경우, 각 출처를 [📄 파일명] 형태로 명시하라.
6. 표나 목록이 적절하면 마크다운 형식을 사용하라."""


def generate_answer(query: str, context_chunks: list[dict]) -> dict:
    """
    검색된 청크를 컨텍스트로 AI 답변 생성 (RAG).
    
    Args:
        query: 사용자 질문
        context_chunks: 벡터 검색 결과 리스트 [{text, filename, score, ...}]
    
    Returns:
        {answer: str, model: str, tokens_used: int}
    """
    client = get_client()
    model = get_model()

    # 컨텍스트 구성 (토큰 절약을 위해 상위 청크만, 총 4000자 제한)
    context_parts = []
    total_chars = 0
    for i, chunk in enumerate(context_chunks):
        chunk_text = chunk.get("text", "")
        filename = chunk.get("filename", "알 수 없는 파일")
        score = chunk.get("score", 0)

        entry = f"[참조 {i+1}] 📄 {filename} (유사도: {score:.1%})\n{chunk_text}"
        
        if total_chars + len(entry) > 4000:
            break
        context_parts.append(entry)
        total_chars += len(entry)

    context_text = "\n\n---\n\n".join(context_parts)

    user_message = f"""[참조 문서]
{context_text}

[질문]
{query}"""

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": RAG_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            max_tokens=800,
            temperature=0.3,  # 사실 기반 답변은 낮은 temperature
        )

        answer = response.choices[0].message.content or ""
        tokens_used = response.usage.total_tokens if response.usage else 0

        return {
            "answer": answer,
            "model": model,
            "tokens_used": tokens_used,
        }

    except Exception as e:
        return {
            "answer": f"⚠️ AI 답변 생성 중 오류가 발생했습니다: {str(e)}",
            "model": model,
            "tokens_used": 0,
        }


# ─────────────────────────────────────────────
# 청크 품질 정제 (업로드 파이프라인용)
# ─────────────────────────────────────────────

ENRICH_SYSTEM_PROMPT = """너는 문서 청크를 검색 최적화를 위해 정제하는 AI이다.

규칙:
1. 원문의 핵심 정보를 절대 누락하지 마라.
2. 원문 앞에 1~2줄의 요약(이 문단의 핵심)을 추가하라.
3. 마크다운 헤더만 있고 본문이 없는 경우, 헤더에서 유추 가능한 맥락을 한 줄로 보충하라.
4. 표/목록 구조는 유지하되, 약어나 코드명에 설명을 간단히 추가하라.
5. 출력은 한국어로, 원문보다 약간 길어져도 괜찮다.
6. 절대 지어내지 마라. 원문에 없는 사실을 추가하지 마라."""


def enrich_chunk(chunk_text: str, filename: str) -> str:
    """
    청크 원문을 AI로 정제하여 검색 품질 향상.
    실패 시 원문을 그대로 반환 (graceful fallback).
    """
    if not is_enrichment_enabled():
        return chunk_text

    # 너무 짧은 청크(10자 미만)는 정제 스킵
    if len(chunk_text.strip()) < 10:
        return chunk_text

    try:
        client = get_client()
        model = get_model()

        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": ENRICH_SYSTEM_PROMPT},
                {"role": "user", "content": f"[파일명: {filename}]\n\n{chunk_text}"},
            ],
            max_tokens=300,
            temperature=0.2,
        )

        enriched = response.choices[0].message.content
        if enriched and len(enriched.strip()) > len(chunk_text.strip()) * 0.3:
            return enriched.strip()
        else:
            return chunk_text

    except Exception as e:
        print(f"⚠️ 청크 정제 실패 (fallback to original): {e}")
        return chunk_text
