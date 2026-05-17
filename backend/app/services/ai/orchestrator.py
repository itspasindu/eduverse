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
from app.services.ai.helpers.meme_captions import (
    build_meme_post_caption,
    generate_feed_caption,
    generate_meme_captions,
)
from app.services.ai.helpers.presentation_images import attach_slide_images
from app.services.ai.helpers.presentations import generate_presentation_slides
from app.services.ai.pipelines.lesson_video import run_lesson_video_job
from app.services.ai.pipelines.lesson_video_jobs import LessonVideoJobRepository
from app.services.ai.models import (
    LessonScene,
    LessonVideoResult,
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
        feed_caption = generate_feed_caption(
            text, captions["top_text"], captions["bottom_text"]
        )
        post_caption = build_meme_post_caption(
            feed_caption, captions["top_text"], captions["bottom_text"]
        )

        return MemeResult(
            image_url=image_url,
            prompt=image_prompt,
            model=self.settings.fal_meme_model,
            top_text=captions["top_text"],
            bottom_text=captions["bottom_text"],
            feed_caption=feed_caption,
            post_caption=post_caption,
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
        include_images: bool = True,
    ) -> PresentationResult:
        """Turn study notes into a structured slide deck with typography and visuals."""
        if not notes.strip():
            raise AIOrchestratorError("Notes cannot be empty")

        data = await generate_presentation_slides(
            notes,
            title=title,
            font_style=font_style,
            settings=self.settings,
        )
        slide_rows = await attach_slide_images(
            data["slides"],
            deck_title=data["title"],
            font_style=data["font_style"],
            include_images=include_images,
            settings=self.settings,
        )
        slides = [
            PresentationSlide(
                title=s["title"],
                bullets=s.get("bullets") or [],
                speaker_notes=s.get("speaker_notes") or "",
                image_url=s.get("image_url"),
            )
            for s in slide_rows
        ]
        image_model = (
            self.settings.fal_image_model
            if include_images and not self.settings.fal_mock_mode
            else "placeholder"
        )
        return PresentationResult(
            title=data["title"],
            font_style=data["font_style"],
            slides=slides,
            model=f"{self.settings.fal_llm_model}+{image_model}",
            source=data.get("source", "llm"),
        )

    async def design_character_bible(
        self,
        *,
        name: str,
        personality: str,
        teaching_style: str,
        visual_description: str,
        voice_style: str,
    ) -> str:
        """Expand a student/teacher brief into a consistent character bible."""
        if self.settings.fal_mock_mode or not self.settings.fal_key:
            return (
                f"{name} is a {personality or 'encouraging'} tutor. "
                f"Appearance: {visual_description}. "
                f"Teaching style: {teaching_style or 'clear and patient'}. "
                f"Voice: {voice_style}."
            )

        from app.services.ai.helpers.llm import ask_llm

        prompt = (
            f"Name: {name}\nPersonality: {personality}\n"
            f"Teaching style: {teaching_style}\nVisual: {visual_description}\n"
            f"Voice: {voice_style}\n\n"
            "Write a 150-word character bible for an educational mascot. "
            "Include appearance, outfit colors, age vibe, and how they teach."
        )
        return await ask_llm(
            prompt,
            None,
            model=self.settings.fal_llm_model,
            endpoint=self.settings.fal_llm_endpoint,
            max_tokens=512,
            timeout=self.settings.fal_request_timeout,
            system_prompt="You create unique educational character bibles. Be vivid and specific.",
        )

    async def generate_character_reference(
        self,
        bible: str,
        *,
        owner_id: str,
    ) -> tuple[str | None, list[str]]:
        """Generate reference art for a custom character via fal."""
        prompt = (
            f"Original educational mascot character portrait, full design: {bible[:800]}. "
            "Single character, expressive face, consistent outfit, studio lighting, "
            "3:4 portrait, no text, no watermark, not a celebrity or copyrighted character."
        )

        if self.settings.fal_mock_mode or not self.settings.fal_key:
            url = "https://placehold.co/512x640/png?text=Character"
            return url, [url]

        raw = await text_to_image(
            prompt,
            model=self.settings.fal_character_model,
            image_size="portrait_4_3",
            num_images=1,
            timeout=self.settings.fal_request_timeout,
        )
        primary = extract_image_url(raw)
        return primary, [primary] if primary else []

    def create_lesson_video_job(
        self,
        user_id: str,
        material_id: str,
        character_id: str | None,
    ) -> str:
        row = LessonVideoJobRepository().create(
            {
                "user_id": user_id,
                "material_id": material_id,
                "character_id": character_id,
                "status": "pending",
                "progress": 0,
            },
        )
        return str(row["id"])

    async def process_lesson_video_job(
        self,
        job_id: str,
        *,
        material_text: str,
        character_bible: str,
        reference_image_url: str | None,
        voice_style: str = "friendly",
    ) -> None:
        await run_lesson_video_job(
            job_id,
            material_text=material_text,
            character_bible=character_bible,
            reference_image_url=reference_image_url,
            voice_style=voice_style,
            settings=self.settings,
        )

    def get_lesson_video_job(self, job_id: str, user_id: str) -> LessonVideoResult:
        row = LessonVideoJobRepository().get(job_id)
        if not row or str(row["user_id"]) != user_id:
            raise AIOrchestratorError("Job not found")

        scenes_raw = row.get("scenes_json") or []
        if isinstance(scenes_raw, str):
            import json

            scenes_raw = json.loads(scenes_raw)

        scenes = [LessonScene.model_validate(s) for s in scenes_raw]
        return LessonVideoResult(
            job_id=str(row["id"]),
            status=str(row["status"]),
            progress=int(row.get("progress") or 0),
            title=str(row.get("title") or ""),
            phase=row.get("phase"),
            scenes=scenes,
            playlist_url=row.get("playlist_url"),
            cover_image_url=row.get("cover_image_url"),
            video_mode=row.get("video_mode"),
            error=row.get("error_message"),
        )

    @staticmethod
    def _build_meme_image_prompt(text: str) -> str:
        """Scene-only prompt — captions are rendered in the UI, not in the image."""
        return (
            f"Humorous photorealistic scene about: {text.strip()}. "
            "Single clear subject, expressive face or situation, meme-worthy composition, "
            "soft office or desk lighting, 4:3 aspect ratio, clean background. "
            "CRITICAL: absolutely no text, no words, no letters, no numbers, no writing, "
            "no captions, no subtitles, no signs, no labels, no watermarks, no logos, "
            "no typography, no speech bubbles, no UI elements anywhere in the image."
        )


@lru_cache
def get_ai_orchestrator() -> AIOrchestrator:
    return AIOrchestrator()
