"""Blocked terms for prompts and comments (whole-word match after normalization)."""

# Keep lowercase; extend as needed for your community standards.
BAD_WORDS: frozenset[str] = frozenset(
    {
        "asshole",
        "bastard",
        "bitch",
        "bullshit",
        "cock",
        "crap",
        "cunt",
        "damn",
        "dick",
        "fag",
        "faggot",
        "fuck",
        "fucker",
        "fucking",
        "goddamn",
        "hell",
        "homo",
        "jerkoff",
        "motherfucker",
        "nigga",
        "nigger",
        "piss",
        "pussy",
        "retard",
        "shit",
        "slut",
        "twat",
        "wanker",
        "whore",
    }
)

STRIKES_BEFORE_SUSPEND = 3
