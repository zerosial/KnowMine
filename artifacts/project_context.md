# KnowMine — AI 개발 보조를 위한 프로젝트 컨텍스트

> 이 파일은 새 대화창에서 AI에게 붙여넣어 프로젝트 컨텍스트를 즉시 전달하기 위한 문서입니다.
> 최신화 날짜: 2026-04-20 | 현재 단계: Phase 1 완료

---

## 🎯 프로젝트 정체성

**이름**: KnowMine  
**컨셉**: SI/통신사 프로젝트의 비정형 문서(Excel TC, PPT 보고서, PDF 매뉴얼)를 로컬 AI(RAG)로 처리해 검색 가능한 지식 자산화  
**핵심 원칙**: Local First — 모든 데이터는 로컬에서 처리, 외부 전송 없음

---

## 🛠️ 기술 스택 (확정)

```
Frontend:  React 19 + Vite 8 + Tailwind CSS v4
Backend:   Python 3.11.9 + FastAPI + Uvicorn
파서:      PyMuPDF (PDF) + pandas/openpyxl (Excel) + python-pptx (PPT)
임베딩:    sentence-transformers BAAI/bge-m3 (로컬, 한국어 최적)
벡터DB:    ChromaDB (영속성 파일 모드, apps/backend/data/chromadb/)
청킹:      LangChain MarkdownHeaderTextSplitter + RecursiveCharacterTextSplitter
OS:        Windows 11, PowerShell
```

---

## 📁 프로젝트 구조 (실제)

```
KnowMine/
├── apps/
│   ├── backend/
│   │   ├── main.py                  # FastAPI + lifespan(ChromaDB init)
│   │   ├── requirements.txt
│   │   ├── Dockerfile
│   │   ├── .venv/                   # Python 3.11.9 가상환경 (git 제외)
│   │   ├── data/chromadb/           # 벡터 DB 저장소 (git 제외)
│   │   ├── uploads/                 # 임시 업로드 파일 (git 제외)
│   │   ├── models/
│   │   │   └── schemas.py           # Pydantic: DocumentMeta, ProcessingStatus 등
│   │   ├── routers/
│   │   │   ├── upload.py            # POST /api/upload (BackgroundTask 파이프라인)
│   │   │   └── documents.py        # GET /api/documents, stats, search, DELETE
│   │   └── services/
│   │       ├── parser.py            # Excel/PPT/PDF → Markdown 변환
│   │       ├── chunker.py           # Semantic chunking
│   │       ├── embedder.py          # BGE-M3 임베딩 (싱글턴)
│   │       └── vector_store.py     # ChromaDB CRUD
│   └── frontend/
│       ├── src/
│       │   ├── pages/Dashboard.jsx  # 메인 대시보드 (3초 폴링)
│       │   ├── components/
│       │   │   ├── UploadZone.jsx
│       │   │   ├── DocumentCard.jsx
│       │   │   ├── StatsPanel.jsx
│       │   │   ├── ProcessingLog.jsx
│       │   │   └── SearchPanel.jsx
│       │   ├── api/client.js        # fetch 기반 API 클라이언트
│       │   ├── App.jsx
│       │   └── index.css            # 다크 테마 디자인 시스템
│       ├── vite.config.js           # tailwindcss 플러그인 + API 프록시(/api → :8000)
│       └── index.html
├── artifacts/                        # 프로젝트 문서 (이 폴더)
│   ├── project_context.md           # 이 파일
│   ├── implementation_plan.md       # 아키텍처 설계서
│   └── task.md                      # Phase별 작업 목록
├── .gitignore
├── docker-compose.yml
└── README.md
```

---

## 🔑 핵심 설계 결정 & 이유

| 결정사항 | 이유 |
|----------|------|
| BGE-M3 선택 | 한국어 + 영어 혼용 SI 문서에 최적, 로컬 실행 |
| ChromaDB | 설치 없이 파일 기반 영속성, 쉬운 초기화 |
| FastAPI BackgroundTask | 파일 업로드 즉시 응답, 파이프라인은 비동기 처리 |
| 3초 폴링 | WebSocket 복잡도 회피, 처리중 문서만 폴링 |
| Tailwind v4 | `@tailwindcss/vite` 플러그인 방식 (config 파일 불필요) |
| `from __future__ import annotations` | Python 3.11에서 `X \| None` 타입 힌트 런타임 오류 방지 |

---

## 🚀 로컬 실행 명령어

```powershell
# 백엔드 (apps/backend 디렉토리에서)
.venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000

# 프론트엔드 (apps/frontend 디렉토리에서)
npm run dev
```

접속: http://localhost:3000 (대시보드) | http://localhost:8000/docs (API 문서)

---

## ⚠️ 알려진 주의사항

1. **BGE-M3 첫 실행**: ~1.5GB 모델 자동 다운로드 (`~/.cache/huggingface/`)
2. **IDE lint 경고**: `.venv` 내 패키지 미인식 → 실행에는 무관
3. **ChromaDB telemetry**: `posthog capture()` 경고 → 무시 가능
4. **Windows 경로**: 명령어는 PowerShell 기준, bash와 구분 필요

---

## 📋 Phase 2 작업 후보 (우선순위 미정)

```
[ ] Ollama 연동 — 문서 AI 자동 요약 (llama3/mistral)  
[ ] UMAP 2D 벡터 시각화 — scatter plot으로 문서 군집 확인  
[ ] AI 채팅 인터페이스 — RAG Q&A (문서 기반 답변)  
[ ] 검색 결과 하이라이팅 — 일치 청크 내 키워드 강조  
[ ] 배치 업로드 — 폴더 단위 다중 파일 처리  
[ ] 문서 태깅 — 수동 카테고리 분류  
```

---

## 💬 AI에게 전달할 개발 컨텍스트 (복사용)

```
너는 시니어 풀스택 + AI 엔지니어다.

프로젝트명: KnowMine (AI 기반 사내 지식 자산화 플랫폼)
현재 상태: Phase 1 완료 (파싱 + 벡터화 + 대시보드)
스택: React19/Vite8/Tailwind v4 (FE) + FastAPI/Python3.11 (BE) + BGE-M3/ChromaDB (AI)
실행환경: Windows 11, PowerShell, 로컬 개발 (uvicorn + npm run dev)
핵심원칙: 모든 AI 처리는 완전 로컬 (외부 API 사용 금지)
참고문서: artifacts/ 폴더의 implementation_plan.md, task.md

현재 이슈 또는 다음 작업:
[여기에 구체적인 작업 내용 서술]
```
