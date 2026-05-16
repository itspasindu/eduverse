"""Validate Supabase-issued JWTs and extract user claims."""

from typing import Any

import jwt
from jwt.exceptions import InvalidTokenError

from app.config import get_settings


def decode_supabase_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    if not settings.supabase_jwt_secret:
        raise ValueError("Supabase JWT secret not configured")

    try:
        return jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except InvalidTokenError:
        return jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )


def validate_token_via_supabase_api(token: str) -> dict[str, Any]:
    """Verify token with Supabase Auth API (works when JWT secret mismatches)."""
    from app.db.client import get_supabase

    client = get_supabase()
    response = client.auth.get_user(token)
    user = response.user if response else None
    if not user:
        raise ValueError("Invalid or expired Supabase token")

    return {
        "sub": user.id,
        "email": user.email,
        "user_metadata": user.user_metadata or {},
        "app_metadata": user.app_metadata or {},
    }


def validate_supabase_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    last_error: Exception | None = None

    if settings.supabase_jwt_secret:
        try:
            payload = decode_supabase_token(token)
            if payload.get("sub"):
                return payload
        except (InvalidTokenError, ValueError) as exc:
            last_error = exc

    try:
        return validate_token_via_supabase_api(token)
    except ValueError:
        if last_error:
            raise ValueError("Invalid or expired Supabase token") from last_error
        raise


def claims_to_user_fields(payload: dict[str, Any]) -> dict[str, Any]:
    metadata = payload.get("user_metadata") or {}
    app_metadata = payload.get("app_metadata") or {}
    role = app_metadata.get("role") or metadata.get("role") or "student"
    return {
        "id": str(payload["sub"]),
        "email": (payload.get("email") or metadata.get("email") or "").lower(),
        "role": role,
        "full_name": metadata.get("full_name") or metadata.get("name"),
    }
