"""Central AI Orchestrator for EduVerse multimodal workflows."""

from __future__ import annotations

from functools import lru_cache

from app.config import Settings, get_settings
from app.services.ai.exceptions import AIOrchestratorError
from app.services.ai.helpers.fal import (
    configure_fal_key,
    extract_image_url,
    extract_video_url,
    image_to_video,
    resolve_image_input,
    text_to_image,
)
from app.services.ai.helpers.llm import TUTOR_MODE_PROMPTS, ask_llm, mock_tutor_answer
from app.services.ai.helpers.meme_captions import generate_meme_captions
from app.services.ai.helpers.presentations import generate_presentation_slides
from app.services.ai.models import (
    MemeResult,
    PresentationResult,
    PresentationSlide,
    TutorResult,
    VideoResult,
)


class AIOrchestrator:
    """
    Single entry point for all AI capabilities.

    Routes meme generation, tutoring, and image-to-video through
    abstracted fal.ai / LLM helpers.
    """

    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()
        configure_fal_key(self.settings.fal_key)

    async def generate_meme(self, text: str) -> MemeResult:
        """Generate meme: readable English captions + image without baked-in text."""
        if not text.strip():
            raise AIOrchestratorError("Meme prompt cannot be empty")

        captions = await generate_meme_captions(text, self.settings)
        image_prompt = self._build_meme_image_prompt(text)
        raw = await text_to_image(
            image_prompt,
            model=self.settings.fal_meme_model,
            num_images=1,
            timeout=self.settings.fal_request_timeout,
        )
        image_url = extract_image_url(raw)

        use_free_captions = self.settings.fal_mock_mode or not self.settings.fal_key
        caption_source = "template" if use_free_captions else "llm"

        return MemeResult(
            image_url=image_url,
            prompt=image_prompt,
            model=self.settings.fal_meme_model,
            top_text=captions["top_text"],
            bottom_text=captions["bottom_text"],
            caption_source=caption_source,
        )

    async def generate_video(self, image: str, *, prompt: str | None = None) -> VideoResult:
        """Generate a short video from a source image (image → video)."""
        if not image.strip():
            raise AIOrchestratorError("Image input cannot be empty")

        image_url = await resolve_image_input(image)
        raw = await image_to_video(
            image_url,
            model=self.settings.fal_video_model,
            prompt=prompt,
            timeout=self.settings.fal_request_timeout,
        )
        video_url = extract_video_url(raw)

        return VideoResult(
            video_url=video_url,
            source_image=image_url,
            model=self.settings.fal_video_model,
        )

    async def ask_tutor(
        self,
        question: str,
        context: str | None = None,
        mode: str = "standard",
    ) -> TutorResult:
        """Answer a learning question using the configured LLM."""
        if not question.strip():
            raise AIOrchestratorError("Tutor question cannot be empty")

        tutor_mode = mode if mode in TUTOR_MODE_PROMPTS else "standard"
        system_prompt = TUTOR_MODE_PROMPTS[tutor_mode]

        if self.settings.fal_mock_mode or not self.settings.fal_key:
            answer = mock_tutor_answer(question.strip(), tutor_mode)
        else:
            answer = await ask_llm(
                question.strip(),
                context,
                model=self.settings.fal_llm_model,
                endpoint=self.settings.fal_llm_endpoint,
                max_tokens=self.settings.fal_llm_max_tokens,
                timeout=self.settings.fal_request_timeout,
                system_prompt=system_prompt,
            )

        return TutorResult(
            answer=answer,
            question=question.strip(),
            model=self.settings.fal_llm_model,
            mode=tutor_mode,
            context_used=bool(context and context.strip()),
        )

    async def generate_presentation(
        self,
        notes: str,
        *,
        title: str | None = None,
        font_style: str = "modern-sans",
    ) -> PresentationResult:
        """Turn study notes into a structured slide deck with typography style."""
        if not notes.strip():
            raise AIOrchestratorError("Notes cannot be empty")

        data = await generate_presentation_slides(
            notes,
            title=title,
            font_style=font_style,
            settings=self.settings,
        )
        slides = [
            PresentationSlide(
                title=s["title"],
                bullets=s.get("bullets") or [],
                speaker_notes=s.get("speaker_notes") or "",
            )
            for s in data["slides"]
        ]
        return PresentationResult(
            title=data["title"],
            font_style=data["font_style"],
            slides=slides,
            model=self.settings.fal_llm_model,
            source=data.get("source", "llm"),
        )

    @staticmethod
    def _build_meme_image_prompt(text: str) -> str:
        """Scene-only prompt — captions are rendered in the UI, not in the image."""
        return (
            f"Humorous photorealistic scene about: {text.strip()}. "
            "Single clear subject, expressive face or situation, meme-worthy composition, "
            "soft office or desk lighting, 4:3 aspect ratio. "
            "CRITICAL: absolutely no text, no words, no letters, no numbers, "
            "no captions, no labels, no watermarks, no logos, no typography anywhere in the image."
        )


@lru_cache
def get_ai_orchestrator() -> AIOrchestrator:
    return AIOrchestrator()
