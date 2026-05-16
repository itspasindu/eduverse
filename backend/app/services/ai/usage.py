"""Daily AI usage caps per user (DB-backed)."""

from __future__ import annotations

from datetime import date, datetime, timezone

from fastapi import HTTPException, status
from postgrest.exceptions import APIError

from app.config import get_settings
from app.db import get_supabase
from app.db.supabase_errors import is_missing_table_error
from app.db.supabase_response import response_data
from app.models.enums import UserRole


def _cap_for_role(role: UserRole) -> int:
    settings = get_settings()
    if role in (UserRole.ADMIN, UserRole.TEACHER):
        return 0  # unlimited
    if role == UserRole.CREATOR:
        return settings.ai_daily_cap_creator
    return settings.ai_daily_cap_student


def check_and_increment_ai_usage(user_id: str, role: UserRole) -> None:
    cap = _cap_for_role(role)
    if cap <= 0:
        return

    today = date.today().isoformat()
    client = get_supabase()
    try:
        result = (
            client.table("ai_usage_daily")
            .select("request_count")
            .eq("user_id", user_id)
            .eq("usage_date", today)
            .maybe_single()
            .execute()
        )
    except APIError as exc:
        if is_missing_table_error(exc, "ai_usage_daily"):
            return
        raise

    row = response_data(result)
    current = int(row.get("request_count") or 0) if row else 0
    if current >= cap:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "ai_daily_cap",
                "message": (
                    f"Daily AI limit reached ({cap} requests). "
                    "Try again tomorrow."
                ),
            },
        )

    now = datetime.now(timezone.utc).isoformat()
    try:
        client.table("ai_usage_daily").upsert(
            {
                "user_id": user_id,
                "usage_date": today,
                "request_count": current + 1,
                "updated_at": now,
            },
            on_conflict="user_id,usage_date",
        ).execute()
    except APIError as exc:
        if is_missing_table_error(exc, "ai_usage_daily"):
            return
        raise
