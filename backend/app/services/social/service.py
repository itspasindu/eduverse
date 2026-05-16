from uuid import UUID

from fastapi import HTTPException, status
from postgrest.exceptions import APIError

from app.db.supabase_errors import SETUP_HINT
from app.models.social import CommentCreate, CommentPublic, LikeToggleResult
from app.realtime.feed_manager import feed_realtime
from app.services.content.repository import DatabaseNotSetupError, PostRepository
from app.services.social.repository import SocialRepository


class SocialService:
    def __init__(self) -> None:
        self.social = SocialRepository()
        self.posts = PostRepository()

    def _ensure_post(self, post_id: str) -> None:
        if not self.posts.get_by_id(post_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
            )

    async def toggle_like(self, user_id: str, post_id: str) -> LikeToggleResult:
        self._ensure_post(post_id)
        try:
            likes, liked = self.social.toggle_like(user_id, post_id)
        except DatabaseNotSetupError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=SETUP_HINT
            ) from exc
        except APIError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Like failed: {exc}",
            ) from exc

        result = LikeToggleResult(
            post_id=UUID(post_id), likes=likes, liked=liked
        )
        await feed_realtime.broadcast(
            {
                "type": "like_update",
                "post_id": post_id,
                "likes": likes,
                "liked": liked,
                "user_id": user_id,
            }
        )
        return result

    async def add_comment(
        self, user_id: str, post_id: str, payload: CommentCreate
    ) -> CommentPublic:
        self._ensure_post(post_id)
        try:
            row = self.social.add_comment(user_id, post_id, payload.body)
            comments = self.social._get_post_comments_count(post_id)
        except DatabaseNotSetupError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=SETUP_HINT
            ) from exc
        except APIError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Comment failed: {exc}",
            ) from exc

        public = CommentPublic.model_validate(
            self.social.comment_row_to_public(row)
        )
        await feed_realtime.broadcast(
            {
                "type": "comment_added",
                "post_id": post_id,
                "comments": comments,
                "comment": public.model_dump(mode="json"),
            }
        )
        return public

    def list_comments(
        self, post_id: str, limit: int = 50, offset: int = 0
    ) -> list[CommentPublic]:
        self._ensure_post(post_id)
        try:
            rows = self.social.list_comments(post_id, limit, offset)
        except DatabaseNotSetupError:
            return []
        return [
            CommentPublic.model_validate(self.social.comment_row_to_public(r))
            for r in rows
        ]

    def liked_ids_for_user(self, user_id: str, post_ids: list[str]) -> set[str]:
        try:
            return self.social.get_liked_post_ids(user_id, post_ids)
        except DatabaseNotSetupError:
            return set()
