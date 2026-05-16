"""Safe API error responses — log details server-side only."""

from __future__ import annotations

import logging

from fastapi import HTTPException, status

logger = logging.getLogger("eduverse.api")


def raise_ai_error(exc: Exception, *, operation: str) -> None:
    logger.exception("%s failed", operation, exc_info=exc)
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail={
            "code": "ai_unavailable",
            "message": f"{operation} is temporarily unavailable. Please try again.",
        },
    ) from exc


def raise_service_error(exc: Exception, *, operation: str) -> None:
    logger.exception("%s failed", operation, exc_info=exc)
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail={
            "code": "service_error",
            "message": f"{operation} failed. Please try again.",
        },
    ) from exc
