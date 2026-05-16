import re

from app.core.moderation.words import BAD_WORDS

_LEET = str.maketrans(
    {
        "@": "a",
        "0": "o",
        "1": "i",
        "3": "e",
        "4": "a",
        "5": "s",
        "$": "s",
        "!": "",
        "*": "",
    }
)

_WORD_RE = re.compile(r"[a-z0-9]+")


def normalize_for_moderation(text: str) -> str:
    lowered = text.lower().translate(_LEET)
    cleaned = re.sub(r"[^a-z0-9\s]", " ", lowered)
    return re.sub(r"\s+", " ", cleaned).strip()


def contains_profanity(text: str) -> bool:
    if not text or not text.strip():
        return False

    normalized = normalize_for_moderation(text)
    if not normalized:
        return False

    tokens = _WORD_RE.findall(normalized)
    token_set = set(tokens)
    compact = "".join(tokens)

    for word in BAD_WORDS:
        if word in token_set:
            return True
        if len(word) >= 4 and re.search(
            rf"(?<![a-z]){re.escape(word)}(?![a-z])", compact
        ):
            return True

    return False
