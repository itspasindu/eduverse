"""In-memory sliding-window rate limiter (per-process)."""

from __future__ import annotations

import threading
import time
from collections import defaultdict
from dataclasses import dataclass, field

from fastapi import HTTPException, Request, status


@dataclass
class _Bucket:
    hits: list[float] = field(default_factory=list)


_lock = threading.Lock()
_buckets: dict[str, _Bucket] = defaultdict(_Bucket)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def _prune(bucket: _Bucket, window_seconds: float, now: float) -> None:
    cutoff = now - window_seconds
    bucket.hits = [t for t in bucket.hits if t > cutoff]


def check_rate_limit(key: str, *, limit: int, window_seconds: float) -> None:
    if limit <= 0:
        return
    now = time.monotonic()
    with _lock:
        bucket = _buckets[key]
        _prune(bucket, window_seconds, now)
        if len(bucket.hits) >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "code": "rate_limited",
                    "message": "Too many requests. Please try again later.",
                },
            )
        bucket.hits.append(now)


def rate_limit_ip(request: Request, *, limit: int, window_seconds: float) -> None:
    check_rate_limit(f"ip:{_client_ip(request)}", limit=limit, window_seconds=window_seconds)


def rate_limit_user(
    request: Request, *, limit: int, window_seconds: float, prefix: str = "user"
) -> None:
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        rate_limit_ip(request, limit=limit, window_seconds=window_seconds)
        return
    check_rate_limit(f"{prefix}:{user_id}", limit=limit, window_seconds=window_seconds)
