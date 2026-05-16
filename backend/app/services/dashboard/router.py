from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.dependencies import get_current_user_id, get_current_user_public
from app.models.enums import PostType
from app.models.post import PostPublic
from app.models.user import UserPublic
from app.services.content.repository import PostRepository

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


class DashboardStats(BaseModel):
    total_posts: int
    meme_count: int
    video_count: int
    total_likes: int


class DashboardResponse(BaseModel):
    user: UserPublic
    stats: DashboardStats
    recent_posts: list[PostPublic]


@router.get("", response_model=DashboardResponse)
def dashboard(
    user: UserPublic = Depends(get_current_user_public),
    user_id: str = Depends(get_current_user_id),
) -> DashboardResponse:
    repo = PostRepository()
    recent = repo.list_by_user(user_id, limit=6)
    all_posts = repo.list_by_user(user_id, limit=500)

    return DashboardResponse(
        user=user,
        stats=DashboardStats(
            total_posts=len(all_posts),
            meme_count=sum(1 for p in all_posts if p.type == PostType.MEME),
            video_count=sum(1 for p in all_posts if p.type == PostType.VIDEO),
            total_likes=sum(p.likes for p in all_posts),
        ),
        recent_posts=[PostPublic.model_validate(p) for p in recent],
    )
