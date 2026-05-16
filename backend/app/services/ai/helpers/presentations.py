"""Generate structured presentation slides from study notes."""

from __future__ import annotations

import json
import re
from typing import Any

from app.config import Settings, get_settings
from app.services.ai.helpers.llm import ask_llm

VALID_FONT_STYLES = frozenset(
    {
        "academic-classic",
        "modern-sans",
        "bold-keynote",
        "playful-edu",
        "tech-mono",
        "elegant-display",
    }
)

PRESENTATION_SYSTEM = """You are an expert presentation designer for educational content.
Turn the user's notes into a clear slide deck.

Return ONLY valid JSON with this exact shape:
{
  "title": "Presentation title",
  "slides": [
    {
      "title": "Slide heading",
      "bullets": ["point one", "point two", "point three"],
      "speaker_notes": "What the presenter should say (1-2 sentences)"
    }
  ]
}

Rules:
- 5 to 12 slides depending on note length
- First slide: title + short subtitle as single bullet
- Last slide: summary or key takeaways
- Short slide titles (max 8 words)
- 2-4 bullets per slide; each bullet max 15 words
- Proper English, student-friendly
- Match the requested tone/style in wording (formal vs playful)
- No markdown, no code fences, only JSON"""


def _normalize_font_style(font_style: str) -> str:
    style = (font_style or "modern-sans").strip().lower()
    return style if style in VALID_FONT_STYLES else "modern-sans"


def _split_notes_to_slides(notes: str, title: str) -> list[dict[str, Any]]:
    """Free fallback: chunk notes into slides without LLM."""
    chunks: list[str] = []
    for block in re.split(r"\n\s*\n", notes.strip()):
        block = block.strip()
        if not block:
            continue
        for line in block.split("\n"):
            line = line.strip().lstrip("-•*0123456789.) ")
            if line:
                chunks.append(line)

    if not chunks:
        chunks = ["Add your study notes to generate slides."]

    slides: list[dict[str, Any]] = [
        {
            "title": title[:80],
            "bullets": [chunks[0][:120]] if chunks else ["Your topic"],
            "speaker_notes": "Introduce the topic and what the audience will learn.",
        }
    ]

    batch: list[str] = []
    for line in chunks[1:]:
        batch.append(line[:140])
        if len(batch) >= 3:
            slides.append(
                {
                    "title": batch[0][:60],
                    "bullets": batch[:4],
                    "speaker_notes": f"Expand on: {', '.join(batch[:2])}.",
                }
            )
            batch = []
    if batch:
        slides.append(
            {
                "title": batch[0][:60],
                "bullets": batch[:4],
                "speaker_notes": "Walk through each bullet with a quick example.",
            }
        )

    slides.append(
        {
            "title": "Key takeaways",
            "bullets": chunks[-3:] if len(chunks) >= 3 else chunks,
            "speaker_notes": "Summarize and invite questions.",
        }
    )
    return slides[:12]


def _parse_presentation_json(raw: str) -> dict[str, Any] | None:
    text = raw.strip()
    start = text.find("{")
    end = text.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        data = json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return None

    if not isinstance(data.get("slides"), list):
        return None

    slides: list[dict[str, Any]] = []
    for item in data["slides"]:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "Slide").strip()
        bullets_raw = item.get("bullets") or []
        if isinstance(bullets_raw, str):
            bullets = [bullets_raw]
        else:
            bullets = [str(b).strip() for b in bullets_raw if str(b).strip()]
        if not bullets:
            bullets = ["—"]
        slides.append(
            {
                "title": title[:120],
                "bullets": bullets[:5],
                "speaker_notes": str(item.get("speaker_notes") or "").strip()[:500],
            }
        )

    if not slides:
        return None

    return {
        "title": str(data.get("title") or "Presentation").strip()[:120],
        "slides": slides[:15],
    }


def _style_hint(font_style: str) -> str:
    hints = {
        "academic-classic": "formal academic tone, precise vocabulary",
        "modern-sans": "clean professional corporate tone",
        "bold-keynote": "punchy keynote style, strong hooks",
        "playful-edu": "friendly classroom tone, light humor ok",
        "tech-mono": "technical documentation tone, precise terms",
        "elegant-display": "refined editorial tone, polished phrasing",
    }
    return hints.get(font_style, hints["modern-sans"])


async def generate_presentation_slides(
    notes: str,
    *,
    title: str | None = None,
    font_style: str = "modern-sans",
    settings: Settings | None = None,
) -> dict[str, Any]:
    settings = settings or get_settings()
    notes = notes.strip()
    font_style = _normalize_font_style(font_style)
    deck_title = (title or "").strip() or _infer_title(notes)

    if settings.fal_mock_mode or not settings.fal_key:
        return {
            "title": deck_title,
            "font_style": font_style,
            "slides": _split_notes_to_slides(notes, deck_title),
            "source": "template",
        }

    prompt = (
        f"Presentation title: {deck_title}\n"
        f"Visual / tone style: {font_style} — {_style_hint(font_style)}\n\n"
        f"Notes:\n{notes[:6000]}"
    )

    try:
        raw = await ask_llm(
            prompt,
            None,
            model=settings.fal_llm_model,
            endpoint=settings.fal_llm_endpoint,
            max_tokens=2048,
            timeout=settings.fal_request_timeout,
            system_prompt=PRESENTATION_SYSTEM,
        )
        parsed = _parse_presentation_json(raw)
        if parsed:
            return {
                "title": parsed["title"],
                "font_style": font_style,
                "slides": parsed["slides"],
                "source": "llm",
            }
    except Exception:
        pass

    return {
        "title": deck_title,
        "font_style": font_style,
        "slides": _split_notes_to_slides(notes, deck_title),
        "source": "template",
    }


def _infer_title(notes: str) -> str:
    first = notes.split("\n", 1)[0].strip().lstrip("# ")
    if len(first) > 10:
        return first[:80]
    return "Study presentation"
