from fastapi import HTTPException, status

from app.models.user import UserPublic
from app.services.auth.repository import ProfileRepository


class AuthService:
    def __init__(self):
        self.repo = ProfileRepository()

    def get_me(self, user_id: str) -> UserPublic:
        profile = self.repo.get_by_id(user_id)
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        return UserPublic.model_validate(profile)
