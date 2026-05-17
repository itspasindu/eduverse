from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from app.config import get_settings
from app.core.dependencies import (
    get_current_user_id,
    get_current_user_public,
    require_active_user,
)
from app.core.errors import raise_ai_error
from app.core.moderation.service import enforce_clean_text
from app.core.rate_limit import rate_limit_user
from app.models.enums import TutorMode
from app.models.user import UserPublic
from app.services.ai.agent.learning_agent import EduVerseLearningAgent, get_learning_agent
from app.services.ai.agent.models import AgentResult
from app.services.ai.models import (
    AgentChatResult,
    AgentStepModel,
    LessonVideoResult,
    MemeResult,
    PresentationResult,
    TutorResult,
)
from app.services.ai.orchestrator import AIOrchestrator, get_ai_orchestrator
from app.services.ai.usage import check_and_increment_ai_usage
from app.services.characters.service import CharacterService
from app.services.content.materials_service import MaterialsService

router = APIRouter(prefix="/ai", tags=["ai"])


def enforce_ai_rate_limit(request: Request) -> None:
    settings = get_settings()
    rate_limit_user(
        request,
        limit=settings.rate_limit_ai_per_hour,
        window_seconds=3600,
        prefix="ai",
    )


def get_character_service() -> CharacterService:
    return CharacterService()


def get_materials_service() -> MaterialsService:
    return MaterialsService()


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


class AgentChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    mode: TutorMode = TutorMode.STANDARD
    character_id: str | None = None
    material_ids: list[str] = Field(default_factory=list, max_length=5)


def _agent_result_to_response(result: AgentResult) -> AgentChatResult:
    return AgentChatResult(
        answer=result.answer,
        message=result.message,
        model=result.model,
        mode=result.mode,
        steps=[
            AgentStepModel(
                step_type=s.step_type,
                tool_name=s.tool_name,
                input=s.input,
                output=s.output,
            )
            for s in result.steps
        ],
        character_id=result.character_id,
        context_used=result.context_used,
    )


@router.post("/agent/chat", response_model=AgentChatResult)
async def agent_chat(
    payload: AgentChatRequest,
    user: UserPublic = Depends(get_current_user_public),
    agent: EduVerseLearningAgent = Depends(get_learning_agent),
    char_service: CharacterService = Depends(get_character_service),
    materials: MaterialsService = Depends(get_materials_service),
    _rate: None = Depends(enforce_ai_rate_limit),
) -> AgentChatResult:
    check_and_increment_ai_usage(str(user.id), user.role)
    enforce_clean_text(str(user.id), payload.message)
    persona = char_service.persona_for_agent(payload.character_id, str(user.id))

    material_context = ""
    if payload.material_ids:
        chunks: list[str] = []
        for mid in payload.material_ids[:5]:
            try:
                text = materials.get_material_text(str(user.id), mid)
                if text:
                    chunks.append(text[:3000])
            except HTTPException:
                continue
        material_context = "\n\n---\n\n".join(chunks)

    try:
        result = await agent.chat(
            payload.message,
            mode=payload.mode.value,
            character_persona=persona,
            material_context=material_context or None,
        )
        result.character_id = payload.character_id
        return _agent_result_to_response(result)
    except Exception as exc:
        raise_ai_error(exc, operation="Agent chat")


class TutorRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=4000)
    context: str | None = Field(default=None, max_length=8000)
    mode: TutorMode = TutorMode.STANDARD
    character_id: str | None = None


@router.post("/tutor", response_model=TutorResult)
async def ask_tutor(
    payload: TutorRequest,
    user: UserPublic = Depends(require_active_user),
    agent: EduVerseLearningAgent = Depends(get_learning_agent),
    char_service: CharacterService = Depends(get_character_service),
    _rate: None = Depends(enforce_ai_rate_limit),
) -> TutorResult:
    check_and_increment_ai_usage(str(user.id), user.role)
    enforce_clean_text(str(user.id), payload.question, payload.context)
    persona = char_service.persona_for_agent(payload.character_id, str(user.id))
    try:
        result = await agent.chat(
            payload.question,
            mode=payload.mode.value,
            character_persona=persona,
            material_context=payload.context,
        )
        steps = [
            {
                "step_type": s.step_type,
                "tool_name": s.tool_name,
                "input": s.input,
                "output": s.output,
            }
            for s in result.steps
        ]
        return TutorResult(
            answer=result.answer,
            question=payload.question.strip(),
            model=result.model,
            mode=result.mode,
            context_used=bool(persona or payload.context),
            steps=steps,
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


class LessonVideoRequest(BaseModel):
    material_id: str
    character_id: str | None = None


@router.post("/lesson-video", response_model=LessonVideoResult, status_code=status.HTTP_202_ACCEPTED)
async def start_lesson_video(
    payload: LessonVideoRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
    orchestrator: AIOrchestrator = Depends(get_ai_orchestrator),
    materials: MaterialsService = Depends(get_materials_service),
    char_service: CharacterService = Depends(get_character_service),
    _rate: None = Depends(enforce_ai_rate_limit),
) -> LessonVideoResult:
    text = await materials.ensure_material_text(user_id, payload.material_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Could not read text from this file. Try a .txt or .md file with plain text, "
                "or re-upload your material."
            ),
        )

    bible = ""
    ref_url: str | None = None
    voice_style = "friendly"
    if payload.character_id:
        char = char_service.get_character(user_id, payload.character_id)
        bible = char.character_bible or f"{char.name}: {char.visual_description}"
        ref_url = char.reference_image_url
        voice_style = char.voice_style or "friendly"

    job_id = orchestrator.create_lesson_video_job(
        user_id,
        payload.material_id,
        payload.character_id,
    )

    background_tasks.add_task(
        orchestrator.process_lesson_video_job,
        job_id,
        material_text=text,
        character_bible=bible,
        reference_image_url=ref_url,
        voice_style=voice_style,
    )

    return LessonVideoResult(
        job_id=job_id,
        status="pending",
        progress=0,
    )


@router.get("/lesson-video/{job_id}", response_model=LessonVideoResult)
def get_lesson_video_job(
    job_id: str,
    user_id: str = Depends(get_current_user_id),
    orchestrator: AIOrchestrator = Depends(get_ai_orchestrator),
) -> LessonVideoResult:
    try:
        return orchestrator.get_lesson_video_job(job_id, user_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.get("/lesson-video/{job_id}/file")
def get_lesson_video_file(
    job_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Serve the full muxed lesson MP4 (one continuous video)."""
    from app.services.ai.pipelines.lesson_media import lesson_render_path
    from app.services.ai.pipelines.lesson_video_jobs import LessonVideoJobRepository

    row = LessonVideoJobRepository().get(job_id)
    if not row or str(row["user_id"]) != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    path = lesson_render_path(get_settings(), job_id)
    # #region agent log
    from app.debug_log import debug_log

    debug_log(
        "ai/router.py:get_lesson_video_file",
        "serve lesson file",
        {
            "job_id": job_id,
            "exists": path.is_file(),
            "bytes": path.stat().st_size if path.is_file() else 0,
        },
        hypothesis_id="H3",
    )
    # #endregion
    if not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson video not ready")

    return FileResponse(path, media_type="video/mp4", filename="lesson.mp4")


@router.get("/lesson-video/{job_id}/scenes/{scene_index}/file")
def get_lesson_scene_video_file(
    job_id: str,
    scene_index: int,
    user_id: str = Depends(get_current_user_id),
):
    """Serve muxed lesson scene MP4 (video + character voice)."""
    from app.services.ai.pipelines.lesson_media import scene_render_path
    from app.services.ai.pipelines.lesson_video_jobs import LessonVideoJobRepository

    row = LessonVideoJobRepository().get(job_id)
    if not row or str(row["user_id"]) != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    path = scene_render_path(get_settings(), job_id, scene_index)
    if not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scene video not ready")

    return FileResponse(path, media_type="video/mp4", filename=f"scene_{scene_index}.mp4")
