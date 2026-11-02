"""RAG pipeline using Qdrant Cloud's hosted embeddings to keep the API lightweight."""
from __future__ import annotations

import hashlib
import time
import uuid
from pathlib import Path
from typing import Any

from docx import Document as DocxDocument
from pypdf import PdfReader
from qdrant_client import QdrantClient, models

from app.config import get_settings

settings = get_settings()
SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md"}
_client: QdrantClient | None = None
_gemini_client: Any = None


def vector_db() -> QdrantClient:
    global _client
    qdrant_url = settings.qdrant_url.strip()
    qdrant_api_key = settings.qdrant_api_key.strip()
    if not qdrant_url or not qdrant_api_key:
        raise RuntimeError(
            "Vector database is not configured. Add QDRANT_URL and QDRANT_API_KEY in the backend environment."
        )
    if _client is None:
        _client = QdrantClient(
            url=qdrant_url, api_key=qdrant_api_key, cloud_inference=True, timeout=45
        )
        if not _client.collection_exists(settings.collection_name):
            _client.create_collection(
                collection_name=settings.collection_name,
                vectors_config=models.VectorParams(
                    size=settings.embedding_size, distance=models.Distance.COSINE
                ),
            )
    return _client


def extract_file(filename: str, content: bytes) -> list[dict[str, Any]]:
    suffix = Path(filename).suffix.lower()
    if suffix not in SUPPORTED_EXTENSIONS:
        raise ValueError(f"Unsupported file type: {suffix or 'unknown'}")
    if suffix == ".pdf":
        import io
        reader = PdfReader(io.BytesIO(content))
        return [{"text": page.extract_text() or "", "page": i + 1}
                for i, page in enumerate(reader.pages)]
    if suffix == ".docx":
        import io
        document = DocxDocument(io.BytesIO(content))
        text = "\n".join(p.text for p in document.paragraphs if p.text.strip())
        return [{"text": text, "page": None}]
    return [{"text": content.decode("utf-8", errors="replace"), "page": None}]


def chunk_text(text: str, size: int | None = None, overlap: int | None = None) -> list[str]:
    size = size or settings.chunk_size
    overlap = settings.chunk_overlap if overlap is None else overlap
    if size < 1 or overlap < 0 or overlap >= size:
        raise ValueError("Chunk overlap must be non-negative and smaller than chunk size.")
    words = text.split()
    chunks: list[str] = []
    start = 0
    while start < len(words):
        end = min(start + size, len(words))
        chunks.append(" ".join(words[start:end]))
        if end == len(words):
            break
        start = end - overlap
    return chunks


def index_document(filename: str, content: bytes) -> dict[str, Any]:
    document_id = str(uuid.uuid4())
    pages = extract_file(filename, content)
    records: list[dict[str, Any]] = []
    for page in pages:
        for chunk in chunk_text(page["text"]):
            records.append({"text": chunk, "page": page["page"], "chunk_index": len(records)})
    if not records:
        raise ValueError("No readable text found. Scanned PDFs need OCR before indexing.")
    client = vector_db()
    points = [
        models.PointStruct(
            id=str(uuid.uuid4()),
            vector=models.Document(text=record["text"], model=settings.embedding_model),
            payload={**record, "document_id": document_id, "filename": filename,
                     "content_hash": hashlib.sha256(content).hexdigest()},
        )
        for record in records
    ]
    client.upload_points(
        collection_name=settings.collection_name, points=points, batch_size=8, wait=True
    )
    return {"document_id": document_id, "filename": filename, "chunks": len(records),
            "characters": sum(len(r["text"]) for r in records)}


def list_documents() -> list[dict[str, Any]]:
    client = vector_db()
    documents: dict[str, dict[str, Any]] = {}
    offset = None
    while True:
        points, offset = client.scroll(
            collection_name=settings.collection_name, limit=256, offset=offset,
            with_payload=True, with_vectors=False,
        )
        for point in points:
            payload = point.payload or {}
            doc_id = payload.get("document_id")
            if doc_id:
                item = documents.setdefault(doc_id, {
                    "document_id": doc_id, "filename": payload.get("filename", "Unknown"),
                    "chunks": 0, "characters": 0,
                })
                item["chunks"] += 1
                item["characters"] += len(payload.get("text", ""))
        if offset is None:
            break
    return list(documents.values())


def delete_document(document_id: str) -> None:
    from qdrant_client.models import Filter, FieldCondition, MatchValue
    vector_db().delete(
        collection_name=settings.collection_name,
        points_selector=models.FilterSelector(filter=Filter(must=[
            FieldCondition(key="document_id", match=MatchValue(value=document_id))
        ])),
    )


def retrieve(question: str, top_k: int | None = None) -> list[dict[str, Any]]:
    response = vector_db().query_points(
        collection_name=settings.collection_name,
        query=models.Document(text=question, model=settings.embedding_model),
        limit=top_k or settings.top_k,
        with_payload=True,
    )
    return [{
        "document_id": (p.payload or {}).get("document_id", ""),
        "filename": (p.payload or {}).get("filename", "Unknown"),
        "page": (p.payload or {}).get("page"),
        "chunk_index": (p.payload or {}).get("chunk_index", 0),
        "score": float(p.score or 0),
        "excerpt": (p.payload or {}).get("text", ""),
    } for p in response.points]


def _is_temporary_model_error(exc: Exception) -> bool:
    """Retry only transient Gemini rate-limit and server errors."""
    status = getattr(exc, "status_code", None) or getattr(exc, "code", None)
    message = str(exc).lower()
    return status in (429, 500, 502, 503, 504) or any(
        marker in message for marker in ("503 unavailable", "429 resource_exhausted",
                                         "500 internal", "502 bad gateway", "504 deadline")
    )


def generate_answer(question: str, citations: list[dict[str, Any]]) -> tuple[str, str]:
    if not citations:
        return "No indexed evidence was found. Upload relevant project files and try again.", "no_evidence"
    if not settings.gemini_api_key:
        excerpts = "\n\n".join(
            f"[{i + 1}] {c['filename']}: {c['excerpt'][:900]}"
            for i, c in enumerate(citations)
        )
        return ("Gemini is not configured. Retrieval-only mode returned these passages; "
                "they are evidence, not a generated conclusion:\n\n" + excerpts, "retrieval_only")

    global _gemini_client
    if _gemini_client is None:
        from google import genai
        _gemini_client = genai.Client(api_key=settings.gemini_api_key.strip())
    context = "\n\n".join(
        f"[Source {i + 1}: {c['filename']}, page {c['page'] or 'N/A'}]\n{c['excerpt']}"
        for i, c in enumerate(citations)
    )
    prompt = f"""You are VivaProof AI, an evidence-grounded assistant for software projects.
Use ONLY the evidence below. If evidence is insufficient, clearly say what is missing.
Never invent files, implementation details, test results, or citations.
Cite supported claims inline as [Source 1], [Source 2]. Distinguish facts from inferences.

QUESTION:
{question}

RETRIEVED EVIDENCE:
{context}
"""
    # Free-tier model capacity can fluctuate. Retry transient 429/5xx errors twice;
    # never retry invalid requests or authentication/configuration failures.
    for attempt in range(3):
        try:
            response = _gemini_client.models.generate_content(
                model=settings.gemini_model, contents=prompt
            )
            return response.text or "The model returned an empty response.", "gemini_rag"
        except Exception as exc:
            if attempt == 2 or not _is_temporary_model_error(exc):
                if _is_temporary_model_error(exc):
                    raise RuntimeError(
                        "Gemini is temporarily busy or rate-limited. Your evidence was retrieved; please retry in a minute."
                    ) from exc
                raise
            time.sleep(1.0 * (2 ** attempt))
    return "Gemini could not generate an answer. Please try again.", "temporary_error"
