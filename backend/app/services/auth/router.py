from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import get_current_user_id, get_current_user_public
from app.db.client import get_supabase
from app.models.user import ProfileUpdate, UserPublic
from app.services.auth.repository import ProfileRepository

router = APIRouter(tags=["auth"])


@router.get("/me", response_model=UserPublic)
def me(current_user: UserPublic = Depends(get_current_user_public)) -> UserPublic:
    return current_user


@router.patch("/me", response_model=UserPublic)
def update_me(
    payload: ProfileUpdate,
    user_id: str = Depends(get_current_user_id),
    current_user: UserPublic = Depends(get_current_user_public),
) -> UserPublic:
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
            get_supabase().auth.admin.update_user_by_id(user_id, {"user_metadata": metadata})
        except Exception:
            pass

    return UserPublic.model_validate(updated)


@router.post("/sync", response_model=UserPublic)
def sync_profile(
    current_user: UserPublic = Depends(get_current_user_public),
) -> UserPublic:
    """Ensure Supabase-authenticated user exists in profiles."""
    return current_user
