from fastapi import APIRouter, Depends, Query, status

from app.core.dependencies import get_current_user_id, get_current_user_public
from app.models.post import PostCreate, PostPublic
from app.models.user import UserPublic
from app.services.content.service import ContentService

router = APIRouter(prefix="/posts", tags=["content"])


def get_content_service() -> ContentService:
    return ContentService()


@router.get("/feed", response_model=list[PostPublic])
def feed(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    content: ContentService = Depends(get_content_service),
) -> list[PostPublic]:
    return content.list_feed(limit=limit, offset=offset)


@router.get("/me", response_model=list[PostPublic])
def my_posts(
    user_id: str = Depends(get_current_user_id),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    content: ContentService = Depends(get_content_service),
) -> list[PostPublic]:
    return content.list_my_posts(user_id, limit=limit, offset=offset)


@router.post("", response_model=PostPublic, status_code=status.HTTP_201_CREATED)
def create_post(
    payload: PostCreate,
    user: UserPublic = Depends(get_current_user_public),
    content: ContentService = Depends(get_content_service),
) -> PostPublic:
    return content.create_post(str(user.id), payload)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: str,
    user_id: str = Depends(get_current_user_id),
    content: ContentService = Depends(get_content_service),
) -> None:
    content.delete_post(user_id, post_id)
