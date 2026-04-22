from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum


class ProcessingStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class FileType(str, Enum):
    EXCEL = "excel"
    PPT = "ppt"
    PDF = "pdf"
    MD = "md"
    TXT = "txt"
    UNKNOWN = "unknown"


class DocumentMeta(BaseModel):
    """ChromaDB에 저장되는 문서 메타데이터"""
    doc_id: str
    filename: str
    file_type: FileType
    status: ProcessingStatus
    category: str = "default"
    total_chunks: int = 0
    uploaded_at: str
    processed_at: Optional[str] = None
    error_message: Optional[str] = None
    file_size: int = 0


class DocumentResponse(BaseModel):
    """API 응답용 문서 정보"""
    doc_id: str
    filename: str
    file_type: str
    status: str
    category: str = "default"
    total_chunks: int
    uploaded_at: str
    processed_at: Optional[str] = None
    error_message: Optional[str] = None
    file_size: int


class UploadResponse(BaseModel):
    """업로드 API 응답"""
    doc_id: str
    filename: str
    message: str
    status: str
    category: str


class StatsResponse(BaseModel):
    """통계 API 응답"""
    total_documents: int
    total_chunks: int
    completed_documents: int
    processing_documents: int
    failed_documents: int
    by_file_type: dict
