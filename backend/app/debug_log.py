"""Debug session logging (NDJSON). Session 834be7."""

from __future__ import annotations

import json
import time
from pathlib import Path
from urllib.parse import urlparse

LOG_PATH = Path(__file__).resolve().parents[2] / "debug-834be7.log"
SESSION_ID = "834be7"


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
    payload = {
        "sessionId": SESSION_ID,
        "timestamp": int(time.time() * 1000),
        "location": location,
        "message": message,
        "data": data or {},
        "hypothesisId": hypothesis_id,
        "runId": run_id,
    }
    # #region agent log
    with LOG_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(payload, default=str) + "\n")
    # #endregion


def supabase_context(settings) -> dict:
    return {
        "projectRef": _project_ref(settings.supabase_url or ""),
        "hasUrl": bool(settings.supabase_url),
        "hasServiceRole": bool(settings.supabase_service_role_key),
    }
