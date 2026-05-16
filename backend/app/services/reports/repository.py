from __future__ import annotations

from postgrest.exceptions import APIError

from app.db import get_supabase
from app.db.supabase_errors import is_missing_table_error
from app.db.supabase_response import response_data


class ReportRepository:
    def __init__(self) -> None:
        self.client = get_supabase()

    def create(
        self,
        *,
        reporter_id: str,
        target_type: str,
        target_id: str,
        reason: str | None,
    ) -> dict | None:
        row = {
            "reporter_id": reporter_id,
            "target_type": target_type,
            "target_id": target_id,
            "reason": (reason or "").strip() or None,
            "status": "pending",
        }
        try:
            result = self.client.table("content_reports").insert(row).execute()
        except APIError as exc:
            if is_missing_table_error(exc, "content_reports"):
                return None
            raise
        data = response_data(result)
        if isinstance(data, list):
            return data[0] if data else None
        return data

    def list_pending(self, *, limit: int = 50, offset: int = 0) -> list[dict]:
        try:
            end = offset + limit - 1
            result = (
                self.client.table("content_reports")
                .select("*")
                .eq("status", "pending")
                .order("created_at", desc=True)
                .range(offset, end)
                .execute()
            )
        except APIError as exc:
            if is_missing_table_error(exc, "content_reports"):
                return []
            raise
        return list(response_data(result) or [])

    def update_status(self, report_id: str, status: str) -> dict | None:
        try:
            result = (
                self.client.table("content_reports")
                .update({"status": status})
                .eq("id", report_id)
                .execute()
            )
        except APIError as exc:
            if is_missing_table_error(exc, "content_reports"):
                return None
            raise
        data = response_data(result)
        if isinstance(data, list):
            return data[0] if data else None
        return data
