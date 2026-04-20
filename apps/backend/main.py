from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from routers import upload, documents
from services.vector_store import initialize_chroma


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작 시 ChromaDB 초기화"""
    initialize_chroma()
    print("✅ ChromaDB initialized")
    yield
    print("🛑 Server shutting down")


app = FastAPI(
    title="KnowMine API",
    description="AI 기반 사내 지식 자산화 플랫폼 백엔드",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — React 개발 서버 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(documents.router, prefix="/api", tags=["documents"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "KnowMine Backend"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
