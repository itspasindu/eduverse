from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import UserRole


class UserPublic(BaseModel):
    id: UUID
    email: EmailStr
    role: UserRole
    full_name: str | None = None
    avatar_url: str | None = None
    created_at: datetime
    moderation_strikes: int = 0
    is_suspended: bool = False

    model_config = {"from_attributes": True}


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=120)
    avatar_url: str | None = Field(default=None, max_length=2048)
