from fastapi import APIRouter, Depends, Query, Request, status

from app.core.dependencies import get_current_user_id, require_active_user
from app.core.moderation.service import enforce_clean_text
from app.core.security import extract_bearer_token
from app.core.supabase_auth import claims_to_user_fields, validate_supabase_token
from app.models.post import PostCreate, PostPublic
from app.models.user import UserPublic
from app.services.content.service import ContentService

router = APIRouter(prefix="/posts", tags=["content"])


def get_content_service() -> ContentService:
    return ContentService()


def _optional_user_id(request: Request) -> str | None:
    token = extract_bearer_token(request.headers.get("Authorization"))
    if not token:
        return None
    try:
        claims = validate_supabase_token(token)
        return claims_to_user_fields(claims)["id"]
    except ValueError:
        return None


@router.get("/feed", response_model=list[PostPublic])
def feed(
    request: Request,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    content: ContentService = Depends(get_content_service),
) -> list[PostPublic]:
    posts = content.list_feed(limit=limit, offset=offset)
    user_id = _optional_user_id(request)
    if not user_id:
        return posts
    from app.debug_log import debug_log
    from app.services.social.service import SocialService

    # #region agent log
    debug_log(
        "content/router.py:feed",
        "feed enrich likes",
        {"postCount": len(posts), "hasUser": bool(user_id)},
        hypothesis_id="H4",
    )
    # #endregion
    liked = SocialService().liked_ids_for_user(
        user_id, [str(p.id) for p in posts]
    )
    return [
        p.model_copy(update={"liked_by_me": str(p.id) in liked}) for p in posts
    ]


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
    user: UserPublic = Depends(require_active_user),
    content: ContentService = Depends(get_content_service),
) -> PostPublic:
    enforce_clean_text(str(user.id), payload.caption)
    return content.create_post(str(user.id), payload)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: str,
    user: UserPublic = Depends(require_active_user),
    content: ContentService = Depends(get_content_service),
) -> None:
    content.delete_post(str(user.id), post_id)
