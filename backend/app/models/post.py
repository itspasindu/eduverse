from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl

from app.models.enums import PostType


class PostCreate(BaseModel):
    type: PostType
    content_url: HttpUrl | str
    caption: str | None = Field(default=None, max_length=2000)


class PostPublic(BaseModel):
    id: UUID
    user_id: UUID
    type: PostType
    content_url: str
    caption: str | None
    likes: int
    comments: int
    liked_by_me: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}
