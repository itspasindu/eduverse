from fastapi import Depends, HTTPException, Request, status
from postgrest.exceptions import APIError

from app.core.supabase_auth import claims_to_user_fields
from app.db.types import profile_from_claims
from app.models.user import UserPublic
from app.services.auth.repository import ProfileRepository


def get_current_user_id(request: Request) -> str:
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return str(user_id)


def get_current_user_public(
    request: Request,
    user_id: str = Depends(get_current_user_id),
) -> UserPublic:
    repo = ProfileRepository()
    profile = repo.get_by_id(user_id)
    claims = getattr(request.state, "supabase_claims", None)

    if not profile and claims:
        fields = claims_to_user_fields(claims)
        try:
            profile = repo.upsert_from_supabase(
                user_id=fields["id"],
                email=fields["email"],
                role=fields["role"],
                full_name=fields.get("full_name"),
            )
        except APIError as exc:
            if getattr(exc, "code", None) == "23503":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Could not create your profile. Sign out and sign in again. "
                        "If it persists, run supabase/migrations/004_fix_profiles_auth_fk.sql"
                    ),
                ) from exc
            raise
    elif profile and claims:
        fields = claims_to_user_fields(claims)
        profile = repo.upsert_from_supabase(
            user_id=str(profile.id),
            email=fields.get("email") or profile.email,
            role=fields.get("role") or profile.role.value,
            full_name=fields.get("full_name") or profile.full_name,
        )

    if not profile and claims:
        fields = claims_to_user_fields(claims)
        profile = profile_from_claims(
            user_id=fields["id"],
            email=fields["email"],
            role=fields["role"],
            full_name=fields.get("full_name"),
        )

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return UserPublic.model_validate(profile)


def require_roles(*allowed_roles: str):
    allowed = frozenset(allowed_roles)

    def _checker(user: UserPublic = Depends(get_current_user_public)) -> UserPublic:
        if user.role.value not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user

    return _checker
