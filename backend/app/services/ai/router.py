from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from app.config import get_settings
from app.core.dependencies import require_active_user
from app.core.errors import raise_ai_error
from app.core.moderation.service import enforce_clean_text
from app.core.rate_limit import rate_limit_user
from app.models.enums import TutorMode
from app.models.user import UserPublic
from app.services.ai.models import MemeResult, PresentationResult, TutorResult
from app.services.ai.orchestrator import AIOrchestrator, get_ai_orchestrator
from app.services.ai.usage import check_and_increment_ai_usage

router = APIRouter(prefix="/ai", tags=["ai"])


def enforce_ai_rate_limit(request: Request) -> None:
    settings = get_settings()
    rate_limit_user(
        request,
        limit=settings.rate_limit_ai_per_hour,
        window_seconds=3600,
        prefix="ai",
    )


class MemeGenerateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)


@router.post("/meme", response_model=MemeResult)
async def generate_meme(
    payload: MemeGenerateRequest,
    user: UserPublic = Depends(require_active_user),
    orchestrator: AIOrchestrator = Depends(get_ai_orchestrator),
    _rate: None = Depends(enforce_ai_rate_limit),
) -> MemeResult:
    check_and_increment_ai_usage(str(user.id), user.role)
    enforce_clean_text(str(user.id), payload.text)
    try:
        return await orchestrator.generate_meme(payload.text)
    except Exception as exc:
        raise_ai_error(exc, operation="Meme generation")


class TutorRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=4000)
    context: str | None = Field(default=None, max_length=8000)
    mode: TutorMode = TutorMode.STANDARD


@router.post("/tutor", response_model=TutorResult)
async def ask_tutor(
    payload: TutorRequest,
    user: UserPublic = Depends(require_active_user),
    orchestrator: AIOrchestrator = Depends(get_ai_orchestrator),
    _rate: None = Depends(enforce_ai_rate_limit),
) -> TutorResult:
    check_and_increment_ai_usage(str(user.id), user.role)
    enforce_clean_text(str(user.id), payload.question, payload.context)
    try:
        return await orchestrator.ask_tutor(
            payload.question,
            payload.context,
            mode=payload.mode.value,
        )
    except Exception as exc:
        raise_ai_error(exc, operation="Tutor")


class PresentationGenerateRequest(BaseModel):
    notes: str = Field(..., min_length=1, max_length=12000)
    title: str | None = Field(default=None, max_length=200)
    font_style: str = Field(default="modern-sans", max_length=40)
    include_images: bool = True


@router.post("/presentation", response_model=PresentationResult)
async def generate_presentation(
    payload: PresentationGenerateRequest,
    user: UserPublic = Depends(require_active_user),
    orchestrator: AIOrchestrator = Depends(get_ai_orchestrator),
    _rate: None = Depends(enforce_ai_rate_limit),
) -> PresentationResult:
    check_and_increment_ai_usage(str(user.id), user.role)
    enforce_clean_text(str(user.id), payload.notes, payload.title)
    try:
        return await orchestrator.generate_presentation(
            payload.notes,
            title=payload.title,
            font_style=payload.font_style,
            include_images=payload.include_images,
        )
    except Exception as exc:
        raise_ai_error(exc, operation="Presentation generation")
