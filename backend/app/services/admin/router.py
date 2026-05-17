from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field

from app.core.auth_sync import sync_user_role_to_auth
from app.core.dependencies import require_roles
from app.models.enums import PostType, UserRole
from app.models.post import PostPublic
from app.models.subscription import (
    AdminSubscriptionRow,
    AdminSubscriptionUpdate,
    UserSubscriptionPublic,
)
from app.models.user import UserPublic
from app.services.audit.repository import AuditRepository
from app.services.subscriptions.repository import SubscriptionRepository
from app.services.auth.repository import ProfileRepository
from app.services.content.repository import PostRepository
from app.services.reports.repository import ReportRepository

router = APIRouter(prefix="/admin", tags=["admin"])


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


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
    moderation_strikes: int = 0
    is_suspended: bool = False


class AdminPostRow(PostPublic):
    author_email: str | None = None


class AuditEventRow(BaseModel):
    id: str
    actor_id: str
    action: str
    target_type: str | None
    target_id: str | None
    metadata: dict
    ip_address: str | None
    created_at: str


class ReportRow(BaseModel):
    id: str
    reporter_id: str
    target_type: str
    target_id: str
    reason: str | None
    status: str
    created_at: str


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
            moderation_strikes=p.moderation_strikes,
            is_suspended=p.is_suspended,
        )
        for p in profiles
    ]


@router.patch("/users/{user_id}/role", response_model=AdminUserRow)
def update_user_role(
    user_id: str,
    payload: RoleUpdate,
    request: Request,
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
    sync_user_role_to_auth(user_id, updated.role)
    AuditRepository().log(
        actor_id=str(admin.id),
        action="role_change",
        target_type="user",
        target_id=user_id,
        metadata={"role": updated.role.value},
        ip_address=_client_ip(request),
    )
    return AdminUserRow(
        id=str(updated.id),
        email=updated.email,
        full_name=updated.full_name,
        role=updated.role,
        created_at=updated.created_at.isoformat(),
        moderation_strikes=updated.moderation_strikes,
        is_suspended=updated.is_suspended,
    )


@router.post("/users/{user_id}/unsuspend", response_model=AdminUserRow)
def unsuspend_user(
    user_id: str,
    request: Request,
    admin: UserPublic = Depends(require_roles(UserRole.ADMIN.value)),
) -> AdminUserRow:
    updated = ProfileRepository().clear_moderation(user_id)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    AuditRepository().log(
        actor_id=str(admin.id),
        action="unsuspend",
        target_type="user",
        target_id=user_id,
        ip_address=_client_ip(request),
    )
    return AdminUserRow(
        id=str(updated.id),
        email=updated.email,
        full_name=updated.full_name,
        role=updated.role,
        created_at=updated.created_at.isoformat(),
        moderation_strikes=updated.moderation_strikes,
        is_suspended=updated.is_suspended,
    )


@router.get("/audit", response_model=list[AuditEventRow])
def list_audit_events(
    _admin: UserPublic = Depends(require_roles(UserRole.ADMIN.value)),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[AuditEventRow]:
    rows = AuditRepository().list_recent(limit=limit, offset=offset)
    return [
        AuditEventRow(
            id=str(r["id"]),
            actor_id=str(r["actor_id"]),
            action=r["action"],
            target_type=r.get("target_type"),
            target_id=r.get("target_id"),
            metadata=r.get("metadata") or {},
            ip_address=r.get("ip_address"),
            created_at=str(r["created_at"]),
        )
        for r in rows
    ]


@router.get("/reports", response_model=list[ReportRow])
def list_pending_reports(
    _admin: UserPublic = Depends(require_roles(UserRole.ADMIN.value)),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[ReportRow]:
    rows = ReportRepository().list_pending(limit=limit, offset=offset)
    return [
        ReportRow(
            id=str(r["id"]),
            reporter_id=str(r["reporter_id"]),
            target_type=r["target_type"],
            target_id=str(r["target_id"]),
            reason=r.get("reason"),
            status=r["status"],
            created_at=str(r["created_at"]),
        )
        for r in rows
    ]


@router.patch("/reports/{report_id}")
def review_report(
    report_id: str,
    status_value: str = Query(alias="status", pattern="^(reviewed|dismissed)$"),
    _admin: UserPublic = Depends(require_roles(UserRole.ADMIN.value)),
) -> dict:
    row = ReportRepository().update_status(report_id, status_value)
    if not row:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"id": report_id, "status": status_value}


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


@router.get("/subscriptions", response_model=list[AdminSubscriptionRow])
def list_subscriptions(
    _user: UserPublic = Depends(require_roles(UserRole.ADMIN.value)),
) -> list[AdminSubscriptionRow]:
    rows = SubscriptionRepository().list_all_with_users(limit=200)
    return [AdminSubscriptionRow.model_validate(r) for r in rows]


@router.patch(
    "/users/{user_id}/subscription",
    response_model=UserSubscriptionPublic,
)
def update_user_subscription(
    user_id: str,
    payload: AdminSubscriptionUpdate,
    admin: UserPublic = Depends(require_roles(UserRole.ADMIN.value)),
) -> UserSubscriptionPublic:
    updated = SubscriptionRepository().admin_update_subscription(
        user_id,
        plan_slug=payload.plan_slug.strip().lower(),
        status=payload.status.value,
        notes=payload.notes,
        ends_at=payload.ends_at,
        assigned_by=str(admin.id),
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_503_NOT_FOUND,
            detail="Subscription not found or tables not migrated",
        )
    return UserSubscriptionPublic.model_validate(updated)


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def moderate_delete_post(
    post_id: str,
    request: Request,
    admin: UserPublic = Depends(require_roles(UserRole.ADMIN.value)),
) -> None:
    repo = PostRepository()
    if not repo.get_by_id(post_id):
        raise HTTPException(status_code=404, detail="Post not found")
    repo.delete_by_id(post_id)
    AuditRepository().log(
        actor_id=str(admin.id),
        action="delete_post",
        target_type="post",
        target_id=post_id,
        ip_address=_client_ip(request),
    )
