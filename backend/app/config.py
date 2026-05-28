from pathlib import Path
from typing import Any, Literal

from pydantic import AliasChoices, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Always load backend/.env regardless of process working directory
_BACKEND_DIR = Path(__file__).resolve().parents[1]
_ENV_FILE = _BACKEND_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE) if _ENV_FILE.is_file() else ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: Literal["development", "production"] = "development"
    health_db_token: str = ""

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""
    # Optional: Postgres URI for scripts/apply_lesson_migrations.py (Dashboard → Database → URI)
    supabase_db_url: str = Field(
        default="",
        validation_alias=AliasChoices("SUPABASE_DB_URL", "DATABASE_URL"),
    )
    # Database password from Supabase Dashboard -> Settings -> Database (not the service role JWT)
    supabase_db_password: str = Field(default="", validation_alias="SUPABASE_DB_PASSWORD")

    # fal.ai / AI Orchestrator
    fal_key: str = ""
    fal_mock_mode: bool = False
    fal_meme_model: str = "fal-ai/flux/schnell"
    fal_image_model: str = "fal-ai/flux/schnell"
    fal_video_model: str = "fal-ai/minimax/hailuo-02/standard/image-to-video"
    fal_vision_model: str = "fal-ai/florence-2-large/caption"
    fal_tts_model: str = "fal-ai/minimax/speech-02-hd"
    fal_llm_endpoint: str = "fal-ai/any-llm"
    fal_llm_model: str = "google/gemini-2.0-flash-001"
    fal_llm_max_tokens: int = 1024
    fal_request_timeout: float = 120.0
    fal_character_model: str = "fal-ai/flux/schnell"
    fal_lesson_workflow_id: str = ""
    # Animate each scene (image-to-video) and mux character voice into the MP4 (needs ffmpeg).
    lesson_enable_video_clips: bool = Field(default=True, validation_alias="LESSON_ENABLE_VIDEO_CLIPS")
    lesson_video_timeout: float = Field(default=180.0, validation_alias="LESSON_VIDEO_TIMEOUT")
    lesson_mux_voice_into_video: bool = Field(
        default=True,
        validation_alias="LESSON_MUX_VOICE_INTO_VIDEO",
    )
    # Target length for the single combined lesson video (1–2 minutes).
    lesson_scene_target_seconds: float = Field(
        default=90.0,
        validation_alias="LESSON_SCENE_TARGET_SECONDS",
    )

    # Lesson features (file-based; no Supabase tables required)
    lesson_data_dir: Path = Field(
        default_factory=lambda: _BACKEND_DIR / "data" / "lessons",
        validation_alias="LESSON_DATA_DIR",
    )
    # Public base URL for material file downloads (e.g. http://localhost:8000)
    api_public_url: str = Field(default="http://localhost:8000", validation_alias="API_PUBLIC_URL")
    frontend_public_url: str = Field(
        default="https://eduverse-gold-mu.vercel.app",
        validation_alias="FRONTEND_PUBLIC_URL",
    )

    # PayHere (https://sandbox.payhere.lk for testing)
    payhere_merchant_id: str = Field(default="", validation_alias="PAYHERE_MERCHANT_ID")
    payhere_merchant_secret: str = Field(default="", validation_alias="PAYHERE_MERCHANT_SECRET")
    payhere_sandbox: bool = Field(default=True, validation_alias="PAYHERE_SANDBOX")
    payhere_currency: str = Field(default="USD", validation_alias="PAYHERE_CURRENCY")

    # Learning agent — search_api_key OR tavily/serper keys from your .env
    agent_max_turns: int = 6
    search_api_key: str = ""
    search_provider: str = "tavily"  # tavily | serper
    tavily_api_key: str = Field(default="", validation_alias="TAVILY_API_KEY")
    serper_api_key: str = Field(default="", validation_alias="SERPER_API_KEY")

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
        "https://eduverse-gold-mu.vercel.app",
        "https://eduverse-gold-mu.netlify.app",
        "https://eduverse-cfp1.onrender.com",
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
        base = (
            "/health",
            "/ws/feed",
            "/subscriptions/plans",
            "/subscriptions/payhere/notify",
            "/subscriptions/payhere/return",
            "/subscriptions/payhere/cancel",
        )
        if not self.is_production:
            return (
                *base,
                "/posts/feed",
                "/ai/meme",
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

    @field_validator(
        "supabase_url",
        "supabase_anon_key",
        "supabase_service_role_key",
        "supabase_jwt_secret",
        "supabase_db_password",
        "fal_key",
        "search_api_key",
        "tavily_api_key",
        "serper_api_key",
        "payhere_merchant_id",
        "payhere_merchant_secret",
        mode="before",
    )
    @classmethod
    def strip_whitespace(cls, value: Any) -> Any:
        if isinstance(value, str):
            return value.strip()
        return value

    @model_validator(mode="after")
    def resolve_search_api_key(self) -> "Settings":
        if self.search_api_key:
            return self
        provider = (self.search_provider or "tavily").lower()
        if provider == "serper" and self.serper_api_key:
            self.search_api_key = self.serper_api_key
        elif self.tavily_api_key:
            self.search_api_key = self.tavily_api_key
        elif self.serper_api_key:
            self.search_api_key = self.serper_api_key
        return self

    @property
    def ai_live(self) -> bool:
        return bool(self.fal_key) and not self.fal_mock_mode

    @property
    def search_live(self) -> bool:
        return bool(self.search_api_key)


def get_settings() -> Settings:
    """Load settings from backend/.env on each call (so .env edits apply after uvicorn reload)."""
    return Settings()
