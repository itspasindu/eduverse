"""Generate per-slide visuals for presentation decks."""

from __future__ import annotations

import asyncio
import hashlib
from typing import Any

from app.config import Settings, get_settings
from app.services.ai.helpers.fal import extract_image_url, text_to_image

MAX_SLIDES_WITH_IMAGES = 10

_VISUAL_STYLES: dict[str, str] = {
    "academic-classic": "refined academic illustration, muted tones, textbook quality",
    "modern-sans": "minimal corporate stock photo style, clean and professional",
    "bold-keynote": "high-impact keynote visual, bold colors, dramatic lighting",
    "playful-edu": "friendly colorful educational illustration, approachable",
    "tech-mono": "technical diagram aesthetic, cool blues, precise clean look",
    "elegant-display": "editorial magazine photography style, sophisticated",
}


def placeholder_slide_image(slide_key: str) -> str:
    """Deterministic stock-style placeholder when AI images are unavailable."""
    seed = hashlib.md5(slide_key.encode(), usedforsecurity=False).hexdigest()[:12]
    return f"https://picsum.photos/seed/eduverse-{seed}/960/540"


def build_slide_image_prompt(
    slide: dict[str, Any],
    *,
    deck_title: str,
    font_style: str,
) -> str:
    custom = (slide.get("image_prompt") or "").strip()
    if custom:
        base = custom
    else:
        bullets = slide.get("bullets") or []
        hint = "; ".join(str(b) for b in bullets[:2])
        base = f"{slide.get('title', 'topic')}. {hint}"

    visual = _VISUAL_STYLES.get(font_style, _VISUAL_STYLES["modern-sans"])
    return (
        f"Educational presentation slide visual for «{deck_title}»: {base}. "
        f"{visual}. "
        "Single clear subject, 16:9 composition, suitable for a slide deck. "
        "CRITICAL: no text, no words, no letters, no numbers, no captions, "
        "no labels, no watermarks, no logos anywhere in the image."
    )


async def _generate_slide_image(
    prompt: str,
    settings: Settings,
    *,
    slide_key: str,
) -> str:
    if settings.fal_mock_mode or not settings.fal_key:
        return placeholder_slide_image(slide_key)

    try:
        raw = await text_to_image(
            prompt,
            model=settings.fal_image_model,
            image_size="landscape_16_9",
            num_images=1,
            timeout=settings.fal_request_timeout,
        )
        return extract_image_url(raw)
    except Exception:
        return placeholder_slide_image(slide_key)


async def attach_slide_images(
    slides: list[dict[str, Any]],
    *,
    deck_title: str,
    font_style: str,
    include_images: bool = True,
    settings: Settings | None = None,
) -> list[dict[str, Any]]:
    if not include_images or not slides:
        return slides

    settings = settings or get_settings()
    target = slides[:MAX_SLIDES_WITH_IMAGES]
    rest = slides[MAX_SLIDES_WITH_IMAGES:]

    sem = asyncio.Semaphore(3)

    async def _one(index: int, slide: dict[str, Any]) -> tuple[int, str | None]:
        key = f"{deck_title}-{index}-{slide.get('title', '')}"
        prompt = build_slide_image_prompt(
            slide, deck_title=deck_title, font_style=font_style
        )
        async with sem:
            url = await _generate_slide_image(
                prompt, settings, slide_key=key
            )
        return index, url

    results = await asyncio.gather(
        *[_one(i, s) for i, s in enumerate(target)],
        return_exceptions=True,
    )

    enriched = [dict(s) for s in slides]
    for item in results:
        if isinstance(item, Exception):
            continue
        index, url = item
        if url:
            enriched[index]["image_url"] = url

    for i, slide in enumerate(rest):
        idx = MAX_SLIDES_WITH_IMAGES + i
        enriched[idx]["image_url"] = placeholder_slide_image(
            f"{deck_title}-{idx}-{slide.get('title', '')}"
        )

    return enriched
