"""Supabase JWT verification for protected VivaProof API routes."""
from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient, PyJWTError

from app.config import get_settings

bearer = HTTPBearer(auto_error=False)


@lru_cache
def _jwks_client(url: str) -> PyJWKClient:
    return PyJWKClient(url, cache_keys=True, lifespan=3600)


def require_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> str:
    settings = get_settings()
    if not settings.supabase_url:
        raise HTTPException(status_code=503, detail="Authentication is not configured on the API.")
    if credentials is None:
        raise HTTPException(status_code=401, detail="Sign in to continue.")
    issuer = settings.supabase_url.rstrip("/") + "/auth/v1"
    jwks_url = issuer + "/.well-known/jwks.json"
    try:
        signing_key = _jwks_client(jwks_url).get_signing_key_from_jwt(credentials.credentials)
        payload = jwt.decode(
            credentials.credentials,
            signing_key.key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
            issuer=issuer,
            options={"require": ["exp", "iat", "sub", "iss", "aud"]},
        )
        user_id = payload.get("sub")
        if not isinstance(user_id, str) or not user_id:
            raise PyJWTError("Missing subject")
        return user_id
    except (PyJWTError, Exception) as exc:
        # Do not leak token-validation details to callers.
        raise HTTPException(status_code=401, detail="Your session is invalid or expired. Please sign in again.") from exc
