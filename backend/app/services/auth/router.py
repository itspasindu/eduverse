from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.core.dependencies import (
    get_current_user_id,
    get_current_user_public,
    require_active_user,
)
from app.core.moderation.service import enforce_clean_text
from app.core.url_allowlist import assert_https_url_allowed
from app.db.client import get_supabase
from app.models.user import ProfileUpdate, UserPublic
from app.services.auth.repository import ProfileRepository
from app.services.content.repository import PostRepository

router = APIRouter(tags=["auth"])


@router.get("/me", response_model=UserPublic)
def me(current_user: UserPublic = Depends(get_current_user_public)) -> UserPublic:
    return current_user


@router.patch("/me", response_model=UserPublic)
def update_me(
    payload: ProfileUpdate,
    user_id: str = Depends(get_current_user_id),
    current_user: UserPublic = Depends(require_active_user),
) -> UserPublic:
    enforce_clean_text(user_id, payload.full_name)
    if payload.avatar_url is not None:
        assert_https_url_allowed(payload.avatar_url, field="avatar_url")

    repo = ProfileRepository()
    updated = repo.update_profile(
        user_id,
        full_name=payload.full_name,
        avatar_url=payload.avatar_url,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    metadata: dict[str, str] = {}
    if payload.full_name is not None:
        metadata["full_name"] = payload.full_name
    if payload.avatar_url is not None:
        metadata["avatar_url"] = payload.avatar_url

    if metadata:
        try:
            get_supabase().auth.admin.update_user_by_id(
                user_id, {"user_metadata": metadata}
            )
        except Exception:
            pass

    return UserPublic.model_validate(updated)


@router.post("/sync", response_model=UserPublic)
def sync_profile(
    current_user: UserPublic = Depends(get_current_user_public),
) -> UserPublic:
    """Ensure Supabase-authenticated user exists in profiles."""
    return current_user


@router.get("/me/export")
def export_my_data(user_id: str = Depends(get_current_user_id)) -> dict:
    """GDPR-style export of the user's profile and posts."""
    profile = ProfileRepository().get_by_id(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    posts = PostRepository().list_by_user(user_id, limit=500, offset=0)
    return {
        "profile": {
            "id": str(profile.id),
            "email": profile.email,
            "full_name": profile.full_name,
            "role": profile.role.value,
            "avatar_url": profile.avatar_url,
            "created_at": profile.created_at.isoformat(),
            "moderation_strikes": profile.moderation_strikes,
            "is_suspended": profile.is_suspended,
        },
        "posts": [
            {
                "id": str(p.id),
                "type": p.type.value,
                "content_url": p.content_url,
                "caption": p.caption,
                "likes": p.likes,
                "comments": p.comments,
                "created_at": p.created_at.isoformat(),
            }
            for p in posts
        ],
    }


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_account(user_id: str = Depends(get_current_user_id)) -> None:
    """Delete auth user and cascade profile/posts via FK."""
    try:
        get_supabase().auth.admin.delete_user(user_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not delete account. Try again or contact support.",
        ) from exc
