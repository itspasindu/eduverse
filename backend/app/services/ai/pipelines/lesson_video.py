"""Lesson video pipeline: one script → one image → one voice track → one MP4."""

from __future__ import annotations

import asyncio
import json
import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

from app.config import Settings
from app.services.ai.exceptions import AIOrchestratorError
from app.services.ai.helpers.fal import (
    extract_image_url,
    extract_video_url,
    image_to_video,
    run_fal_model,
    text_to_image,
)
from app.services.ai.helpers.llm import _extract_llm_text
from app.services.ai.pipelines.lesson_media import (
    build_lesson_video_from_image_and_audio,
    build_lesson_video_with_voice,
    ffmpeg_available,
)
from app.services.ai.pipelines.lesson_video_jobs import LessonVideoJobRepository
from app.debug_log import debug_log
from app.services.fal import parsers
from app.services.fal.mocks import MOCK_AUDIO_URL

VOICE_STYLE_TO_MINIMAX: dict[str, str] = {
    "friendly": "Wise_Woman",
    "warm": "Calm_Woman",
    "calm": "Calm_Woman",
    "energetic": "Lively_Girl",
    "professional": "Deep_Voice_Man",
    "deep": "Deep_Voice_Man",
    "childlike": "Cute_Girl",
}

VOICE_STYLE_TO_KOKORO: dict[str, str] = {
    "friendly": "af_bella",
    "warm": "af_heart",
    "calm": "af_sarah",
    "energetic": "af_nova",
    "professional": "am_michael",
    "deep": "am_adam",
    "childlike": "af_sky",
}


def _minimax_voice(voice_style: str) -> str:
    key = (voice_style or "friendly").strip().lower()
    return VOICE_STYLE_TO_MINIMAX.get(key, "Wise_Woman")


def _kokoro_voice(voice_style: str) -> str:
    key = (voice_style or "friendly").strip().lower()
    return VOICE_STYLE_TO_KOKORO.get(key, "af_bella")


def _tts_payload(text: str, voice_style: str, model: str) -> dict[str, Any]:
    snippet = text.strip()[:4000]
    if "kokoro" in model:
        return {"text": snippet[:500], "voice": _kokoro_voice(voice_style)}
    return {
        "text": snippet,
        "voice_setting": {"voice_id": _minimax_voice(voice_style)},
        "output_format": "url",
    }


SCRIPT_SYSTEM = """You are an educational video scriptwriter.
From the study material, write ONE continuous lesson the character will read aloud as a single video (about 1–2 minutes when spoken).

Return ONLY valid JSON:
{
  "title": "Lesson title",
  "narration": "One flowing script, 180–220 words, teaching real facts from the material",
  "visual_prompt": "One cohesive scene description for the whole lesson (character, setting, mood)",
  "outline": [
    {"title": "Chapter name", "summary": "One sentence about this part of the lesson"}
  ]
}

Include 3–4 outline chapters for structure only (not separate videos).
No markdown, no code fences."""


def _cap_narration(narration: str, target_seconds: float) -> str:
    words = narration.split()
    max_words = max(120, int(target_seconds * 2.3))
    if len(words) <= max_words:
        return narration.strip()
    trimmed = " ".join(words[:max_words]).rstrip(".,;:")
    return f"{trimmed}…"


async def generate_lesson_script(material_text: str, settings: Settings) -> dict[str, Any]:
    if settings.fal_mock_mode or not settings.fal_key:
        return _mock_script(material_text)

    snippet = material_text[:8000]
    result = await run_fal_model(
        settings.fal_llm_endpoint,
        {
            "model": settings.fal_llm_model,
            "prompt": f"Study material:\n{snippet}\n\nCreate the lesson JSON.",
            "system_prompt": SCRIPT_SYSTEM,
            "max_tokens": 2048,
        },
        timeout=settings.fal_request_timeout,
    )
    raw = _extract_llm_text(result)
    parsed = _extract_json(raw)
    if parsed and parsed.get("narration"):
        return parsed
    return _mock_script(material_text)


def _mock_script(material_text: str) -> dict[str, Any]:
    topic = material_text[:80].strip() or "your topic"
    return {
        "title": f"Lesson: {topic[:50]}",
        "narration": (
            f"Welcome! Today we explore {topic}. "
            "We'll walk through the key ideas from your notes step by step, "
            "so you can remember the facts and explain them to a friend. "
            "Pay attention to the main themes and how they connect. "
            "By the end, you should be able to summarize what matters most."
        ),
        "visual_prompt": (
            "Friendly cartoon teacher in a bright classroom explaining a topic, "
            "educational poster boards, warm lighting, student-friendly"
        ),
        "outline": [
            {"title": "Introduction", "summary": f"Overview of {topic[:40]}"},
            {"title": "Key ideas", "summary": "Core concepts from the material"},
            {"title": "Recap", "summary": "Summary and review"},
        ],
    }


def _extract_json(text: str) -> dict[str, Any] | None:
    text = text.strip()
    try:
        data = json.loads(text)
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            data = json.loads(match.group(0))
            return data if isinstance(data, dict) else None
        except json.JSONDecodeError:
            return None
    return None


async def _synthesize_narration(
    narration: str,
    *,
    settings: Settings,
    voice_style: str,
) -> str | None:
    narration = narration.strip()
    if not narration:
        return None

    if settings.fal_mock_mode or not settings.fal_key:
        return MOCK_AUDIO_URL

    payload = _tts_payload(narration, voice_style, settings.fal_tts_model)
    tts_raw = await run_fal_model(
        settings.fal_tts_model,
        payload,
        timeout=settings.fal_request_timeout,
    )
    return parsers.parse_audio_url(tts_raw)


def _outline_to_scenes(script: dict[str, Any], lesson_video_url: str | None) -> list[dict[str, Any]]:
    """Text-only chapters for the UI; video plays once at the top."""
    outline = script.get("outline") or []
    scenes: list[dict[str, Any]] = []
    for item in outline:
        if not isinstance(item, dict):
            continue
        scenes.append(
            {
                "title": str(item.get("title", "Section")),
                "narration": str(item.get("summary", "")),
                "visual_prompt": "",
                "on_screen_text": "",
                "image_url": None,
                "audio_url": None,
                "video_url": None,
            }
        )
    if not scenes:
        scenes.append(
            {
                "title": str(script.get("title", "Lesson")),
                "narration": str(script.get("narration", ""))[:300],
                "visual_prompt": str(script.get("visual_prompt", "")),
                "on_screen_text": "",
                "image_url": None,
                "audio_url": None,
                "video_url": None,
            }
        )
    return scenes


async def run_lesson_video_job(
    job_id: str,
    *,
    material_text: str,
    character_bible: str,
    reference_image_url: str | None,
    voice_style: str = "friendly",
    settings: Settings,
) -> None:
    repo = LessonVideoJobRepository()

    def _phase(message: str, progress: int, **extra: Any) -> None:
        repo.update(
            job_id,
            {
                "status": "processing",
                "progress": progress,
                "phase": message,
                **extra,
            },
        )

    try:
        _phase("Writing your lesson script…", 5)

        script = await generate_lesson_script(material_text, settings)
        title = str(script.get("title", "Lesson"))
        narration = _cap_narration(
            str(script.get("narration", "")),
            settings.lesson_scene_target_seconds,
        )
        visual = str(script.get("visual_prompt", ""))

        _phase(f"Script ready: {title}", 12, title=title)

        char_lock = f"Character: {character_bible[:400]}. " if character_bible else ""
        ref_note = " Match the reference character design exactly." if reference_image_url else ""
        image_prompt = (
            f"{char_lock}{visual}{ref_note} "
            "Educational illustration, vibrant, student-friendly, no text in image. "
            "Single clear composition suitable for subtle animation."
        )
        motion_prompt = (
            f"Cinematic educational scene with visible motion: {visual[:200]}. "
            "Character moves naturally, subtle camera drift, hair and clothes react, "
            "ambient motion in background, soft lighting, no text on screen."
        )

        image_url: str | None = None
        audio_url: str | None = None
        lesson_video_url: str | None = None
        video_mode = "none"

        if settings.fal_mock_mode or not settings.fal_key:
            image_url = "https://placehold.co/1024x576/png?text=Lesson"
            audio_url = await _synthesize_narration(
                narration, settings=settings, voice_style=voice_style
            )
        else:
            extra: dict[str, Any] = {}
            if reference_image_url:
                extra["image_url"] = reference_image_url

            _phase("Creating artwork + recording voice…", 30)
            raw_img, audio_url = await asyncio.gather(
                text_to_image(
                    image_prompt,
                    model=settings.fal_character_model,
                    image_size="landscape_16_9",
                    num_images=1,
                    timeout=settings.fal_request_timeout,
                    **extra,
                ),
                _synthesize_narration(
                    narration, settings=settings, voice_style=voice_style
                ),
            )
            image_url = extract_image_url(raw_img)
            # #region agent log
            debug_log(
                "lesson_video.py:after_assets",
                "image and audio generated",
                {
                    "job_id": job_id,
                    "has_image": bool(image_url),
                    "has_audio": bool(audio_url),
                    "ffmpeg": ffmpeg_available(),
                    "clips_enabled": settings.lesson_enable_video_clips,
                },
                hypothesis_id="H1",
            )
            # #endregion

            if settings.lesson_enable_video_clips and image_url and audio_url:
                target = int(settings.lesson_scene_target_seconds)
                _phase(f"Animating scene with AI motion (~{target}s lesson)…", 55)
                try:
                    video_args: dict[str, Any] = {}
                    if "hailuo" in settings.fal_video_model:
                        video_args["duration"] = "10"
                    vid_raw = await asyncio.wait_for(
                        image_to_video(
                            image_url,
                            model=settings.fal_video_model,
                            prompt=motion_prompt,
                            timeout=settings.lesson_video_timeout,
                            **video_args,
                        ),
                        timeout=settings.lesson_video_timeout + 30,
                    )
                    silent_video = extract_video_url(vid_raw)
                    video_mode = "animated"

                    if ffmpeg_available():
                        _phase("Merging animated clip with character voice…", 85)
                        lesson_video_url = await build_lesson_video_with_voice(
                            job_id=job_id,
                            video_url=silent_video,
                            audio_url=audio_url,
                            settings=settings,
                        )
                    else:
                        lesson_video_url = silent_video
                except Exception as exc:
                    logger.warning("Lesson animation failed for job %s: %s", job_id, exc)
                    # #region agent log
                    debug_log(
                        "lesson_video.py:animation_failed",
                        str(exc)[:200],
                        {"job_id": job_id},
                        hypothesis_id="H1",
                    )
                    # #endregion
                    _phase("Animation unavailable — using still image fallback", 75)

            if not lesson_video_url and image_url and audio_url and ffmpeg_available():
                _phase("Building fallback video from still image…", 80)
                lesson_video_url = await build_lesson_video_from_image_and_audio(
                    job_id=job_id,
                    image_url=image_url,
                    audio_url=audio_url,
                    settings=settings,
                )
                video_mode = "still"

            if not lesson_video_url and audio_url and not ffmpeg_available():
                _phase(
                    "Install ffmpeg (pip install imageio-ffmpeg) and restart the backend",
                    85,
                )

        if not lesson_video_url and audio_url:
            lesson_video_url = audio_url

        # #region agent log
        from app.services.ai.pipelines.lesson_media import lesson_render_path

        render_file = lesson_render_path(settings, job_id)
        debug_log(
            "lesson_video.py:complete",
            "pipeline finished",
            {
                "job_id": job_id,
                "video_mode": video_mode,
                "playlist_is_api_file": bool(
                    lesson_video_url and "/lesson-video/" in str(lesson_video_url)
                ),
                "playlist_is_audio_only": bool(
                    lesson_video_url
                    and lesson_video_url == audio_url
                    and not str(lesson_video_url).endswith(".mp4")
                ),
                "render_mp4_exists": render_file.is_file(),
                "render_mp4_bytes": render_file.stat().st_size if render_file.is_file() else 0,
            },
            hypothesis_id="H2-H3",
        )
        # #endregion

        scenes_out = _outline_to_scenes(script, lesson_video_url)

        repo.update(
            job_id,
            {
                "status": "completed",
                "progress": 100,
                "title": title,
                "phase": "Done",
                "scenes_json": scenes_out,
                "playlist_url": lesson_video_url,
                "cover_image_url": image_url,
                "video_mode": video_mode,
            },
        )
    except Exception as exc:
        repo.update(
            job_id,
            {
                "status": "failed",
                "error_message": str(exc)[:500],
            },
        )
        raise AIOrchestratorError(f"Lesson video job failed: {exc}") from exc
