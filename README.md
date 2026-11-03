# VivaProof AI

**Evidence-grounded project intelligence — ask questions about your documents and inspect the sources behind every answer.**

[![Backend quality checks](https://github.com/HarithaKongi/VivaProof-AI/actions/workflows/backend-tests.yml/badge.svg)](https://github.com/HarithaKongi/VivaProof-AI/actions/workflows/backend-tests.yml)
[![Live application](https://img.shields.io/badge/Live%20Demo-Open%20VivaProof-0ea5e9)](https://vivaproof-ai.onrender.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

VivaProof AI is a Retrieval-Augmented Generation (RAG) workspace for understanding project knowledge. Upload reports, specifications, notes and technical documents; retrieve relevant passages through semantic search; and ask Gemini to produce answers grounded in those passages. Each response includes inspectable source excerpts and document/page metadata.

> **Live demo:** https://vivaproof-ai.onrender.com  
> **API:** https://vivaproof-ai-api.onrender.com  
> **API health:** https://vivaproof-ai-api.onrender.com/api/health  
> **Interactive API docs:** https://vivaproof-ai-api.onrender.com/docs

## What it does

- Upload PDF, DOCX, TXT and Markdown documents.
- Extract text and split it into overlapping chunks.
- Generate semantic embeddings through Qdrant Cloud inference.
- Store and search document chunks in a Qdrant Cloud collection.
- Retrieve the most relevant passages for a question.
- Generate evidence-grounded responses with Gemini.
- Display source file, page/chunk, similarity score and the retrieved excerpt.
- List indexed documents and delete a document with its stored chunks.
- Report retrieval, generation and total request timings.
- Fall back to evidence-only retrieval output when Gemini is not configured.

## Product walkthrough

1. Open the live demo.
2. Upload one or more project documents.
3. Wait for indexing to finish and confirm the files appear in Project Sources.
4. Ask a question about the uploaded material.
5. Inspect the retrieved evidence cards and verify the answer against the original documents.

The live demo uses free-tier hosted services. Free instances may sleep when idle, and model response times or rate limits can vary. A slow first request does not necessarily mean retrieval is slow; the interface reports retrieval and generation timings separately.

## Architecture

```text
                    ┌─────────────────────────┐
                    │ React + TypeScript UI   │
                    └────────────┬────────────┘
                                 │ REST
                    ┌────────────▼────────────┐
                    │ FastAPI application     │
                    └────────────┬────────────┘
                                 │
             ┌───────────────────┴──────────────────┐
             │                                      │
   Document ingestion                         Question answering
             │                                      │
   PDF / DOCX / TXT / MD                           Question
             │                                      │
       Text extraction                       Query embedding
             │                                      │
      Chunking + metadata                           │
             │                                      │
       Qdrant embedding/inference ────────────────► │
             │                                      ▼
       Qdrant Cloud collection ◄──────── Semantic retrieval
                                                    │
                                             Evidence context
                                                    │
                                               Gemini API
                                                    │
                                      Answer + source citations
                                                    │
                                             React evidence UI
```

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, CSS |
| Backend | Python, FastAPI, Pydantic |
| Document parsing | pypdf, python-docx |
| Vector database | Qdrant Cloud |
| Embeddings | Qdrant Cloud Inference — `sentence-transformers/all-MiniLM-L6-v2` |
| Generation | Google Gemini API |
| Hosting | Render |
| Quality checks | pytest, GitHub Actions |

## Repository structure

```text
VivaProof-AI/
├── backend/
│   ├── app/
│   │   ├── config.py
│   │   ├── main.py
│   │   ├── schemas.py
│   │   └── services.py
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   └── package.json
├── .github/
│   └── workflows/
│       └── backend-tests.yml
└── README.md
```

## Run locally

### Prerequisites

- Python 3.11 or newer
- Node.js 20 or newer
- A Qdrant Cloud cluster and API key
- A Gemini API key for generated answers (optional for retrieval-only mode)

### 1. Configure the backend

Windows PowerShell:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

macOS / Linux:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
```

Set these values in `backend/.env`:

```env
QDRANT_URL=https://your-cluster-url
QDRANT_API_KEY=your-qdrant-api-key
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.8-flash
```

Use a model name currently available to your Gemini API account if the configured default is unavailable. Keep credentials private; never commit `.env` or paste secrets into issues.

Start the API:

```bash
uvicorn app.main:app --reload
```

API runs at http://localhost:8000.

### 2. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The frontend's default API URL points to the hosted backend. To use a local backend, create `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:8000
```

Restart Vite after changing environment variables.

## API reference

| Method | Route | Description |
|---|---|---|
| GET | `/` | API service information |
| GET | `/api/health` | Health and configured service status |
| POST | `/api/documents/upload` | Upload and index documents |
| GET | `/api/documents` | List indexed documents |
| DELETE | `/api/documents/{document_id}` | Delete a document and its vectors |
| POST | `/api/chat` | Retrieve evidence and generate an answer |

Example chat request:

```json
{
  "question": "What problem does this project solve?",
  "top_k": 5
}
```

The response includes `answer`, `citations`, `mode` and `timings_ms`. Each citation contains the document ID, filename, page (when available), chunk index, similarity score and excerpt.

## Quality checks

Run the backend tests locally:

```bash
cd backend
python -m pip install -r requirements.txt
python -m pytest -q
```

GitHub Actions runs the backend test suite on pushes and pull requests targeting the main/master branch. Tests cover chunk boundaries, overlap validation, text/Markdown extraction and unsupported file handling. They do not require live Qdrant or Gemini credentials.

## Product experience\n\n- Public landing page with product overview, feature highlights and calls to action.\n- Supabase-powered sign-up, sign-in, email confirmation, password recovery and password update.\n- First-login onboarding and authenticated workspace.\n- Dashboard metrics sourced from the authenticated document index and live API health.\n- Evidence chat, source inspection, document upload/list/delete and account profile settings.\n- Responsive navigation and mobile layouts.\n\n## Current scope and limitations

- Scanned PDFs and image-only documents are not OCR-processed; they need selectable text.
- DOCX extraction currently reads paragraph text, not tables, images or embedded objects.
- The application is document-grounded; it does not yet clone or parse Git repositories.
- Retrieved similarity scores are ranking signals, not calibrated confidence probabilities.
- Generated answers can still be wrong. Always inspect the cited excerpts and original files.
- Free hosting and API quotas can introduce cold starts, latency and rate limits.
- This project is an evidence-assistance tool, not a certification that a software project is secure, correct or complete.

## Release checklist

- [x] Document upload and text extraction (PDF, DOCX, TXT, MD)
- [x] Chunking with overlap and source metadata
- [x] Semantic embeddings and Qdrant vector storage
- [x] Top-k semantic evidence retrieval
- [x] Gemini grounded answer generation
- [x] Source citations and evidence inspection in the UI
- [x] Document listing and deletion
- [x] API health endpoint and request timing metrics
- [x] Friendly handling of transient Gemini service errors
- [x] Backend unit tests and automated GitHub Actions checks
- [x] Local setup instructions, API documentation and limitations
- [ ] OCR for scanned PDFs
- [ ] DOCX table extraction
- [ ] GitHub repository ingestion and code-aware retrieval
- [ ] Hybrid keyword + vector search and reranking
- [ ] Evaluation dataset with retrieval precision/recall metrics
- [x] Supabase authentication, protected API routes and per-user document isolation

The checked items describe the implemented release. Unchecked items are future enhancements, not features currently included.

## License

MIT
