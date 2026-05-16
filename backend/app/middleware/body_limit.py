from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.config import get_settings


class BodyLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        settings = get_settings()
        limit = settings.max_request_body_bytes
        if limit > 0:
            content_length = request.headers.get("content-length")
            if content_length and int(content_length) > limit:
                return JSONResponse(
                    status_code=413,
                    content={
                        "detail": {
                            "code": "payload_too_large",
                            "message": "Request body too large.",
                        }
                    },
                )
        return await call_next(request)
