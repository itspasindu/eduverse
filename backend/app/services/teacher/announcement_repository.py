from dataclasses import dataclass
from datetime import datetime

from postgrest.exceptions import APIError

from app.db import get_supabase
from app.db.supabase_errors import is_missing_table_error
from app.db.supabase_response import response_data


@dataclass
class Announcement:
    id: str
    author_id: str
    title: str
    body: str
    created_at: datetime


def _announcement_from_row(row: dict) -> Announcement:
    created = row["created_at"]
    if isinstance(created, str):
        created = datetime.fromisoformat(created.replace("Z", "+00:00"))
    return Announcement(
        id=str(row["id"]),
        author_id=str(row["author_id"]),
        title=row["title"],
        body=row["body"],
        created_at=created,
    )


class AnnouncementRepository:
    def __init__(self):
        self.client = get_supabase()

    def list_recent(self, limit: int = 20) -> list[Announcement]:
        end = limit - 1
        try:
            result = (
                self.client.table("announcements")
                .select("*")
                .order("created_at", desc=True)
                .range(0, end)
                .execute()
            )
        except APIError as exc:
            if is_missing_table_error(exc, "announcements"):
                return []
            raise
        return [_announcement_from_row(r) for r in response_data(result) or []]

    def list_by_author(self, author_id: str, limit: int = 50) -> list[Announcement]:
        end = limit - 1
        try:
            result = (
                self.client.table("announcements")
                .select("*")
                .eq("author_id", author_id)
                .order("created_at", desc=True)
                .range(0, end)
                .execute()
            )
        except APIError as exc:
            if is_missing_table_error(exc, "announcements"):
                return []
            raise
        return [_announcement_from_row(r) for r in response_data(result) or []]

    def create(self, author_id: str, title: str, body: str) -> Announcement:
        row = {"author_id": author_id, "title": title, "body": body}
        try:
            result = self.client.table("announcements").insert(row).execute()
        except APIError as exc:
            if is_missing_table_error(exc, "announcements"):
                raise RuntimeError(
                    "Announcements table missing. Run supabase/migrations/005_teacher_role_and_announcements.sql"
                ) from exc
            raise
        data = response_data(result)
        if isinstance(data, list):
            data = data[0] if data else None
        if not data:
            raise RuntimeError("Failed to create announcement")
        return _announcement_from_row(data)

    def delete(self, announcement_id: str, author_id: str) -> bool:
        try:
            result = (
                self.client.table("announcements")
                .delete()
                .eq("id", announcement_id)
                .eq("author_id", author_id)
                .execute()
            )
        except APIError as exc:
            if is_missing_table_error(exc, "announcements"):
                return False
            raise
        data = response_data(result)
        return bool(data)
