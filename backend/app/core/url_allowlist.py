"""HTTPS URL host allowlist for user-supplied media links."""

from __future__ import annotations

from urllib.parse import urlparse

from fastapi import HTTPException, status

from app.config import get_settings


def _allowed_hosts() -> frozenset[str]:
    settings = get_settings()
    hosts = {h.strip().lower() for h in settings.allowed_url_hosts if h.strip()}
    if settings.supabase_url:
        try:
            ref = urlparse(settings.supabase_url).hostname or ""
            if ref:
                hosts.add(ref.lower())
                hosts.add(f"{ref.split('.')[0]}.supabase.co".lower())
        except Exception:
            pass
    return frozenset(hosts)


def assert_https_url_allowed(url: str | None, *, field: str = "url") -> None:
    if not url or not str(url).strip():
        return
    parsed = urlparse(str(url).strip())
    if parsed.scheme != "https":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_url",
                "message": f"{field} must use HTTPS from an allowed host.",
            },
        )
    host = (parsed.hostname or "").lower()
    allowed = _allowed_hosts()
    if not host or host not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_url",
                "message": f"{field} host is not allowed.",
            },
        )


def is_https_url_allowed(url: str | None) -> bool:
    if not url or not str(url).strip():
        return False
    try:
        assert_https_url_allowed(url)
        return True
    except HTTPException:
        return False
