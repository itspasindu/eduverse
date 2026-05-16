from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.dependencies import require_roles
from app.models.enums import TutorMode, UserRole
from app.models.user import UserPublic
from app.services.ai.models import MemeResult, PresentationResult, TutorResult
from app.services.ai.orchestrator import AIOrchestrator, get_ai_orchestrator

router = APIRouter(prefix="/ai", tags=["ai"])


class MemeGenerateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)


@router.post("/meme", response_model=MemeResult)
async def generate_meme(
    payload: MemeGenerateRequest,
    orchestrator: AIOrchestrator = Depends(get_ai_orchestrator),
) -> MemeResult:
    ai = orchestrator
    try:
        return await ai.generate_meme(payload.text)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Meme generation failed: {exc}",
        ) from exc


class TutorRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=4000)
    context: str | None = Field(default=None, max_length=8000)
    mode: TutorMode = TutorMode.STANDARD


@router.post("/tutor", response_model=TutorResult)
async def ask_tutor(
    payload: TutorRequest,
    orchestrator: AIOrchestrator = Depends(get_ai_orchestrator),
) -> TutorResult:
    try:
        return await orchestrator.ask_tutor(
            payload.question,
            payload.context,
            mode=payload.mode.value,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Tutor request failed: {exc}",
        ) from exc


class PresentationGenerateRequest(BaseModel):
    notes: str = Field(..., min_length=1, max_length=12000)
    title: str | None = Field(default=None, max_length=200)
    font_style: str = Field(default="modern-sans", max_length=40)


@router.post("/presentation", response_model=PresentationResult)
async def generate_presentation(
    payload: PresentationGenerateRequest,
    _user: UserPublic = Depends(
        require_roles(UserRole.CREATOR.value, UserRole.ADMIN.value),
    ),
    orchestrator: AIOrchestrator = Depends(get_ai_orchestrator),
) -> PresentationResult:
    try:
        return await orchestrator.generate_presentation(
            payload.notes,
            title=payload.title,
            font_style=payload.font_style,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Presentation generation failed: {exc}",
        ) from exc
