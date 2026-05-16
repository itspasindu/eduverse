from postgrest.exceptions import APIError

from app.db import Profile, get_supabase, profile_from_claims, profile_from_row
from app.db.supabase_errors import is_missing_table_error
from app.db.supabase_response import response_data
from app.debug_log import debug_log
from app.models.enums import UserRole


class ProfileRepository:
    def __init__(self):
        self.client = get_supabase()

    def get_by_id(self, user_id: str) -> Profile | None:
        try:
            result = (
                self.client.table("profiles")
                .select("*")
                .eq("id", user_id)
                .maybe_single()
                .execute()
            )
        except APIError as exc:
            if is_missing_table_error(exc, "profiles"):
                # #region agent log
                debug_log(
                    "auth/repository.py:get_by_id",
                    "profiles table missing",
                    {"code": getattr(exc, "code", None), "msg": str(exc)[:180]},
                    hypothesis_id="A",
                )
                # #endregion
                return None
            raise

        data = response_data(result)
        # #region agent log
        debug_log(
            "auth/repository.py:get_by_id",
            "profiles lookup",
            {"userId": user_id[:8], "found": bool(data)},
            hypothesis_id="G",
        )
        # #endregion
        if not data:
            return None
        return profile_from_row(data)

    def upsert_from_supabase(
        self,
        user_id: str,
        email: str,
        role: str,
        full_name: str | None = None,
    ) -> Profile:
        parsed_role = (
            UserRole(role) if role in UserRole._value2member_map_ else UserRole.STUDENT
        )
        row = {
            "id": user_id,
            "email": email.lower(),
            "role": parsed_role.value,
            "full_name": full_name or "",
        }
        try:
            result = (
                self.client.table("profiles")
                .upsert(row, on_conflict="id")
                .execute()
            )
            data = response_data(result)
            if isinstance(data, list):
                data = data[0] if data else None
            if not data:
                return profile_from_claims(user_id, email, role, full_name)
            return profile_from_row(data)
        except APIError as exc:
            if is_missing_table_error(exc, "profiles"):
                # #region agent log
                debug_log(
                    "auth/repository.py:upsert",
                    "profiles table missing on upsert",
                    {"code": getattr(exc, "code", None), "msg": str(exc)[:180]},
                    hypothesis_id="A",
                )
                # #endregion
                return profile_from_claims(user_id, email, role, full_name)
            # #region agent log
            debug_log(
                "auth/repository.py:upsert",
                "profiles upsert failed",
                {"code": getattr(exc, "code", None), "msg": str(exc)[:200]},
                hypothesis_id="F",
            )
            # #endregion
            raise

    def list_all(
        self,
        limit: int = 50,
        offset: int = 0,
        role: str | None = None,
    ) -> list[Profile]:
        end = offset + limit - 1
        query = (
            self.client.table("profiles")
            .select("*")
            .order("created_at", desc=True)
        )
        if role:
            query = query.eq("role", role)
        try:
            result = query.range(offset, end).execute()
        except APIError as exc:
            if is_missing_table_error(exc, "profiles"):
                return []
            raise
        return [profile_from_row(row) for row in response_data(result) or []]

    def count_all(self) -> int:
        try:
            result = (
                self.client.table("profiles")
                .select("id", count="exact")
                .limit(0)
                .execute()
            )
        except APIError as exc:
            if is_missing_table_error(exc, "profiles"):
                return 0
            raise
        return int(getattr(result, "count", None) or 0)

    def count_by_role(self) -> dict[str, int]:
        counts: dict[str, int] = {r.value: 0 for r in UserRole}
        try:
            profiles = self.list_all(limit=1000, offset=0)
        except APIError:
            return counts
        for profile in profiles:
            counts[profile.role.value] = counts.get(profile.role.value, 0) + 1
        return counts

    def update_role(self, user_id: str, role: str) -> Profile | None:
        parsed = (
            UserRole(role) if role in UserRole._value2member_map_ else UserRole.STUDENT
        )
        try:
            result = (
                self.client.table("profiles")
                .update({"role": parsed.value})
                .eq("id", user_id)
                .execute()
            )
        except APIError as exc:
            if is_missing_table_error(exc, "profiles"):
                return None
            raise
        data = response_data(result)
        if isinstance(data, list):
            data = data[0] if data else None
        return profile_from_row(data) if data else None

    def update_profile(
        self,
        user_id: str,
        *,
        full_name: str | None = None,
        avatar_url: str | None = None,
    ) -> Profile | None:
        updates: dict[str, str] = {}
        if full_name is not None:
            updates["full_name"] = full_name.strip()
        if avatar_url is not None:
            updates["avatar_url"] = avatar_url.strip()
        if not updates:
            return self.get_by_id(user_id)
        try:
            result = (
                self.client.table("profiles")
                .update(updates)
                .eq("id", user_id)
                .execute()
            )
        except APIError as exc:
            if is_missing_table_error(exc, "profiles"):
                return None
            raise
        data = response_data(result)
        if isinstance(data, list):
            data = data[0] if data else None
        return profile_from_row(data) if data else None
