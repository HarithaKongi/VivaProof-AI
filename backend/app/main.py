from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.schemas import ChatRequest, ChatResponse, Citation, SourceDocument, UploadResponse
from app.services import SUPPORTED_EXTENSIONS, delete_document, generate_answer, index_document, list_documents, retrieve

settings = get_settings()
app = FastAPI(
    title="VivaProof AI API",
    description="Evidence-grounded RAG for software project understanding.",
    version="0.2.0",
)

# The API is public and does not use cookie-based authentication.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"service": "VivaProof AI API", "docs": "/docs"}


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "VivaProof AI",
        "vector_store_configured": bool(settings.qdrant_url and settings.qdrant_api_key),
        "generation": "gemini" if settings.gemini_api_key else "retrieval-only",
    }


@app.post("/api/documents/upload", response_model=UploadResponse)
async def upload_documents(files: list[UploadFile] = File(...)):
    uploaded, errors = [], []
    for file in files:
        filename = Path(file.filename or "upload").name
        if Path(filename).suffix.lower() not in SUPPORTED_EXTENSIONS:
            errors.append(f"{filename}: unsupported file type")
            continue
        content = await file.read()
        if len(content) > settings.max_upload_mb * 1024 * 1024:
            errors.append(f"{filename}: exceeds {settings.max_upload_mb} MB limit")
            continue
        try:
            uploaded.append(SourceDocument(**index_document(filename, content)))
        except Exception as exc:
            errors.append(f"{filename}: {exc}")
    if not uploaded:
        raise HTTPException(status_code=400, detail="No files indexed. " + "; ".join(errors))
    message = f"Indexed {len(uploaded)} file(s)."
    if errors:
        message += " Skipped: " + "; ".join(errors)
    return UploadResponse(uploaded=uploaded, message=message)


@app.get("/api/documents", response_model=list[SourceDocument])
def documents():
    try:
        return [SourceDocument(**item) for item in list_documents()]
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.delete("/api/documents/{document_id}")
def remove_document(document_id: str):
    try:
        delete_document(document_id)
        return {"deleted": True, "document_id": document_id}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    try:
        citations = retrieve(request.question, request.top_k)
        answer, mode = generate_answer(request.question, citations)
        return ChatResponse(answer=answer, citations=[Citation(**item) for item in citations], mode=mode)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"RAG request failed: {exc}") from exc
