from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.core.dependencies import require_roles
from app.models.enums import PostType, UserRole
from app.models.post import PostPublic
from app.models.user import UserPublic
from app.services.auth.repository import ProfileRepository
from app.services.content.repository import PostRepository

router = APIRouter(prefix="/admin", tags=["admin"])


class AdminOverview(BaseModel):
    total_users: int
    total_posts: int
    users_by_role: dict[str, int]
    posts_by_type: dict[str, int]


class RoleUpdate(BaseModel):
    role: UserRole


class AdminUserRow(BaseModel):
    id: str
    email: str
    full_name: str | None
    role: UserRole
    created_at: str


class AdminPostRow(PostPublic):
    author_email: str | None = None


@router.get("/overview", response_model=AdminOverview)
def admin_overview(
    _user: UserPublic = Depends(require_roles(UserRole.ADMIN.value)),
) -> AdminOverview:
    profile_repo = ProfileRepository()
    post_repo = PostRepository()
    posts = post_repo.list_all(limit=500)
    return AdminOverview(
        total_users=profile_repo.count_all(),
        total_posts=post_repo.count_all(),
        users_by_role=profile_repo.count_by_role(),
        posts_by_type={
            PostType.MEME.value: sum(1 for p in posts if p.type == PostType.MEME),
            PostType.VIDEO.value: sum(1 for p in posts if p.type == PostType.VIDEO),
        },
    )


@router.get("/users", response_model=list[AdminUserRow])
def list_users(
    _user: UserPublic = Depends(require_roles(UserRole.ADMIN.value)),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    role: str | None = Query(default=None),
) -> list[AdminUserRow]:
    profiles = ProfileRepository().list_all(limit=limit, offset=offset, role=role)
    return [
        AdminUserRow(
            id=str(p.id),
            email=p.email,
            full_name=p.full_name,
            role=p.role,
            created_at=p.created_at.isoformat(),
        )
        for p in profiles
    ]


@router.patch("/users/{user_id}/role", response_model=AdminUserRow)
def update_user_role(
    user_id: str,
    payload: RoleUpdate,
    admin: UserPublic = Depends(require_roles(UserRole.ADMIN.value)),
) -> AdminUserRow:
    if str(admin.id) == user_id and payload.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove your own admin role",
        )
    updated = ProfileRepository().update_role(user_id, payload.role.value)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return AdminUserRow(
        id=str(updated.id),
        email=updated.email,
        full_name=updated.full_name,
        role=updated.role,
        created_at=updated.created_at.isoformat(),
    )


@router.get("/posts", response_model=list[AdminPostRow])
def list_all_posts(
    _user: UserPublic = Depends(require_roles(UserRole.ADMIN.value)),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[AdminPostRow]:
    posts = PostRepository().list_all(limit=limit, offset=offset)
    profiles = {str(p.id): p for p in ProfileRepository().list_all(limit=500)}
    rows: list[AdminPostRow] = []
    for post in posts:
        author = profiles.get(post.user_id)
        base = PostPublic.model_validate(post)
        rows.append(
            AdminPostRow(
                **base.model_dump(),
                author_email=author.email if author else None,
            )
        )
    return rows


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def moderate_delete_post(
    post_id: str,
    _user: UserPublic = Depends(require_roles(UserRole.ADMIN.value)),
) -> None:
    repo = PostRepository()
    if not repo.get_by_id(post_id):
        raise HTTPException(status_code=404, detail="Post not found")
    repo.delete_by_id(post_id)
