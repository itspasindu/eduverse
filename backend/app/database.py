"""Backward-compatible re-exports. Prefer `from app.db import Profile, Post, get_supabase`."""

from app.db import Post, Profile, get_supabase, post_from_row, profile_from_row

__all__ = [
    "get_supabase",
    "Profile",
    "Post",
    "profile_from_row",
    "post_from_row",
]
