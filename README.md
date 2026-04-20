# KnowMine 🧠

> **AI 기반 사내 지식 자산화 플랫폼** — Local First · 완전 보안 처리 · 오프라인 동작

SI/통신사 프로젝트에서 발생하는 비정형 문서(Excel, PPT, PDF)를 로컬 AI(RAG)로 처리해  
검색 가능한 지식 자산으로 전환합니다. 데이터는 외부로 절대 전송되지 않습니다.

---

## 📁 프로젝트 구조

```
KnowMine/
├── apps/
│   ├── backend/          # Python (FastAPI) — 문서 파싱 + 벡터 저장 API
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   ├── routers/      # upload.py · documents.py
│   │   ├── services/     # parser · chunker · embedder · vector_store
│   │   ├── models/       # Pydantic 스키마
│   │   └── data/         # ChromaDB 영속성 저장소 (자동 생성, git 제외)
│   └── frontend/         # React 19 + Vite 8 + Tailwind CSS v4
│       └── src/
│           ├── pages/    # Dashboard.jsx
│           ├── components/ # UploadZone · DocumentCard · StatsPanel 등
│           └── api/      # FastAPI 통신 클라이언트
├── artifacts/            # 프로젝트 문서 (구현 계획, 로드맵, 작업 목록)
├── docker-compose.yml
└── README.md
```

---

## ⚙️ 기술 스택

| 레이어 | 기술 |
|--------|------|
| Frontend | React 19 · Vite 8 · Tailwind CSS v4 |
| Backend | FastAPI · Uvicorn |
| 파서 | PyMuPDF · pandas · python-pptx |
| 임베딩 | **BGE-M3** (BAAI/bge-m3) — 완전 로컬 실행 |
| 벡터 DB | **ChromaDB** (영속성 파일 모드) |
| 청킹 | LangChain MarkdownHeaderTextSplitter |
| Infra | Docker · Docker Compose |

---

## 🚀 빠른 시작 (로컬 개발)

### 사전 요구사항

- **Python 3.11+** — `winget install Python.Python.3.11`
- **Node.js 20+** — `winget install OpenJS.NodeJS.LTS`
- 첫 실행 시 BGE-M3 모델 자동 다운로드 (~1.5 GB, HuggingFace)

---

### 1. 저장소 클론

```bash
git clone https://github.com/YOUR_USERNAME/KnowMine.git
cd KnowMine
```

---

### 2. 백엔드 실행

```bash
cd apps/backend

# 가상환경 생성 (최초 1회)
python -m venv .venv

# 활성화 (Windows PowerShell)
.venv\Scripts\Activate.ps1

# 패키지 설치 (최초 1회, 약 5~10분)
pip install -r requirements.txt

# 서버 시작
uvicorn main:app --reload --port 8000
```

> **첫 파일 업로드 시** BGE-M3 모델이 `~/.cache/huggingface/` 에 자동 다운로드됩니다.  
> 이후 실행부터는 즉시 로드됩니다.

백엔드 확인:
- API 서버: http://localhost:8000
- Swagger UI (자동 문서): http://localhost:8000/docs
- 헬스체크: http://localhost:8000/health

---

### 3. 프론트엔드 실행

```bash
# 새 터미널에서
cd apps/frontend

# 패키지 설치 (최초 1회)
npm install

# 개발 서버 시작
npm run dev
```

대시보드: **http://localhost:3000**

---

## 📤 사용 방법

### 문서 업로드 및 벡터화

1. 브라우저에서 `http://localhost:3000` 접속
2. 왼쪽 **문서 업로드** 영역에 파일을 드래그&드롭 또는 클릭하여 선택
3. 지원 형식: **Excel** (`.xlsx`, `.xls`), **PowerPoint** (`.pptx`), **PDF**
4. 상태 표시:
   - 🟡 **대기중** → 🔵 **처리중** → ✅ **완료** / ❌ **실패**
5. 완료 시 문서 카드에 청크 수가 표시됩니다

### 처리 파이프라인 (내부 동작)

```
파일 업로드
  → 파일 형식 감지 (Excel / PPT / PDF)
  → Markdown 변환 (표 구조·계층 보존)
  → Semantic Chunking (1200자 단위, 150자 오버랩)
  → BGE-M3 로컬 임베딩 (외부 전송 없음)
  → ChromaDB 영속성 저장
```

### AI 검색

1. 오른쪽 상단 **AI 검색** 탭 클릭
2. 자연어로 검색: 예) `"TC 시나리오 중 결제 오류 관련"`
3. 유사도 순으로 청크 결과가 표시됩니다 (BGE-M3 코사인 유사도)

---

## 🐳 Docker 실행

```bash
# 전체 서비스 빌드 및 실행
docker-compose up --build

# 백그라운드 실행
docker-compose up -d --build
```

| 서비스 | 주소 |
|--------|------|
| 프론트엔드 | http://localhost:3000 |
| 백엔드 API | http://localhost:8000 |
| API 문서 | http://localhost:8000/docs |

> ⚠️ Docker 빌드 시 BGE-M3 모델이 이미지에 포함됩니다 (이미지 크기 약 5GB).

---

## 🔌 API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/api/upload` | 파일 업로드 및 처리 시작 |
| `GET` | `/api/documents` | 전체 문서 목록 (상태 포함) |
| `GET` | `/api/documents/{id}` | 특정 문서 상세 조회 |
| `DELETE` | `/api/documents/{id}` | 문서 및 청크 삭제 |
| `GET` | `/api/stats` | 전체 통계 (문서 수·청크 수) |
| `POST` | `/api/search` | 자연어 유사도 검색 |
| `GET` | `/health` | 서버 상태 확인 |

### 검색 API 예시

```bash
curl -X POST http://localhost:8000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "TC 시나리오 결제 오류", "top_k": 5}'
```

---

## 🗺️ 로드맵

### ✅ Phase 1 — 완료
- [x] 문서 파싱 (Excel / PPT / PDF → Markdown)
- [x] BGE-M3 로컬 임베딩 + ChromaDB 저장
- [x] 대시보드 UI (업로드 · 상태 카드 · 통계 · AI 검색)

### 🔜 Phase 2 — 예정
- [ ] Ollama 연동 — 문서 AI 3줄 자동 요약
- [ ] UMAP 벡터 공간 2D 시각화
- [ ] 문서 간 관계 그래프 뷰
- [ ] 검색 결과 컨텍스트 하이라이팅
- [ ] 다중 파일 배치 업로드

### 🔮 Phase 3 — 계획
- [ ] AI 채팅 인터페이스 (RAG Q&A)
- [ ] 문서 버전 관리
- [ ] 팀 공유 기능 (멀티유저)

---

## 📂 데이터 저장 위치

| 데이터 | 경로 | 비고 |
|--------|------|------|
| 벡터 DB | `apps/backend/data/chromadb/` | git 제외, 서버 재시작 후에도 유지 |
| BGE-M3 모델 | `~/.cache/huggingface/` | 자동 다운로드 |
| 업로드 임시 파일 | `apps/backend/uploads/` | git 제외 |

---

## 🛠️ 개발 관련

### 백엔드 개발 참고

```bash
# API 문서 (Swagger)
open http://localhost:8000/docs

# 로그 실시간 확인
uvicorn main:app --reload --port 8000 --log-level debug
```

### 프론트엔드 개발 참고

```bash
# 빌드 검증
npm run build

# 의존성 최신화
npm update
```

---

## 📄 프로젝트 문서

`artifacts/` 폴더에서 상세 문서를 확인할 수 있습니다:

| 파일 | 내용 |
|------|------|
| `artifacts/implementation_plan.md` | 전체 아키텍처 설계 및 결정사항 |
| `artifacts/task.md` | Phase별 작업 목록 및 진행 상태 |
| `artifacts/project_context.md` | AI 보조 개발을 위한 프로젝트 컨텍스트 |
