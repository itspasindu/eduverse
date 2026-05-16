"""Helpers for supabase-py execute() responses (None-safe)."""

from __future__ import annotations

from typing import Any


def response_data(result: Any) -> Any:
    """Return .data from a Supabase execute() result, or None if missing/empty."""
    if result is None:
        return None
    return getattr(result, "data", None)
