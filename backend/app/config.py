from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    qdrant_url: str = ""
    qdrant_api_key: str = ""
    collection_name: str = "vivaproof_chunks"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_size: int = 384
    chunk_size: int = 180
    chunk_overlap: int = 30
    top_k: int = 5
    max_upload_mb: int = 15

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
