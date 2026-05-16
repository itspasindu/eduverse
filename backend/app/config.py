from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: Literal["development", "production"] = "development"
    health_db_token: str = ""

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    # fal.ai / AI Orchestrator
    fal_key: str = ""
    fal_mock_mode: bool = False
    fal_meme_model: str = "fal-ai/flux/schnell"
    fal_image_model: str = "fal-ai/flux/schnell"
    fal_video_model: str = "fal-ai/minimax-video/image-to-video"
    fal_vision_model: str = "fal-ai/florence-2-large/caption"
    fal_tts_model: str = "fal-ai/kokoro/american-english"
    fal_llm_endpoint: str = "fal-ai/any-llm"
    fal_llm_model: str = "google/gemini-2.0-flash-001"
    fal_llm_max_tokens: int = 1024
    fal_request_timeout: float = 120.0

    # Rate limits
    rate_limit_ai_per_hour: int = 30
    rate_limit_auth_per_minute: int = 15
    ai_daily_cap_student: int = 50
    ai_daily_cap_creator: int = 200
    max_request_body_bytes: int = 2_097_152

    # Comma-separated HTTPS hosts for content_url / avatar_url
    allowed_url_hosts: list[str] = [
        "picsum.photos",
        "fal.media",
        "fal.run",
    ]

    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://172.20.192.1:3000",
    ]
    cors_origin_regex: str = (
        r"https?://(localhost|127\.0\.0\.1|"
        r"10\.\d{1,3}\.\d{1,3}\.\d{1,3}|"
        r"172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|"
        r"192\.168\.\d{1,3}\.\d{1,3})(:\d+)?$"
    )

    @field_validator("allowed_url_hosts", "cors_origins", mode="before")
    @classmethod
    def split_csv(cls, value: object) -> object:
        if isinstance(value, str):
            return [v.strip() for v in value.split(",") if v.strip()]
        return value

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def public_paths(self) -> tuple[str, ...]:
        base = ("/health", "/ws/feed")
        if not self.is_production:
            return (
                *base,
                "/posts/feed",
                "/docs",
                "/redoc",
                "/openapi.json",
                "/health/db",
            )
        return base

    def validate_production_secrets(self) -> None:
        if not self.is_production:
            return
        missing = [
            name
            for name, val in (
                ("SUPABASE_URL", self.supabase_url),
                ("SUPABASE_SERVICE_ROLE_KEY", self.supabase_service_role_key),
                ("SUPABASE_JWT_SECRET", self.supabase_jwt_secret),
                ("FAL_KEY", self.fal_key),
            )
            if not val
        ]
        if missing:
            raise RuntimeError(
                f"Missing required production env vars: {', '.join(missing)}"
            )


@lru_cache
def get_settings() -> Settings:
    return Settings()
