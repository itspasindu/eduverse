from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CommentCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=2000)


class CommentPublic(BaseModel):
    id: UUID
    post_id: UUID
    user_id: UUID
    body: str
    created_at: datetime
    author_name: str | None = None

    model_config = {"from_attributes": True}


class LikeToggleResult(BaseModel):
    post_id: UUID
    likes: int
    liked: bool
