from __future__ import annotations

from datetime import datetime
from uuid import UUID

from postgrest.exceptions import APIError

from app.db import get_supabase
from app.db.supabase_errors import SETUP_HINT, is_missing_table_error
from app.db.supabase_response import response_data
from app.services.content.repository import DatabaseNotSetupError


class SocialRepository:
    def __init__(self) -> None:
        self.client = get_supabase()

    def _handle_error(self, exc: APIError) -> None:
        if is_missing_table_error(exc, "post_likes") or is_missing_table_error(
            exc, "post_comments"
        ):
            from app.debug_log import debug_log

            # #region agent log
            debug_log(
                "social/repository.py:_handle_error",
                "missing social table",
                {"code": getattr(exc, "code", None), "msg": str(exc)[:120]},
                hypothesis_id="H3",
            )
            # #endregion
            raise DatabaseNotSetupError() from exc
        raise exc

    def get_liked_post_ids(self, user_id: str, post_ids: list[str]) -> set[str]:
        if not post_ids:
            return set()
        try:
            result = (
                self.client.table("post_likes")
                .select("post_id")
                .eq("user_id", user_id)
                .in_("post_id", post_ids)
                .execute()
            )
        except APIError as exc:
            if is_missing_table_error(exc, "post_likes"):
                return set()
            self._handle_error(exc)
        rows = response_data(result) or []
        return {str(row["post_id"]) for row in rows if row.get("post_id")}

    def toggle_like(self, user_id: str, post_id: str) -> tuple[int, bool]:
        try:
            existing = (
                self.client.table("post_likes")
                .select("post_id")
                .eq("post_id", post_id)
                .eq("user_id", user_id)
                .maybe_single()
                .execute()
            )
        except APIError as exc:
            self._handle_error(exc)

        liked = bool(response_data(existing))
        try:
            if liked:
                (
                    self.client.table("post_likes")
                    .delete()
                    .eq("post_id", post_id)
                    .eq("user_id", user_id)
                    .execute()
                )
            else:
                (
                    self.client.table("post_likes")
                    .insert({"post_id": post_id, "user_id": user_id})
                    .execute()
                )
        except APIError as exc:
            self._handle_error(exc)

        likes = self._get_post_likes_count(post_id)
        return likes, not liked

    def _get_post_likes_count(self, post_id: str) -> int:
        result = (
            self.client.table("posts")
            .select("likes")
            .eq("id", post_id)
            .maybe_single()
            .execute()
        )
        data = response_data(result)
        if not data:
            return 0
        return int(data.get("likes") or 0)

    def _get_post_comments_count(self, post_id: str) -> int:
        result = (
            self.client.table("posts")
            .select("comments")
            .eq("id", post_id)
            .maybe_single()
            .execute()
        )
        data = response_data(result)
        if not data:
            return 0
        return int(data.get("comments") or 0)

    def add_comment(self, user_id: str, post_id: str, body: str) -> dict:
        row = {"post_id": post_id, "user_id": user_id, "body": body.strip()}
        try:
            result = self.client.table("post_comments").insert(row).execute()
        except APIError as exc:
            self._handle_error(exc)
        raw = response_data(result)
        data = raw[0] if isinstance(raw, list) and raw else raw
        if not data:
            raise APIError({"message": "Insert returned no row", "code": "PGRST116"})
        return data

    def list_comments(
        self, post_id: str, limit: int = 50, offset: int = 0
    ) -> list[dict]:
        end = offset + limit - 1
        try:
            result = (
                self.client.table("post_comments")
                .select("id, post_id, user_id, body, created_at, profiles(full_name, email)")
                .eq("post_id", post_id)
                .order("created_at", desc=False)
                .range(offset, end)
                .execute()
            )
        except APIError as exc:
            if is_missing_table_error(exc, "post_comments"):
                return []
            self._handle_error(exc)
        return list(response_data(result) or [])

    @staticmethod
    def comment_row_to_public(row: dict) -> dict:
        profiles = row.get("profiles") or {}
        name = (profiles.get("full_name") or "").strip()
        email = profiles.get("email") or ""
        author = name or (email.split("@")[0] if email else "Learner")
        return {
            "id": row["id"],
            "post_id": row["post_id"],
            "user_id": row["user_id"],
            "body": row["body"],
            "created_at": row["created_at"],
            "author_name": author,
        }
