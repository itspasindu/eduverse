from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.core.dependencies import (
    get_current_user_id,
    get_current_user_public,
    require_roles,
)
from app.core.moderation.service import enforce_clean_text
from app.models.enums import UserRole
from app.models.post import PostPublic
from app.models.user import UserPublic
from app.services.auth.repository import ProfileRepository
from app.services.content.repository import PostRepository
from app.services.teacher.announcement_repository import AnnouncementRepository

router = APIRouter(prefix="/teacher", tags=["teacher"])


class AnnouncementPublic(BaseModel):
    id: str
    author_id: str
    title: str
    body: str
    created_at: str


class TeacherOverview(BaseModel):
    student_count: int
    creator_count: int
    total_posts: int
    my_announcements: int
    recent_posts: list[PostPublic]
    recent_announcements: list[AnnouncementPublic]


class AnnouncementCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=5000)


class StudentRow(BaseModel):
    id: str
    email: str
    full_name: str | None
    created_at: str


@router.get("/overview", response_model=TeacherOverview)
def teacher_overview(
    user: UserPublic = Depends(require_roles(UserRole.TEACHER.value, UserRole.ADMIN.value)),
) -> TeacherOverview:
    profile_repo = ProfileRepository()
    post_repo = PostRepository()
    ann_repo = AnnouncementRepository()
    role_counts = profile_repo.count_by_role()
    my_announcements = ann_repo.list_by_author(str(user.id))
    return TeacherOverview(
        student_count=role_counts.get(UserRole.STUDENT.value, 0),
        creator_count=role_counts.get(UserRole.CREATOR.value, 0),
        total_posts=post_repo.count_all(),
        my_announcements=len(my_announcements),
        recent_posts=[
            PostPublic.model_validate(p) for p in post_repo.list_all(limit=6)
        ],
        recent_announcements=[
            AnnouncementPublic(
                id=a.id,
                author_id=a.author_id,
                title=a.title,
                body=a.body,
                created_at=a.created_at.isoformat(),
            )
            for a in ann_repo.list_recent(limit=5)
        ],
    )


@router.get("/students", response_model=list[StudentRow])
def list_students(
    _user: UserPublic = Depends(require_roles(UserRole.TEACHER.value, UserRole.ADMIN.value)),
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[StudentRow]:
    profiles = ProfileRepository().list_all(
        limit=limit, offset=offset, role=UserRole.STUDENT.value
    )
    return [
        StudentRow(
            id=str(p.id),
            email=p.email,
            full_name=p.full_name,
            created_at=p.created_at.isoformat(),
        )
        for p in profiles
    ]


@router.get("/announcements", response_model=list[AnnouncementPublic])
def list_announcements(
    _user: UserPublic = Depends(require_roles(UserRole.TEACHER.value, UserRole.ADMIN.value)),
) -> list[AnnouncementPublic]:
    items = AnnouncementRepository().list_recent(limit=50)
    return [
        AnnouncementPublic(
            id=a.id,
            author_id=a.author_id,
            title=a.title,
            body=a.body,
            created_at=a.created_at.isoformat(),
        )
        for a in items
    ]


@router.post(
    "/announcements",
    response_model=AnnouncementPublic,
    status_code=status.HTTP_201_CREATED,
)
def create_announcement(
    payload: AnnouncementCreate,
    user: UserPublic = Depends(require_roles(UserRole.TEACHER.value, UserRole.ADMIN.value)),
) -> AnnouncementPublic:
    enforce_clean_text(str(user.id), payload.title, payload.body)
    ann = AnnouncementRepository().create(
        author_id=str(user.id),
        title=payload.title.strip(),
        body=payload.body.strip(),
    )
    return AnnouncementPublic(
        id=ann.id,
        author_id=ann.author_id,
        title=ann.title,
        body=ann.body,
        created_at=ann.created_at.isoformat(),
    )


@router.delete("/announcements/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_announcement(
    announcement_id: str,
    user_id: str = Depends(get_current_user_id),
    _user: UserPublic = Depends(require_roles(UserRole.TEACHER.value, UserRole.ADMIN.value)),
) -> None:
    if not AnnouncementRepository().delete(announcement_id, user_id):
        raise HTTPException(status_code=404, detail="Announcement not found")


@router.get("/announcements/feed", response_model=list[AnnouncementPublic])
def public_announcements_feed(
    _: UserPublic = Depends(get_current_user_public),
) -> list[AnnouncementPublic]:
    """Readable by any authenticated user (student/creator dashboard)."""
    items = AnnouncementRepository().list_recent(limit=30)
    return [
        AnnouncementPublic(
            id=a.id,
            author_id=a.author_id,
            title=a.title,
            body=a.body,
            created_at=a.created_at.isoformat(),
        )
        for a in items
    ]
