from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from postgrest.exceptions import APIError

from app.db import get_supabase
from app.db.supabase_errors import is_missing_table_error
from app.db.supabase_response import response_data
from app.models.subscription import SubscriptionStatus

DEFAULT_PLANS: list[dict[str, Any]] = [
    {
        "slug": "starter",
        "name": "Starter",
        "tagline": "Perfect for getting started",
        "description": "Core learning tools to explore EduVerse at no cost.",
        "price_cents": 0,
        "billing_period": "month",
        "features": [
            "AI Tutor (10 sessions / month)",
            "Community feed",
            "Class announcements",
            "Profile & library",
        ],
        "sort_order": 1,
    },
    {
        "slug": "pro",
        "name": "Pro",
        "tagline": "For serious learners & creators",
        "description": "Unlock creative studios and unlimited AI tutoring.",
        "price_cents": 1200,
        "billing_period": "month",
        "features": [
            "Everything in Starter",
            "Unlimited AI Tutor",
            "Meme Studio",
            "Characters & Lesson Studio",
            "Priority generation queue",
        ],
        "sort_order": 2,
    },
    {
        "slug": "institution",
        "name": "Institution",
        "tagline": "Classrooms and content teams",
        "description": "Full platform access with tools for teachers and creators.",
        "price_cents": 2900,
        "billing_period": "month",
        "features": [
            "Everything in Pro",
            "Slide Studio",
            "Teacher dashboard tools",
            "Bulk lesson materials",
            "Dedicated support",
        ],
        "sort_order": 3,
    },
]


def _parse_features(raw: Any) -> list[str]:
    if isinstance(raw, list):
        return [str(x) for x in raw]
    return []


def _plan_from_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(row["id"]),
        "slug": row["slug"],
        "name": row["name"],
        "tagline": row.get("tagline"),
        "description": row.get("description"),
        "price_cents": int(row.get("price_cents") or 0),
        "billing_period": row.get("billing_period") or "month",
        "features": _parse_features(row.get("features")),
        "sort_order": int(row.get("sort_order") or 0),
    }


def _subscription_from_row(row: dict[str, Any], plan: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(row["id"]),
        "user_id": str(row["user_id"]),
        "plan": plan,
        "status": row["status"],
        "starts_at": row.get("starts_at"),
        "ends_at": row.get("ends_at"),
        "notes": row.get("notes"),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


class SubscriptionRepository:
    def __init__(self) -> None:
        self.client = get_supabase()

    def list_plans(self) -> list[dict[str, Any]]:
        try:
            result = (
                self.client.table("subscription_plans")
                .select("*")
                .eq("is_active", True)
                .order("sort_order")
                .execute()
            )
            rows = response_data(result) or []
            if rows:
                return [_plan_from_row(r) for r in rows]
        except APIError as exc:
            if not is_missing_table_error(exc, "subscription_plans"):
                raise
        return [
            {**p, "id": p["slug"]}
            for p in sorted(DEFAULT_PLANS, key=lambda x: x["sort_order"])
        ]

    def get_plan_by_slug(self, slug: str) -> dict[str, Any] | None:
        slug = slug.strip().lower()
        for plan in self.list_plans():
            if plan["slug"] == slug:
                return plan
        return None

    def _resolve_plan_id(self, plan: dict[str, Any]) -> str | None:
        plan_id = plan.get("id")
        if plan_id and len(str(plan_id)) > 20:
            return str(plan_id)
        try:
            result = (
                self.client.table("subscription_plans")
                .select("id")
                .eq("slug", plan["slug"])
                .maybe_single()
                .execute()
            )
            data = response_data(result)
            return str(data["id"]) if data else None
        except APIError:
            return None

    def get_user_subscription(self, user_id: str) -> dict[str, Any] | None:
        try:
            result = (
                self.client.table("user_subscriptions")
                .select("*, subscription_plans(*)")
                .eq("user_id", user_id)
                .maybe_single()
                .execute()
            )
        except APIError as exc:
            if is_missing_table_error(exc, "user_subscriptions"):
                return None
            raise
        data = response_data(result)
        if not data:
            return None
        plan_row = data.get("subscription_plans") or {}
        if not plan_row:
            plan = self.get_plan_by_slug("starter")
            if not plan:
                return None
            plan_row = plan
        else:
            plan_row = _plan_from_row(plan_row)
        return _subscription_from_row(data, plan_row)

    def select_plan(
        self,
        user_id: str,
        plan_slug: str,
        *,
        assigned_by: str | None = None,
    ) -> dict[str, Any]:
        plan = self.get_plan_by_slug(plan_slug)
        if not plan:
            raise ValueError(f"Unknown plan: {plan_slug}")

        plan_id = self._resolve_plan_id(plan)
        if not plan_id:
            raise RuntimeError("Subscription tables not migrated. Run supabase/migrations/009_subscriptions.sql")

        is_free = int(plan.get("price_cents") or 0) == 0
        status = SubscriptionStatus.ACTIVE.value if is_free else SubscriptionStatus.PENDING.value
        now = datetime.now(timezone.utc).isoformat()

        row = {
            "user_id": user_id,
            "plan_id": plan_id,
            "status": status,
            "starts_at": now if is_free else None,
            "assigned_by": assigned_by,
        }

        try:
            result = (
                self.client.table("user_subscriptions")
                .upsert(row, on_conflict="user_id")
                .execute()
            )
        except APIError as exc:
            if is_missing_table_error(exc, "user_subscriptions"):
                raise RuntimeError(
                    "Subscription tables not migrated. Run supabase/migrations/009_subscriptions.sql"
                ) from exc
            raise

        refreshed = self.get_user_subscription(user_id)
        if refreshed:
            return refreshed
        data = response_data(result)
        if isinstance(data, list):
            data = data[0] if data else None
        if not data:
            return {}
        return _subscription_from_row(data, plan)

    def admin_update_subscription(
        self,
        user_id: str,
        *,
        plan_slug: str,
        status: str,
        notes: str | None,
        ends_at: datetime | None,
        assigned_by: str,
    ) -> dict[str, Any] | None:
        plan = self.get_plan_by_slug(plan_slug)
        if not plan:
            return None
        plan_id = self._resolve_plan_id(plan)
        if not plan_id:
            return None

        updates: dict[str, Any] = {
            "user_id": user_id,
            "plan_id": plan_id,
            "status": status,
            "notes": notes,
            "assigned_by": assigned_by,
        }
        if status == SubscriptionStatus.ACTIVE.value:
            updates["starts_at"] = datetime.now(timezone.utc).isoformat()
        if ends_at is not None:
            updates["ends_at"] = ends_at.isoformat()
        elif status in (
            SubscriptionStatus.CANCELLED.value,
            SubscriptionStatus.EXPIRED.value,
        ):
            updates["ends_at"] = datetime.now(timezone.utc).isoformat()

        try:
            result = (
                self.client.table("user_subscriptions")
                .upsert(updates, on_conflict="user_id")
                .execute()
            )
        except APIError as exc:
            if is_missing_table_error(exc, "user_subscriptions"):
                return None
            raise

        data = response_data(result)
        if isinstance(data, list):
            data = data[0] if data else None
        if data:
            return _subscription_from_row(data, plan)
        return self.get_user_subscription(user_id)

    def list_all_with_users(self, limit: int = 100) -> list[dict[str, Any]]:
        from app.services.auth.repository import ProfileRepository

        profiles = ProfileRepository().list_all(limit=limit, offset=0)
        subs_by_user: dict[str, dict[str, Any]] = {}
        try:
            result = (
                self.client.table("user_subscriptions")
                .select("*, subscription_plans(*)")
                .limit(limit)
                .execute()
            )
            for row in response_data(result) or []:
                plan_row = row.get("subscription_plans")
                if plan_row:
                    plan = _plan_from_row(plan_row)
                    subs_by_user[str(row["user_id"])] = _subscription_from_row(row, plan)
        except APIError as exc:
            if not is_missing_table_error(exc, "user_subscriptions"):
                raise

        rows: list[dict[str, Any]] = []
        for profile in profiles:
            uid = str(profile.id)
            rows.append(
                {
                    "user_id": uid,
                    "email": profile.email,
                    "full_name": profile.full_name,
                    "role": profile.role.value,
                    "subscription": subs_by_user.get(uid),
                }
            )
        return rows
