"""Sync profile role to Supabase Auth app_metadata (admin operations)."""

from __future__ import annotations

import logging

from app.db.client import get_supabase
from app.models.enums import UserRole

logger = logging.getLogger("eduverse.auth")


def sync_user_role_to_auth(user_id: str, role: UserRole) -> None:
    try:
        get_supabase().auth.admin.update_user_by_id(
            user_id,
            {"app_metadata": {"role": role.value}},
        )
    except Exception as exc:
        logger.warning("Failed to sync role to auth for %s: %s", user_id, exc)
