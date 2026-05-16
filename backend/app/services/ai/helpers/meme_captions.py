"""Meme top/bottom captions — LLM when available, free templates otherwise."""

from __future__ import annotations

import json
import random
import re
from typing import Any

from app.config import Settings, get_settings
from app.services.ai.helpers.llm import ask_llm

MEME_CAPTION_SYSTEM = """You write classic internet meme captions in English.
Return ONLY valid JSON with this exact shape:
{"top_text": "SHORT TOP LINE", "bottom_text": "SHORT BOTTOM LINE"}

Rules:
- ALL CAPS
- Max 6 words per line
- Funny, relatable to the topic
- Proper English spelling and grammar
- No quotes inside the text
- No explanation outside the JSON"""


def _normalize_caption(line: str, max_words: int = 8) -> str:
    cleaned = re.sub(r"\s+", " ", line.strip().upper())
    cleaned = re.sub(r"[^A-Z0-9\s'!?.,-]", "", cleaned)
    words = cleaned.split()[:max_words]
    return " ".join(words) if words else "MEME TIME"


def free_meme_captions(topic: str) -> dict[str, str]:
    """Rule-based captions — no API cost."""
    t = topic.lower()

    if "html" in t and ("debug" in t or "fix" in t or "error" in t):
        return {
            "top_text": "WHEN YOU FORGET TO CLOSE A DIV",
            "bottom_text": "AND THE WHOLE PAGE BREAKS",
        }
    if "html" in t or "css" in t:
        return {
            "top_text": "ME TRYING TO CENTER A DIV",
            "bottom_text": "WITH PURE HTML AND CSS",
        }
    if "python" in t:
        return {
            "top_text": "IT WORKS ON MY MACHINE",
            "bottom_text": "MUST BE A YOU PROBLEM",
        }
    if "javascript" in t or "js" in t:
        return {
            "top_text": "undefined IS NOT A FUNCTION",
            "bottom_text": "I AM NOT A FUNCTION",
        }
    if "exam" in t or "test" in t or "study" in t:
        return {
            "top_text": "STUDYING FOR 5 MINUTES",
            "bottom_text": "CONFIDENCE LEVEL: 100 PERCENT",
        }
    if "bug" in t or "debug" in t:
        return {
            "top_text": "FOUND THE BUG IN PRODUCTION",
            "bottom_text": "IT WAS A TYPO ALL ALONG",
        }

    short = _normalize_caption(topic, max_words=5)
    return {
        "top_text": f"WHEN YOU LEARN ABOUT {short}",
        "bottom_text": "AND IT FINALLY CLICKS",
    }


def _parse_caption_json(raw: str) -> dict[str, str] | None:
    text = raw.strip()
    match = re.search(r"\{[^{}]*\}", text, re.DOTALL)
    if not match:
        return None
    try:
        data = json.loads(match.group())
    except json.JSONDecodeError:
        return None

    top = data.get("top_text") or data.get("top")
    bottom = data.get("bottom_text") or data.get("bottom")
    if not top or not bottom:
        return None

    return {
        "top_text": _normalize_caption(str(top)),
        "bottom_text": _normalize_caption(str(bottom)),
    }


async def generate_meme_captions(
    topic: str,
    settings: Settings | None = None,
) -> dict[str, str]:
    settings = settings or get_settings()
    topic = topic.strip()

    if settings.fal_mock_mode or not settings.fal_key:
        return free_meme_captions(topic)

    try:
        raw = await ask_llm(
            f"Topic for the meme: {topic}",
            None,
            model=settings.fal_llm_model,
            endpoint=settings.fal_llm_endpoint,
            max_tokens=120,
            timeout=settings.fal_request_timeout,
            system_prompt=MEME_CAPTION_SYSTEM,
        )
        parsed = _parse_caption_json(raw)
        if parsed:
            return parsed
    except Exception:
        pass

    return free_meme_captions(topic)


FEED_CAPTION_TEMPLATES = [
    "This one broke my brain today 🤯",
    "Tag someone who needs to see this",
    "Study mood in one picture",
    "When the lecture finally makes sense",
    "Me explaining this to my group chat",
    "Certified EduVerse moment",
    "No thoughts just vibes (and bugs)",
    "POV: you opened the assignment at midnight",
    "Sending this to the study group",
    "Why is this so accurate though",
    "Another day in the learning trenches",
    "I felt this in my soul",
    "The algorithm knew I needed this",
    "Saving this for exam season",
    "Can't stop thinking about this topic",
]


def _overlay_signature(top: str, bottom: str) -> str:
    return f"{top.strip().upper()}|{bottom.strip().upper()}"


def generate_feed_caption(topic: str, top_text: str, bottom_text: str) -> str:
    """Social feed caption — always different from meme overlay lines."""
    topic = topic.strip() or "this topic"
    overlay_sig = _overlay_signature(top_text, bottom_text)
    overlay_joined = " / ".join(
        x for x in (top_text.strip(), bottom_text.strip()) if x
    ).upper()

    candidates = list(FEED_CAPTION_TEMPLATES)
    random.shuffle(candidates)

    for pick in candidates:
        if _overlay_signature(pick, "") != overlay_sig and pick.upper() != overlay_joined:
            return pick[:200]

    return f"Learning about {topic[:50]} — what do you think?"[:200]


def build_meme_post_caption(feed_caption: str, top_text: str, bottom_text: str) -> str:
    """JSON stored in posts.caption: overlay text + separate feed caption."""
    return json.dumps(
        {
            "kind": "meme",
            "feed": feed_caption,
            "top": top_text,
            "bottom": bottom_text,
        },
        ensure_ascii=False,
    )
