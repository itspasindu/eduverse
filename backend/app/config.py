from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

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

    # Comma-separated in .env: CORS_ORIGINS=http://localhost:3000,http://172.20.192.1:3000
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://172.20.192.1:3000",
    ]
    # Allows LAN / WSL dev URLs like http://172.x.x.x:3000
    cors_origin_regex: str = (
        r"https?://(localhost|127\.0\.0\.1|"
        r"10\.\d{1,3}\.\d{1,3}\.\d{1,3}|"
        r"172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|"
        r"192\.168\.\d{1,3}\.\d{1,3})(:\d+)?$"
    )

    public_paths: tuple[str, ...] = (
        "/posts/feed",
        "/ai/meme",
        "/ai/tutor",
        "/docs",
        "/redoc",
        "/openapi.json",
        "/health",
        "/health/db",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
