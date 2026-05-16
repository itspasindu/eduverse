from fastapi import HTTPException, status

from app.core.moderation.filter import contains_profanity
from app.core.moderation.words import STRIKES_BEFORE_SUSPEND


class ModerationService:
    def enforce_clean_text(self, user_id: str, *texts: str | None) -> None:
        from app.services.auth.repository import ProfileRepository

        profiles = ProfileRepository()
        combined = " ".join(t.strip() for t in texts if t and t.strip())
        if not combined:
            return
        if not contains_profanity(combined):
            return

        strikes, suspended = profiles.record_moderation_strike(user_id)

        from app.services.audit.repository import AuditRepository

        AuditRepository().log(
            actor_id=user_id,
            action="moderation_strike",
            target_type="user",
            target_id=user_id,
            metadata={"strikes": strikes, "suspended": suspended},
        )

        if suspended:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "account_suspended",
                    "message": (
                        "Your account has been suspended after repeated "
                        "use of inappropriate language. Contact support if "
                        "you believe this is a mistake."
                    ),
                    "strikes": strikes,
                    "suspended": True,
                },
            )

        remaining = max(0, STRIKES_BEFORE_SUSPEND - strikes)
        warning = (
            "Inappropriate language is not allowed. "
            f"Warning {strikes} of {STRIKES_BEFORE_SUSPEND}: "
            f"{remaining} violation(s) remaining before your account is suspended."
        )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "profanity",
                "message": warning,
                "strikes": strikes,
                "suspended": False,
                "remaining": remaining,
            },
        )


def enforce_clean_text(user_id: str, *texts: str | None) -> None:
    ModerationService().enforce_clean_text(user_id, *texts)
