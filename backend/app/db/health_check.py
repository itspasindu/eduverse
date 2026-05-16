"""Probe Supabase tables for diagnostics."""

from __future__ import annotations

from postgrest.exceptions import APIError

from app.config import get_settings
from app.db.client import get_supabase
from app.db.supabase_errors import is_missing_table_error
from app.debug_log import debug_log, supabase_context


def probe_table(table: str) -> dict:
    settings = get_settings()
    ctx = supabase_context(settings)
    result = {"table": table, "exists": False, "errorCode": None, "errorMessage": None}

    try:
        client = get_supabase()
        client.table(table).select("id").limit(1).execute()
        result["exists"] = True
    except APIError as exc:
        result["errorCode"] = getattr(exc, "code", None)
        result["errorMessage"] = str(exc)[:200]
        result["missingTable"] = is_missing_table_error(exc, table)
    except Exception as exc:
        result["errorMessage"] = str(exc)[:200]

    # #region agent log
    debug_log(
        "db/health_check.py:probe_table",
        f"Table probe: {table}",
        {**ctx, **result},
        hypothesis_id="A" if table == "profiles" else "B",
    )
    # #endregion

    return result


def probe_all() -> dict:
    profiles = probe_table("profiles")
    posts = probe_table("posts")
    users_legacy = probe_table("users")

    summary = {
        "profiles": profiles,
        "posts": posts,
        "users_legacy": users_legacy,
        "migrationLikelyNeeded": not profiles.get("exists") or not posts.get("exists"),
    }

    # #region agent log
    debug_log(
        "db/health_check.py:probe_all",
        "Database probe summary",
        summary,
        hypothesis_id="C",
    )
    # #endregion

    return summary
