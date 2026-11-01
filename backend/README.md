# VivaProof AI Backend

FastAPI service for document ingestion, semantic retrieval, and grounded generation.

```bash
python -m venv .venv
.venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

First startup downloads the Sentence Transformers embedding model. Qdrant persists locally under `data/qdrant`. Never commit `.env` or the local vector database.
