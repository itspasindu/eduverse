from dataclasses import dataclass
from datetime import datetime, timezone

from app.models.enums import PostType, UserRole


@dataclass
class Profile:
    id: str
    email: str
    role: UserRole
    full_name: str | None
    created_at: datetime
    updated_at: datetime | None = None
    avatar_url: str | None = None


@dataclass
class Post:
    id: str
    user_id: str
    type: PostType
    content_url: str
    caption: str | None
    likes: int
    comments: int
    created_at: datetime
    updated_at: datetime | None = None


def profile_from_claims(
    user_id: str,
    email: str,
    role: str,
    full_name: str | None = None,
) -> Profile:
    parsed_role = (
        UserRole(role) if role in UserRole._value2member_map_ else UserRole.STUDENT
    )
    now = datetime.now(timezone.utc)
    return Profile(
        id=user_id,
        email=email.lower(),
        role=parsed_role,
        full_name=full_name,
        created_at=now,
        updated_at=now,
    )


def profile_from_row(row: dict) -> Profile:
    return Profile(
        id=str(row["id"]),
        email=row["email"],
        role=UserRole(row["role"]),
        full_name=row.get("full_name"),
        avatar_url=row.get("avatar_url"),
        created_at=_parse_dt(row["created_at"]),
        updated_at=_parse_dt(row["updated_at"]) if row.get("updated_at") else None,
    )


def post_from_row(row: dict) -> Post:
    return Post(
        id=str(row["id"]),
        user_id=str(row["user_id"]),
        type=PostType(row["type"]),
        content_url=row["content_url"],
        caption=row.get("caption"),
        likes=int(row.get("likes") or 0),
        comments=int(row.get("comments") or 0),
        created_at=_parse_dt(row["created_at"]),
        updated_at=_parse_dt(row["updated_at"]) if row.get("updated_at") else None,
    )


def _parse_dt(value: str | datetime) -> datetime:
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(value.replace("Z", "+00:00"))
