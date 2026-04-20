# KnowMine Phase 1 — 완료

## 프로젝트 개요

SI/통신사 환경에서 발생하는 비정형 문서(Excel, PPT, PDF)를 로컬 AI 기술(RAG)로 처리해  
지식 자산으로 전환하는 플랫폼. **Phase 1 완료**: 문서 업로드 → DB/벡터화 → 시각화 대시보드

---

## 확정된 설계 결정사항

> [!NOTE]
> Phase 1 완료 기준으로 업데이트됨 (2026-04-20)

- **Python 환경**: Python 3.11.9 (winget 설치), 로컬 개발 방식
- **Ollama**: Phase 2로 분리 — Phase 1은 파싱 + 벡터화 + 검색에 집중
- **실행 방식**: 로컬(`uvicorn` + `npm run dev`) 우선, Docker는 배포용
- **파일 형식 우선순위**: Excel > PPT > PDF (모두 Phase 1에 구현 완료)

---

## 아키텍처 개요

```
KnowMine/
├── apps/
│   ├── frontend/          # React 19 + Vite 8 + Tailwind CSS v4
│   └── backend/           # Python 3.11 + FastAPI
├── artifacts/             # 프로젝트 문서 (이 폴더)
├── docker-compose.yml
└── README.md
```

### 데이터 흐름

```
[사용자 파일 업로드 (드래그&드롭)]
        ↓
[FastAPI Background Task]
  - Excel: pandas + openpyxl → 시트별 Markdown, 표 구조·병합셀 보존
  - PPT:   python-pptx → 슬라이드별 Markdown, 노트 포함
  - PDF:   PyMuPDF → 폰트 크기 기반 제목 추론, 테이블 추출
        ↓
[Semantic Chunking]
  - MarkdownHeaderTextSplitter (헤더 기반 1차 분할)
  - RecursiveCharacterTextSplitter (1200자, overlap 150자)
        ↓
[BGE-M3 Local Embedding]
  - sentence-transformers BAAI/bge-m3
  - normalize_embeddings=True (코사인 유사도 최적화)
  - 완전 로컬, 외부 전송 없음
        ↓
[ChromaDB Persistent Storage]
  - 경로: apps/backend/data/chromadb/
  - knowmine_docs 컬렉션 (벡터 + 텍스트)
  - knowmine_meta 컬렉션 (문서 상태 메타데이터)
        ↓
[React Dashboard (localhost:3000)]
  - 드래그&드롭 업로드 + 처리 상태 실시간 표시 (3초 폴링)
  - 문서 카드 (파일 타입·청크 수·처리 시간)
  - 4개 통계 카드 (총 문서·청크·완료·실패)
  - AI 유사도 검색 탭 (BGE-M3 코사인 유사도, top-k)
```

---

## Phase 1 구현 파일 목록

### Backend (`apps/backend/`)

| 파일 | 역할 | 핵심 로직 |
|------|------|-----------|
| `main.py` | FastAPI 앱 진입점 | lifespan으로 ChromaDB 초기화 |
| `models/schemas.py` | Pydantic 모델 | DocumentMeta, ProcessingStatus enum |
| `routers/upload.py` | POST /api/upload | BackgroundTasks로 비동기 파이프라인 |
| `routers/documents.py` | GET/DELETE/검색 | 목록·상태·통계·유사도 검색 |
| `services/parser.py` | 파일 → Markdown | Excel 시트별, PPT 슬라이드별, PDF 페이지별 |
| `services/chunker.py` | Semantic chunking | 헤더 기반 1차 + 재귀 2차 분할 |
| `services/embedder.py` | BGE-M3 임베딩 | 싱글턴 모델, 배치 처리 |
| `services/vector_store.py` | ChromaDB CRUD | upsert, 메타 컬렉션 분리 관리 |

### Frontend (`apps/frontend/src/`)

| 파일 | 역할 |
|------|------|
| `pages/Dashboard.jsx` | 메인 페이지 (폴링·상태 관리) |
| `components/UploadZone.jsx` | 드래그&드롭 업로드 |
| `components/DocumentCard.jsx` | 문서 상태 카드 |
| `components/StatsPanel.jsx` | 4개 통계 카드 |
| `components/ProcessingLog.jsx` | 실시간 로그 |
| `components/SearchPanel.jsx` | AI 유사도 검색 |
| `api/client.js` | FastAPI 통신 함수 |

---

## API 엔드포인트 요약

| 메서드 | 경로 | 요청 | 응답 |
|--------|------|------|------|
| POST | `/api/upload` | `multipart/form-data` file | `{doc_id, filename, status}` |
| GET | `/api/documents` | — | `DocumentResponse[]` |
| GET | `/api/documents/{id}` | — | `DocumentResponse` |
| DELETE | `/api/documents/{id}` | — | `{message}` |
| GET | `/api/stats` | — | `StatsResponse` |
| POST | `/api/search` | `{query, top_k, doc_id?}` | `SearchResult[]` |
| GET | `/health` | — | `{status: "ok"}` |

---

## 알려진 이슈 / 주의사항

> [!WARNING]
> **BGE-M3 첫 실행**: 모델 첫 다운로드 시 약 1.5GB, 5~10분 소요. 인터넷 필요.

> [!NOTE]
> **IDE lint 경고**: venv 내 패키지를 IDE가 인식 못할 때 `chromadb`, `sentence_transformers` 미인식 경고 발생. 실행에는 무관.

> [!NOTE]
> **`from __future__ import annotations`**: Python 3.11에서 `X | None` union 타입 힌트 런타임 오류 방지를 위해 추가됨.

> [!NOTE]
> **ChromaDB telemetry 경고**: `posthog capture()` 관련 경고 메시지는 무시 가능. 동작에 영향 없음.

---

## Verification Plan

### 완료된 검증
- [x] 프론트엔드 UI 렌더링 (localhost:3000)
- [x] 백엔드 서버 실행 (Python 3.11.9 + uvicorn)
- [x] ChromaDB 초기화 및 컬렉션 생성
- [x] 프론트-백 API 연결 (통계·문서목록 API 정상 응답)

### 미완료 검증
- [ ] 실제 Excel 파일 업로드 → 파이프라인 E2E 테스트
- [ ] BGE-M3 임베딩 정상 동작 확인
- [ ] ChromaDB 영속성 확인 (서버 재시작 후 데이터 유지)
- [ ] AI 검색 정확도 확인
