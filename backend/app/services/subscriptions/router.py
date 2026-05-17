from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import get_current_user_public
from app.models.subscription import (
    SelectPlanRequest,
    SubscriptionPlanPublic,
    SubscriptionStatus,
    UserSubscriptionPublic,
)
from app.models.user import UserPublic
from app.services.subscriptions.repository import SubscriptionRepository

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


def _to_plan_public(plan: dict) -> SubscriptionPlanPublic:
    return SubscriptionPlanPublic.model_validate(plan)


def _to_sub_public(sub: dict) -> UserSubscriptionPublic:
    return UserSubscriptionPublic.model_validate(sub)


@router.get("/plans", response_model=list[SubscriptionPlanPublic])
def list_plans() -> list[SubscriptionPlanPublic]:
    repo = SubscriptionRepository()
    return [_to_plan_public(p) for p in repo.list_plans()]


@router.get("/me", response_model=UserSubscriptionPublic | None)
def get_my_subscription(
    user: UserPublic = Depends(get_current_user_public),
) -> UserSubscriptionPublic | None:
    sub = SubscriptionRepository().get_user_subscription(str(user.id))
    return _to_sub_public(sub) if sub else None


@router.post("/me", response_model=UserSubscriptionPublic)
def select_my_plan(
    payload: SelectPlanRequest,
    user: UserPublic = Depends(get_current_user_public),
) -> UserSubscriptionPublic:
    repo = SubscriptionRepository()
    try:
        sub = repo.select_plan(str(user.id), payload.plan_slug.strip().lower())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    if not sub:
        raise HTTPException(status_code=500, detail="Failed to save subscription")
    return _to_sub_public(sub)
