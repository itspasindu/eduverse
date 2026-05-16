from postgrest.exceptions import APIError

from app.db import Post, get_supabase, post_from_row
from app.db.supabase_response import response_data
from app.db.supabase_errors import SETUP_HINT, is_missing_table_error
from app.debug_log import debug_log
from app.models.enums import PostType


class DatabaseNotSetupError(RuntimeError):
    def __init__(self) -> None:
        super().__init__(SETUP_HINT)


class PostRepository:
    def __init__(self):
        self.client = get_supabase()

    def _handle_error(self, exc: APIError) -> None:
        if is_missing_table_error(exc, "posts"):
            # #region agent log
            debug_log(
                "content/repository.py:_handle_error",
                "posts table missing",
                {"code": getattr(exc, "code", None), "msg": str(exc)[:180]},
                hypothesis_id="B",
            )
            # #endregion
            raise DatabaseNotSetupError() from exc
        raise exc

    def create(
        self,
        user_id: str,
        post_type: PostType,
        content_url: str,
        caption: str | None = None,
    ) -> Post:
        row = {
            "user_id": user_id,
            "type": post_type.value,
            "content_url": content_url,
            "caption": caption,
        }
        try:
            result = self.client.table("posts").insert(row).execute()
        except APIError as exc:
            # #region agent log
            debug_log(
                "content/repository.py:create",
                "posts insert failed",
                {"code": getattr(exc, "code", None), "msg": str(exc)[:200]},
                hypothesis_id="E",
            )
            # #endregion
            self._handle_error(exc)
        raw = response_data(result)
        data = raw[0] if isinstance(raw, list) and raw else raw
        if not data:
            raise APIError({"message": "Insert returned no row", "code": "PGRST116"})
        # #region agent log
        debug_log(
            "content/repository.py:create",
            "posts insert ok",
            {"postId": data.get("id") if isinstance(data, dict) else None},
            hypothesis_id="E",
            run_id="post-fix",
        )
        # #endregion
        return post_from_row(data)

    def get_by_id(self, post_id: str) -> Post | None:
        try:
            result = (
                self.client.table("posts")
                .select("*")
                .eq("id", post_id)
                .maybe_single()
                .execute()
            )
        except APIError as exc:
            self._handle_error(exc)

        data = response_data(result)
        if not data:
            return None
        return post_from_row(data)

    def list_feed(self, limit: int = 50, offset: int = 0) -> list[Post]:
        end = offset + limit - 1
        try:
            result = (
                self.client.table("posts")
                .select("*")
                .order("created_at", desc=True)
                .range(offset, end)
                .execute()
            )
        except APIError as exc:
            if is_missing_table_error(exc, "posts"):
                return []
            raise
        return [post_from_row(row) for row in response_data(result) or []]

    def list_by_user(self, user_id: str, limit: int = 50, offset: int = 0) -> list[Post]:
        end = offset + limit - 1
        try:
            result = (
                self.client.table("posts")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .range(offset, end)
                .execute()
            )
        except APIError as exc:
            if is_missing_table_error(exc, "posts"):
                return []
            raise
        return [post_from_row(row) for row in response_data(result) or []]

    def delete_by_id(self, post_id: str) -> None:
        try:
            self.client.table("posts").delete().eq("id", post_id).execute()
        except APIError as exc:
            self._handle_error(exc)

    def list_all(self, limit: int = 50, offset: int = 0) -> list[Post]:
        end = offset + limit - 1
        try:
            result = (
                self.client.table("posts")
                .select("*")
                .order("created_at", desc=True)
                .range(offset, end)
                .execute()
            )
        except APIError as exc:
            if is_missing_table_error(exc, "posts"):
                return []
            raise
        return [post_from_row(row) for row in response_data(result) or []]

    def count_all(self) -> int:
        try:
            result = (
                self.client.table("posts")
                .select("id", count="exact")
                .limit(0)
                .execute()
            )
        except APIError as exc:
            if is_missing_table_error(exc, "posts"):
                return 0
            raise
        return int(getattr(result, "count", None) or 0)
