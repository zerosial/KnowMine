# KnowMine Phase 1 — Task List

## Backend ✅
- [x] 프로젝트 기본 구조 생성 (monorepo apps/backend + apps/frontend)
- [x] `requirements.txt` 작성 (FastAPI, pandas, PyMuPDF, sentence-transformers, chromadb 등)
- [x] `main.py` FastAPI 앱 진입점 (lifespan, CORS, 라우터 등록)
- [x] `schemas.py` Pydantic 모델 (DocumentMeta, ProcessingStatus, StatsResponse 등)
- [x] `parser.py` — Excel/PPT/PDF → Markdown 변환 (표 구조·계층 보존)
- [x] `chunker.py` — Semantic chunking (헤더→재귀 2단계)
- [x] `embedder.py` — BGE-M3 로컬 임베딩 (싱글턴 패턴)
- [x] `vector_store.py` — ChromaDB CRUD (docs + meta 컬렉션 분리)
- [x] `routers/upload.py` — POST /api/upload + BackgroundTask 파이프라인
- [x] `routers/documents.py` — GET /api/documents, stats, search, DELETE

## Frontend ✅
- [x] React 19 + Vite 8 프로젝트 초기화
- [x] Tailwind CSS v4 (@tailwindcss/vite 플러그인)
- [x] `UploadZone.jsx` — 드래그&드롭 업로드 (파일 타입 배지)
- [x] `DocumentCard.jsx` — 문서 상태 카드 (타입 아이콘, 상태 배지, 삭제)
- [x] `StatsPanel.jsx` — 4개 통계 카드 (글로우 이펙트)
- [x] `ProcessingLog.jsx` — 실시간 처리 로그
- [x] `SearchPanel.jsx` — AI 유사도 검색 (유사도 퍼센트 표시)
- [x] `Dashboard.jsx` — 메인 페이지 (폴링, 탭, 배경 블롭)
- [x] `api/client.js` — FastAPI 통신 함수

## Infra ✅
- [x] `docker-compose.yml` (backend + frontend 서비스)
- [x] `apps/backend/Dockerfile` (Python 3.11-slim)
- [x] `apps/frontend/Dockerfile` (멀티스테이지 빌드 + nginx)
- [x] `apps/frontend/nginx.conf` (SPA + API 프록시)
- [x] `.gitignore` (.venv, node_modules, ChromaDB 데이터, 모델 캐시 제외)
- [x] 루트 `README.md` 완전 업데이트 (실행 가이드, API, 로드맵)

## 환경 설정 ✅
- [x] Python 3.11.9 설치 (winget)
- [x] `.venv` 가상환경 생성
- [x] pip 패키지 전체 설치 (PyTorch, sentence-transformers, chromadb 포함)
- [x] 백엔드 서버 실행 확인 (localhost:8000)
- [x] 프론트엔드 서버 실행 확인 (localhost:3000)
- [x] 프론트-백 API 연결 확인 (통계 API 0값 정상 응답)

## E2E 테스트 (완료) ✅
- [x] 실제 Excel/PDF 파일 업로드 → 파이프라인 전체 동작 확인
- [x] BGE-M3 모델 다운로드 및 임베딩 동작 확인
- [x] ChromaDB 영속성 확인 (재시작 후 데이터 유지)
- [x] AI 검색 쿼리 → 유사 청크 반환 확인
- [x] 검색 결과(청크) UI상 마크다운 분할 및 본문 누락 버그 해결
- [x] 문서 메타 및 청크 완전 삭제 기능(DELETE) 및 인라인 확인 UI 추가

## Phase 2 계획 (미착수)
- [ ] Ollama 설치 및 연동 (AI 3줄 자동 요약)
- [ ] UMAP 벡터 공간 2D 시각화 (scatter plot)
- [ ] 문서 간 관계 그래프
- [ ] 검색 결과 컨텍스트 하이라이팅
- [ ] 다중 파일 배치 업로드
