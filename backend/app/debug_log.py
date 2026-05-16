"""Optional debug logging (disabled in production)."""

from __future__ import annotations

import json
import time
from pathlib import Path
from urllib.parse import urlparse

from app.config import get_settings

LOG_PATH = Path(__file__).resolve().parents[2] / "debug-834be7.log"
SESSION_ID = "834be7"


def _enabled() -> bool:
    return not get_settings().is_production


def _project_ref(url: str) -> str:
    try:
        host = urlparse(url).hostname or ""
        return host.split(".")[0] if host else "unknown"
    except Exception:
        return "unknown"


def debug_log(
    location: str,
    message: str,
    data: dict | None = None,
    *,
    hypothesis_id: str | None = None,
    run_id: str = "pre-fix",
) -> None:
    if not _enabled():
        return
    payload = {
        "sessionId": SESSION_ID,
        "timestamp": int(time.time() * 1000),
        "location": location,
        "message": message,
        "data": data or {},
        "hypothesisId": hypothesis_id,
        "runId": run_id,
    }
    with LOG_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(payload, default=str) + "\n")


def supabase_context(settings) -> dict:
    return {
        "projectRef": _project_ref(settings.supabase_url or ""),
        "hasUrl": bool(settings.supabase_url),
        "hasServiceRole": bool(settings.supabase_service_role_key),
    }
