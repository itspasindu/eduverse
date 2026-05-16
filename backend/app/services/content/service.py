from fastapi import HTTPException, status
from postgrest.exceptions import APIError

from app.db.supabase_errors import SETUP_HINT, is_missing_table_error
from app.models.post import PostCreate, PostPublic
from app.services.content.repository import DatabaseNotSetupError, PostRepository


class ContentService:
    def __init__(self):
        self.repo = PostRepository()

    def create_post(self, user_id: str, data: PostCreate) -> PostPublic:
        try:
            post = self.repo.create(
            user_id=user_id,
            post_type=data.type,
            content_url=str(data.content_url),
            caption=data.caption,
            )
        except DatabaseNotSetupError as exc:
            # #region agent log
            from app.debug_log import debug_log

            debug_log(
                "content/service.py:create_post",
                "Returning 503 SETUP_HINT to client",
                {"detail": SETUP_HINT[:80]},
                hypothesis_id="D",
            )
            # #endregion
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=SETUP_HINT
            ) from exc
        except APIError as exc:
            if getattr(exc, "code", None) == "23503":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Your profile is not in the database yet. "
                        "Sign out, sign in again, or call POST /sync once."
                    ),
                ) from exc
            if is_missing_table_error(exc, "posts"):
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=SETUP_HINT
                ) from exc
            raise
        return PostPublic.model_validate(post)

    def list_feed(self, limit: int = 50, offset: int = 0) -> list[PostPublic]:
        return [PostPublic.model_validate(p) for p in self.repo.list_feed(limit, offset)]

    def list_my_posts(self, user_id: str, limit: int = 50, offset: int = 0) -> list[PostPublic]:
        return [
            PostPublic.model_validate(p)
            for p in self.repo.list_by_user(user_id, limit, offset)
        ]

    def delete_post(self, user_id: str, post_id: str) -> None:
        post = self.repo.get_by_id(post_id)
        if not post:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
        if post.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your post")
        self.repo.delete_by_id(post_id)
