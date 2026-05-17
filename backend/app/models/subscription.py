from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class SubscriptionStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class SubscriptionPlanPublic(BaseModel):
    id: str
    slug: str
    name: str
    tagline: str | None = None
    description: str | None = None
    price_cents: int
    billing_period: str = "month"
    features: list[str] = Field(default_factory=list)
    sort_order: int = 0


class UserSubscriptionPublic(BaseModel):
    id: str
    user_id: str
    plan: SubscriptionPlanPublic
    status: SubscriptionStatus
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime


class SelectPlanRequest(BaseModel):
    plan_slug: str = Field(min_length=1, max_length=64)


class AdminSubscriptionUpdate(BaseModel):
    plan_slug: str = Field(min_length=1, max_length=64)
    status: SubscriptionStatus
    notes: str | None = None
    ends_at: datetime | None = None


class AdminSubscriptionRow(BaseModel):
    user_id: str
    email: str
    full_name: str | None
    role: str
    subscription: UserSubscriptionPublic | None = None
