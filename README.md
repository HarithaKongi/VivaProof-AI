# VivaProof AI

**Evidence-based AI for software project understanding and verification.**

VivaProof AI is an explainable Retrieval-Augmented Generation (RAG) workspace. Upload project documents, index them locally, ask questions, and inspect the retrieved evidence behind every answer.

## Current MVP
- PDF, DOCX, TXT and Markdown ingestion.
- Text extraction, overlapping chunking and source metadata.
- Semantic embeddings with Sentence Transformers.
- Persistent local vector search using Qdrant.
- Optional Gemini generation with source-grounded prompting.
- Citation cards showing source file, page/chunk, similarity score and excerpt.
- React + TypeScript dashboard.

## Architecture
```
React UI -> FastAPI -> Extraction -> Chunking -> Sentence Transformers
                               -> Qdrant (local persistent storage)
Question -> Query embedding -> Similarity retrieval -> Gemini (optional)
                                                -> Answer + evidence citations
```

## Requirements
- Python 3.11+
- Node.js 20+
- Gemini API key for generated answers (optional; retrieval-only mode works without it)

## Run locally

### Backend (Windows PowerShell)
```powershell
cd backend
python -m venv .venv
.venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

### Backend (macOS/Linux)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

API: http://localhost:8000 · Interactive docs: http://localhost:8000/docs

### Frontend
Open a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173.

### Enable Gemini (optional)
Add your key to `backend/.env`:
```env
GEMINI_API_KEY=your_key_here
```
Never commit real API keys. Without a key, the app still indexes files and returns ranked evidence excerpts without pretending to generate an AI answer.

## API endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | API and generation-mode status |
| POST | `/api/documents/upload` | Upload and index documents |
| GET | `/api/documents` | List indexed documents |
| DELETE | `/api/documents/{document_id}` | Remove a document's vectors |
| POST | `/api/chat` | Retrieve evidence and answer a question |

## Current limitations
- Scanned/image-only PDFs need OCR; OCR is not included yet.
- Qdrant currently runs in local persistent mode, suitable for development.
- DOCX extraction currently reads paragraph text; tables and embedded objects need a future parser enhancement.
- The current MVP does not yet ingest Git repositories or perform code-aware parsing.
- Evidence retrieval and generated answers assist review; they do not certify project correctness.

## Roadmap
- [x] Document ingestion, chunking, embeddings and vector retrieval
- [x] Optional grounded Gemini responses and source citations
- [x] Initial React dashboard
- [ ] Automated tests and retrieval evaluation
- [ ] GitHub repository ingestion and code-aware parsing
- [ ] Hybrid search, query rewriting and reranking
- [ ] Claim/evidence matrix and contradiction analysis
- [ ] Viva question generator
- [ ] Authentication, hosted vector database and deployment

## License
MIT
