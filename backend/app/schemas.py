from pydantic import BaseModel, Field


class SourceDocument(BaseModel):
    document_id: str
    filename: str
    chunks: int
    characters: int


class UploadResponse(BaseModel):
    uploaded: list[SourceDocument]
    message: str


class ChatRequest(BaseModel):
    question: str = Field(min_length=3, max_length=2000)
    top_k: int | None = Field(default=None, ge=1, le=12)


class Citation(BaseModel):
    document_id: str
    filename: str
    page: int | None = None
    chunk_index: int
    score: float
    excerpt: str


class ChatResponse(BaseModel):
    answer: str
    citations: list[Citation]
    mode: str
    timings_ms: dict[str, int] = Field(default_factory=dict)
