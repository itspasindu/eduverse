from __future__ import annotations

from postgrest.exceptions import APIError

from app.db import get_supabase
from app.db.supabase_errors import is_missing_table_error
from app.db.supabase_response import response_data


class AuditRepository:
    def __init__(self) -> None:
        self.client = get_supabase()

    def log(
        self,
        *,
        actor_id: str,
        action: str,
        target_type: str | None = None,
        target_id: str | None = None,
        metadata: dict | None = None,
        ip_address: str | None = None,
    ) -> None:
        row = {
            "actor_id": actor_id,
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "metadata": metadata or {},
            "ip_address": ip_address,
        }
        try:
            self.client.table("audit_events").insert(row).execute()
        except APIError as exc:
            if is_missing_table_error(exc, "audit_events"):
                return
            raise

    def list_recent(self, *, limit: int = 100, offset: int = 0) -> list[dict]:
        try:
            end = offset + limit - 1
            result = (
                self.client.table("audit_events")
                .select("*")
                .order("created_at", desc=True)
                .range(offset, end)
                .execute()
            )
        except APIError as exc:
            if is_missing_table_error(exc, "audit_events"):
                return []
            raise
        return list(response_data(result) or [])
